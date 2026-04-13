import { prisma } from '../../../config/database';
import { generateId } from '../../../shared/utils/id-generator';
import { generateSequenceNumber } from '../../../shared/utils/number-sequence';
import { emitDomainEvent } from '../../../shared/events/event-emitter';
import { NotFoundError } from '../../../shared/errors/app-error';
import { RequestContext } from '../../../shared/types/request-context';

export const accessionService = {
  /**
   * Creates accession from a confirmed bill. Triggered by BillConfirmed event.
   * Groups tests by sample_type into samples, creates test orders.
   */
  async createAccessionFromBill(billId: string, userId: string) {
    const bill = await prisma.billing_bills.findFirst({
      where: { id: billId },
      include: {
        items: { include: { test: true } },
        visit: true,
      },
    });

    if (!bill) throw new NotFoundError('Bill', billId);

    const tenantId = bill.tenant_id;
    const branchId = bill.branch_id;

    const branch = await prisma.mdm_branches.findFirst({
      where: { id: branchId, tenant_id: tenantId },
    });
    const branchCode = branch?.code || 'UNK';

    const accessionNumber = await generateSequenceNumber(
      tenantId, branchId, 'ACC', branchCode
    );

    const accessionId = generateId();

    // Group tests by sample type
    const sampleGroups = new Map<string, typeof bill.items>();
    for (const item of bill.items) {
      const sampleType = item.test.sample_type;
      const group = sampleGroups.get(sampleType) || [];
      group.push(item);
      sampleGroups.set(sampleType, group);
    }

    await prisma.$transaction(async (tx) => {
      // Create accession
      await tx.lims_accessions.create({
        data: {
          id: accessionId,
          tenant_id: tenantId,
          branch_id: branchId,
          accession_number: accessionNumber,
          visit_id: bill.visit_id,
          bill_id: bill.id,
          accession_status: 'PENDING',
          created_by: userId,
          updated_by: userId,
        },
      });

      // Create samples and test orders
      let sampleIdx = 0;
      for (const [sampleType, items] of sampleGroups) {
        sampleIdx++;
        const sampleId = generateId();
        const sampleCode = `${accessionNumber}-S${sampleIdx}`;

        await tx.lims_samples.create({
          data: {
            id: sampleId,
            tenant_id: tenantId,
            accession_id: accessionId,
            sample_code: sampleCode,
            sample_type: sampleType,
            sample_status: 'PENDING_COLLECTION',
            created_by: userId,
            updated_by: userId,
          },
        });

        // Create test order for each bill item in this sample group
        for (const item of items) {
          await tx.lims_test_orders.create({
            data: {
              id: generateId(),
              tenant_id: tenantId,
              accession_id: accessionId,
              bill_item_id: item.id,
              test_id: item.test_id,
              department: item.test.department,
              sample_id: sampleId,
              order_status: 'ORDERED',
              created_by: userId,
              updated_by: userId,
            },
          });
        }
      }
    }, { timeout: 15000 });

    // Emit SampleAccessioned event
    await emitDomainEvent({
      tenantId,
      eventType: 'SampleAccessioned',
      aggregateType: 'Accession',
      aggregateId: accessionId,
      payload: { accessionId, billId, accessionNumber },
    });

    return { accessionId, accessionNumber };
  },

  async getAccession(ctx: RequestContext, accessionId: string) {
    const accession = await prisma.lims_accessions.findFirst({
      where: { id: accessionId, tenant_id: ctx.tenantId },
      include: {
        samples: true,
        test_orders: {
          include: { test: true, result: true },
        },
        visit: { include: { patient: true } },
        bill: true,
      },
    });
    if (!accession) throw new NotFoundError('Accession', accessionId);
    return accession;
  },

  async getAccessionByBillId(ctx: RequestContext, billId: string) {
    const accession = await prisma.lims_accessions.findFirst({
      where: { bill_id: billId, tenant_id: ctx.tenantId },
      include: {
        samples: true,
        test_orders: {
          include: { test: true, result: true },
        },
      },
    });
    return accession;
  },
};
