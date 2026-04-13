import { prisma } from '../../../config/database';
import { generateId } from '../../../shared/utils/id-generator';
import { emitDomainEvent } from '../../../shared/events/event-emitter';
import { AppError, NotFoundError } from '../../../shared/errors/app-error';
import { RequestContext } from '../../../shared/types/request-context';

export const resultService = {
  async enterResult(ctx: RequestContext, testOrderId: string, dto: {
    raw_value: string;
    unit?: string;
    reference_range?: string;
    flag?: string;
    comments?: string;
  }) {
    const order = await prisma.lims_test_orders.findFirst({
      where: { id: testOrderId, tenant_id: ctx.tenantId },
      include: { test: true },
    });
    if (!order) throw new NotFoundError('TestOrder', testOrderId);

    if (order.order_status === 'APPROVED') {
      throw new AppError('LIMS_ORDER_ALREADY_APPROVED', 'Cannot modify approved result', 400);
    }

    // Auto-derive flag if not provided
    const flag = dto.flag || deriveFlag(dto.raw_value, dto.reference_range || order.test.reference_range);

    // Upsert result (allow re-entry before sign-off)
    const existing = await prisma.lims_results.findUnique({
      where: { test_order_id: testOrderId },
    });

    let result;
    if (existing) {
      result = await prisma.lims_results.update({
        where: { test_order_id: testOrderId },
        data: {
          raw_value: dto.raw_value,
          unit: dto.unit || order.test.unit,
          reference_range: dto.reference_range || order.test.reference_range,
          flag,
          comments: dto.comments,
          version: { increment: 1 },
          updated_by: ctx.userId,
        },
      });
    } else {
      result = await prisma.lims_results.create({
        data: {
          id: generateId(),
          tenant_id: ctx.tenantId,
          test_order_id: testOrderId,
          raw_value: dto.raw_value,
          unit: dto.unit || order.test.unit,
          reference_range: dto.reference_range || order.test.reference_range,
          flag,
          comments: dto.comments,
          created_by: ctx.userId,
          updated_by: ctx.userId,
        },
      });
    }

    // Mark order as completed
    await prisma.lims_test_orders.update({
      where: { id: testOrderId },
      data: {
        order_status: 'COMPLETED',
        completed_at: new Date(),
        version: { increment: 1 },
        updated_by: ctx.userId,
      },
    });

    return result;
  },

  async signOff(ctx: RequestContext, testOrderId: string, dto: {
    comments?: string;
  }) {
    const order = await prisma.lims_test_orders.findFirst({
      where: { id: testOrderId, tenant_id: ctx.tenantId },
      include: { result: true },
    });
    if (!order) throw new NotFoundError('TestOrder', testOrderId);

    if (order.order_status === 'APPROVED') {
      throw new AppError('LIMS_ALREADY_SIGNED_OFF', 'Test already signed off', 400);
    }
    if (!order.result) {
      throw new AppError('LIMS_NO_RESULT', 'Cannot sign off without a result', 400);
    }

    // Update order and result
    await prisma.$transaction(async (tx) => {
      await tx.lims_test_orders.update({
        where: { id: testOrderId },
        data: {
          order_status: 'APPROVED',
          version: { increment: 1 },
          updated_by: ctx.userId,
        },
      });

      await tx.lims_results.update({
        where: { test_order_id: testOrderId },
        data: {
          approved_by: ctx.userId,
          approved_at: new Date(),
          comments: dto.comments || order.result!.comments,
          version: { increment: 1 },
          updated_by: ctx.userId,
        },
      });
    });

    // Emit ResultSignedOff event
    await emitDomainEvent({
      tenantId: ctx.tenantId,
      eventType: 'ResultSignedOff',
      aggregateType: 'TestOrder',
      aggregateId: testOrderId,
      payload: {
        testOrderId,
        accessionId: order.accession_id,
        userId: ctx.userId,
      },
    });

    return { testOrderId, status: 'APPROVED' };
  },

  async getResultsByAccession(ctx: RequestContext, accessionId: string) {
    return prisma.lims_test_orders.findMany({
      where: { accession_id: accessionId, tenant_id: ctx.tenantId },
      include: {
        test: true,
        result: true,
        sample: true,
      },
      orderBy: { created_at: 'asc' },
    });
  },
};

function deriveFlag(rawValue: string, referenceRange?: string | null): string {
  if (!referenceRange) return 'NORMAL';

  const numValue = parseFloat(rawValue);
  if (isNaN(numValue)) {
    // For non-numeric (e.g., "Negative", "Positive")
    if (referenceRange.toLowerCase() === 'negative' && rawValue.toLowerCase() === 'positive') {
      return 'HIGH';
    }
    return 'NORMAL';
  }

  // Parse range like "4.5-11.0" or "<5.0" or ">10"
  const rangeMatch = referenceRange.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (numValue < low) return 'LOW';
    if (numValue > high) return 'HIGH';
    return 'NORMAL';
  }

  const ltMatch = referenceRange.match(/^<\s*(\d+\.?\d*)$/);
  if (ltMatch) {
    return numValue >= parseFloat(ltMatch[1]) ? 'HIGH' : 'NORMAL';
  }

  return 'NORMAL';
}
