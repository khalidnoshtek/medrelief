import { prisma } from '../../config/database';
import { RequestContext } from '../../shared/types/request-context';

export const auditService = {
  /**
   * Get domain events (audit trail) for an entity.
   */
  async getEntityAudit(ctx: RequestContext, aggregateType: string, aggregateId: string) {
    return prisma.domain_events.findMany({
      where: {
        tenant_id: ctx.tenantId,
        aggregate_type: aggregateType,
        aggregate_id: aggregateId,
      },
      orderBy: { created_at: 'desc' },
    });
  },

  /**
   * Get recent events for the branch (activity feed).
   */
  async getRecentActivity(ctx: RequestContext, branchId: string, limit: number = 50) {
    // Get recent domain events
    const events = await prisma.domain_events.findMany({
      where: { tenant_id: ctx.tenantId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });

    return events;
  },

  /**
   * Get bill audit trail — all state changes, payments, adjustments.
   */
  async getBillAudit(ctx: RequestContext, billId: string) {
    const [billEvents, payments, adjustments] = await Promise.all([
      prisma.domain_events.findMany({
        where: { tenant_id: ctx.tenantId, aggregate_id: billId },
        orderBy: { created_at: 'asc' },
      }),
      prisma.billing_payments.findMany({
        where: { tenant_id: ctx.tenantId, bill_id: billId },
        orderBy: { created_at: 'asc' },
      }),
      prisma.billing_adjustments.findMany({
        where: { tenant_id: ctx.tenantId, bill_id: billId },
        orderBy: { created_at: 'asc' },
      }),
    ]);

    // Merge into a timeline
    const timeline: Array<{ timestamp: Date; type: string; detail: string; data?: any }> = [];

    for (const e of billEvents) {
      timeline.push({
        timestamp: e.created_at,
        type: 'EVENT',
        detail: e.event_type,
        data: e.payload,
      });
    }

    for (const p of payments) {
      timeline.push({
        timestamp: p.created_at,
        type: 'PAYMENT',
        detail: `${p.mode} payment of ${p.amount} (${p.status})`,
        data: { payment_reference: p.payment_reference, mode: p.mode, amount: p.amount, status: p.status },
      });
    }

    for (const a of adjustments) {
      timeline.push({
        timestamp: a.created_at,
        type: 'ADJUSTMENT',
        detail: `${a.type} of ${a.amount} — ${a.reason_code} (${a.status})`,
        data: { adjustment_number: a.adjustment_number, type: a.type, amount: a.amount, status: a.status },
      });
    }

    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return timeline;
  },
};
