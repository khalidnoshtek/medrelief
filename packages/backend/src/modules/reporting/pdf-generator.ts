import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface ReportPdfData {
  reportId: string;
  reportNumber: string;
  accessionNumber: string;
  generatedAt: Date;
  patient: {
    fullName: string;
    age: number | null;
    gender: string;
    mobile: string;
    email: string | null;
  };
  doctor: { name: string; specialty: string | null } | null;
  branch: { name: string; address: string | null; gstin: string | null };
  testResults: Array<{
    testName: string;
    testCode: string;
    department: string;
    rawValue: string;
    unit: string | null;
    referenceRange: string | null;
    flag: string | null;
  }>;
  signedOffBy: string;
  signedOffAt: Date;
}

const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'reports');

export async function generateReportPdf(data: ReportPdfData): Promise<string> {
  // Ensure storage directory exists
  fs.mkdirSync(STORAGE_DIR, { recursive: true });

  const filePath = path.join(STORAGE_DIR, `${data.reportId}.pdf`);
  const relativePath = `storage/reports/${data.reportId}.pdf`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // ── Header / Lab Letterhead ──
    doc.fontSize(18).font('Helvetica-Bold').text(data.branch.name, { align: 'center' });
    if (data.branch.address) {
      doc.fontSize(9).font('Helvetica').text(data.branch.address, { align: 'center' });
    }
    if (data.branch.gstin) {
      doc.fontSize(8).text(`GSTIN: ${data.branch.gstin}`, { align: 'center' });
    }
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.5);

    // ── Report Info ──
    doc.fontSize(12).font('Helvetica-Bold').text('LABORATORY TEST REPORT', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica');
    const infoY = doc.y;
    doc.text(`Report No: ${data.reportNumber}`, 50, infoY);
    doc.text(`Accession No: ${data.accessionNumber}`, 300, infoY);
    doc.text(`Date: ${data.generatedAt.toLocaleDateString('en-IN')}`, 50, infoY + 14);
    doc.moveDown(1.5);

    // ── Patient Info ──
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.3);
    const patY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').text('Patient:', 50, patY);
    doc.font('Helvetica').text(data.patient.fullName, 110, patY);
    doc.font('Helvetica-Bold').text('Age/Gender:', 300, patY);
    doc.font('Helvetica').text(`${data.patient.age || '-'} / ${data.patient.gender}`, 380, patY);

    const patY2 = patY + 14;
    doc.font('Helvetica-Bold').text('Mobile:', 50, patY2);
    doc.font('Helvetica').text(data.patient.mobile, 110, patY2);
    if (data.doctor) {
      doc.font('Helvetica-Bold').text('Ref. Doctor:', 300, patY2);
      doc.font('Helvetica').text(data.doctor.name, 380, patY2);
    }
    doc.moveDown(2);

    // ── Results Table ──
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.3);

    // Table header
    const tableTop = doc.y;
    const col = { test: 50, value: 220, unit: 310, range: 380, flag: 480 };

    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Test', col.test, tableTop);
    doc.text('Result', col.value, tableTop);
    doc.text('Unit', col.unit, tableTop);
    doc.text('Ref. Range', col.range, tableTop);
    doc.text('Flag', col.flag, tableTop);

    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(0.3);

    // Table rows
    doc.font('Helvetica').fontSize(9);
    for (const result of data.testResults) {
      const rowY = doc.y;

      doc.text(result.testName, col.test, rowY, { width: 165 });
      doc.text(result.rawValue, col.value, rowY, { width: 85 });
      doc.text(result.unit || '-', col.unit, rowY, { width: 65 });
      doc.text(result.referenceRange || '-', col.range, rowY, { width: 95 });

      // Flag with emphasis
      if (result.flag && result.flag !== 'NORMAL') {
        doc.font('Helvetica-Bold');
        doc.text(result.flag, col.flag, rowY);
        doc.font('Helvetica');
      } else {
        doc.text(result.flag || '-', col.flag, rowY);
      }

      doc.moveDown(0.5);
    }

    // ── Footer / Sign-off ──
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc');
    doc.moveDown(1);

    doc.fontSize(9).font('Helvetica');
    doc.text(`Signed off by: ${data.signedOffBy}`, 50);
    doc.text(`Sign-off date: ${data.signedOffAt.toLocaleString('en-IN')}`, 50);
    doc.moveDown(1);
    doc.fontSize(7).fillColor('#999999');
    doc.text('This is a computer-generated report. The results should be interpreted in clinical context.', 50, doc.y, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(relativePath));
    stream.on('error', reject);
  });
}
