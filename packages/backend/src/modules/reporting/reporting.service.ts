import { prisma } from '../../config/database';
import { generateId } from '../../shared/utils/id-generator';
import { generateSequenceNumber } from '../../shared/utils/number-sequence';
import { generateReportPdf, ReportPdfData } from './pdf-generator';
import { dispatchEmail } from './email-dispatcher';
import { dispatchWhatsApp } from './whatsapp-dispatcher';

export const reportingService = {
  async tryGenerateReport(accessionId: string, userId: string) {
    const accession = await prisma.lims_accessions.findFirst({
      where: { id: accessionId },
      include: {
        test_orders: {
          include: {
            test: true,
            result: true,
          },
        },
        visit: {
          include: {
            patient: true,
            referrer: true,
          },
        },
        branch: true,
      },
    });

    if (!accession) return null;

    // Check if all orders are approved
    const allApproved = accession.test_orders.every(
      (o) => o.order_status === 'APPROVED'
    );
    if (!allApproved) return null;

    // Check if report already exists
    const existingReport = await prisma.lims_reports.findFirst({
      where: { accession_id: accessionId },
    });
    if (existingReport) return existingReport;

    const branch = accession.branch;
    const reportNumber = await generateSequenceNumber(
      accession.tenant_id, accession.branch_id, 'RPT', branch?.code || 'UNK'
    );

    const reportId = generateId();
    const patient = accession.visit.patient;

    // Get pathologist name
    const signingUser = await prisma.auth_users.findFirst({
      where: { id: userId },
    });

    // Create report + delivery logs in transaction (15s timeout for Neon latency)
    const report = await prisma.$transaction(async (tx) => {
      const report = await tx.lims_reports.create({
        data: {
          id: reportId,
          tenant_id: accession.tenant_id,
          accession_id: accessionId,
          report_number: reportNumber,
          signed_off_by: userId,
          signed_off_at: new Date(),
          report_status: 'GENERATED',
          created_by: userId,
          updated_by: userId,
        },
      });

      if (patient.mobile) {
        await tx.lims_report_delivery_logs.create({
          data: {
            id: generateId(),
            tenant_id: accession.tenant_id,
            report_id: reportId,
            channel: 'WHATSAPP',
            target: patient.mobile,
            status: 'PENDING',
            created_by: userId,
            updated_by: userId,
          },
        });
      }

      if (patient.email) {
        await tx.lims_report_delivery_logs.create({
          data: {
            id: generateId(),
            tenant_id: accession.tenant_id,
            report_id: reportId,
            channel: 'EMAIL',
            target: patient.email,
            status: 'PENDING',
            created_by: userId,
            updated_by: userId,
          },
        });
      }

      await tx.lims_accessions.update({
        where: { id: accessionId },
        data: {
          accession_status: 'COMPLETED',
          version: { increment: 1 },
          updated_by: userId,
        },
      });

      return report;
    }, { timeout: 15000 });

    // Generate PDF (outside transaction — file I/O)
    try {
      const pdfData: ReportPdfData = {
        reportId,
        reportNumber,
        accessionNumber: accession.accession_number,
        generatedAt: new Date(),
        patient: {
          fullName: patient.full_name,
          age: patient.age_years,
          gender: patient.gender,
          mobile: patient.mobile,
          email: patient.email,
        },
        doctor: accession.visit.referrer
          ? { name: accession.visit.referrer.name, specialty: accession.visit.referrer.specialty }
          : null,
        branch: {
          name: branch.name,
          address: branch.address,
          gstin: branch.gstin,
        },
        testResults: accession.test_orders
          .filter((o) => o.result)
          .map((o) => ({
            testName: o.test.name,
            testCode: o.test.test_code,
            department: o.department,
            rawValue: o.result!.raw_value,
            unit: o.result!.unit,
            referenceRange: o.result!.reference_range,
            flag: o.result!.flag,
          })),
        signedOffBy: signingUser?.full_name || 'Unknown',
        signedOffAt: new Date(),
      };

      const pdfPath = await generateReportPdf(pdfData);
      console.log(`[Report] PDF generated: ${pdfPath}`);

      // Save PDF path
      await prisma.lims_reports.update({
        where: { id: reportId },
        data: { pdf_path: pdfPath, updated_by: userId },
      });

      // Dispatch to all pending delivery logs
      await this.dispatchPendingDeliveries(reportId, pdfPath, patient, reportNumber, userId);
    } catch (err) {
      console.error(`[Report] PDF generation failed for ${reportNumber}:`, err);
      // Don't throw — report DB record is still valid, PDF can be regenerated later
    }

    console.log(`Report ${reportNumber} generated for accession ${accession.accession_number}`);
    return report;
  },

  async dispatchPendingDeliveries(
    reportId: string,
    pdfPath: string,
    patient: { full_name: string; mobile: string; email: string | null },
    reportNumber: string,
    userId: string
  ) {
    const logs = await prisma.lims_report_delivery_logs.findMany({
      where: { report_id: reportId, status: 'PENDING' },
    });

    for (const log of logs) {
      try {
        if (log.channel === 'EMAIL') {
          const result = await dispatchEmail({
            to: log.target,
            patientName: patient.full_name,
            reportNumber,
            pdfPath,
          });
          await prisma.lims_report_delivery_logs.update({
            where: { id: log.id },
            data: {
              status: result.success ? 'SENT' : 'FAILED',
              sent_at: result.success ? new Date() : undefined,
              failure_reason: result.error || undefined,
              updated_by: userId,
            },
          });
        } else if (log.channel === 'WHATSAPP') {
          const result = await dispatchWhatsApp({
            to: log.target,
            patientName: patient.full_name,
            reportNumber,
            pdfPath,
          });
          await prisma.lims_report_delivery_logs.update({
            where: { id: log.id },
            data: {
              status: result.success ? 'SENT' : 'FAILED',
              sent_at: result.success ? new Date() : undefined,
              failure_reason: result.success ? result.note : 'Dispatch failed',
              updated_by: userId,
            },
          });
        }
      } catch (err: any) {
        console.error(`[Report] Delivery failed for ${log.channel} -> ${log.target}:`, err.message);
        await prisma.lims_report_delivery_logs.update({
          where: { id: log.id },
          data: {
            status: 'FAILED',
            failure_reason: err.message,
            updated_by: userId,
          },
        });
      }
    }
  },

  async getReportsByAccession(tenantId: string, accessionId: string) {
    return prisma.lims_reports.findMany({
      where: { tenant_id: tenantId, accession_id: accessionId },
      include: { delivery_logs: true },
    });
  },

  async resendReport(tenantId: string, reportId: string, channel: string, userId: string) {
    const report = await prisma.lims_reports.findFirst({
      where: { id: reportId, tenant_id: tenantId },
      include: {
        accession: { include: { visit: { include: { patient: true } } } },
      },
    });
    if (!report) return null;

    const patient = report.accession.visit.patient;
    const target = channel === 'WHATSAPP' ? patient.mobile : patient.email;
    if (!target) return null;

    const logId = generateId();
    const log = await prisma.lims_report_delivery_logs.create({
      data: {
        id: logId,
        tenant_id: tenantId,
        report_id: reportId,
        channel,
        target,
        status: 'PENDING',
        created_by: userId,
        updated_by: userId,
      },
    });

    // Immediately dispatch if PDF exists
    if (report.pdf_path) {
      try {
        if (channel === 'EMAIL') {
          const result = await dispatchEmail({
            to: target,
            patientName: patient.full_name,
            reportNumber: report.report_number,
            pdfPath: report.pdf_path,
          });
          await prisma.lims_report_delivery_logs.update({
            where: { id: logId },
            data: {
              status: result.success ? 'SENT' : 'FAILED',
              sent_at: result.success ? new Date() : undefined,
              failure_reason: result.error || undefined,
              updated_by: userId,
            },
          });
        } else if (channel === 'WHATSAPP') {
          const result = await dispatchWhatsApp({
            to: target,
            patientName: patient.full_name,
            reportNumber: report.report_number,
            pdfPath: report.pdf_path,
          });
          await prisma.lims_report_delivery_logs.update({
            where: { id: logId },
            data: {
              status: result.success ? 'SENT' : 'FAILED',
              sent_at: result.success ? new Date() : undefined,
              failure_reason: result.success ? result.note : 'Dispatch failed',
              updated_by: userId,
            },
          });
        }
      } catch (err: any) {
        await prisma.lims_report_delivery_logs.update({
          where: { id: logId },
          data: { status: 'FAILED', failure_reason: err.message, updated_by: userId },
        });
      }
    }

    return prisma.lims_report_delivery_logs.findFirst({ where: { id: logId } });
  },
};
