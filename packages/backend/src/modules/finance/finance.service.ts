import { prisma } from '../../config/database';
import { generateId } from '../../shared/utils/id-generator';
import { generateSequenceNumber } from '../../shared/utils/number-sequence';
import { emitDomainEvent } from '../../shared/events/event-emitter';
import { AppError, NotFoundError } from '../../shared/errors/app-error';
import { RequestContext } from '../../shared/types/request-context';

export const financeService = {
  /**
   * Open a new shift for the current user at their branch.
   */
  async openShift(ctx: RequestContext) {
    // Check no open shift exists for this user
    const existing = await prisma.finance_shifts.findFirst({
      where: { tenant_id: ctx.tenantId, branch_id: ctx.branchId, user_id: ctx.userId, status: 'OPEN' },
    });
    if (existing) {
      throw new AppError('FINANCE_SHIFT_ALREADY_OPEN', 'You already have an open shift', 400, {
        shift_id: existing.id,
        shift_number: existing.shift_number,
      });
    }

    const branch = await prisma.mdm_branches.findFirst({
      where: { id: ctx.branchId, tenant_id: ctx.tenantId },
    });

    const shiftNumber = await generateSequenceNumber(
      ctx.tenantId, ctx.branchId, 'SHF', branch?.code || 'UNK'
    );

    return prisma.finance_shifts.create({
      data: {
        id: generateId(),
        tenant_id: ctx.tenantId,
        branch_id: ctx.branchId,
        shift_number: shiftNumber,
        user_id: ctx.userId,
        status: 'OPEN',
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
    });
  },

  /**
   * Close a shift: calculate system totals from payments, accept physical counts, compute variance.
   */
  async closeShift(ctx: RequestContext, shiftId: string, physicalCounts: {
    actual_cash: number;
    actual_upi: number;
    actual_card: number;
    actual_other: number;
    variance_reason?: string;
  }) {
    const shift = await prisma.finance_shifts.findFirst({
      where: { id: shiftId, tenant_id: ctx.tenantId, status: 'OPEN' },
    });
    if (!shift) throw new NotFoundError('Shift', shiftId);

    // Calculate system totals from payments made during this shift
    // (all payments at this branch by this user since shift opened)
    const payments = await prisma.billing_payments.findMany({
      where: {
        tenant_id: ctx.tenantId,
        branch_id: shift.branch_id,
        status: 'SUCCESS',
        received_at: { gte: shift.opened_at },
      },
    });

    const systemTotals = { cash: 0, upi: 0, card: 0, other: 0 };
    for (const p of payments) {
      const amt = Number(p.amount);
      switch (p.mode) {
        case 'CASH': systemTotals.cash += amt; break;
        case 'UPI': systemTotals.upi += amt; break;
        case 'CARD': systemTotals.card += amt; break;
        default: systemTotals.other += amt; break;
      }
    }

    const variance = {
      cash: physicalCounts.actual_cash - systemTotals.cash,
      upi: physicalCounts.actual_upi - systemTotals.upi,
      card: physicalCounts.actual_card - systemTotals.card,
      other: physicalCounts.actual_other - systemTotals.other,
    };

    return prisma.finance_shifts.update({
      where: { id: shiftId },
      data: {
        status: 'CLOSED',
        closed_at: new Date(),
        system_cash: systemTotals.cash,
        system_upi: systemTotals.upi,
        system_card: systemTotals.card,
        system_other: systemTotals.other,
        actual_cash: physicalCounts.actual_cash,
        actual_upi: physicalCounts.actual_upi,
        actual_card: physicalCounts.actual_card,
        actual_other: physicalCounts.actual_other,
        variance_cash: variance.cash,
        variance_upi: variance.upi,
        variance_card: variance.card,
        variance_other: variance.other,
        variance_reason: physicalCounts.variance_reason || null,
        version: { increment: 1 },
        updated_by: ctx.userId,
      },
    });
  },

  async getMyOpenShift(ctx: RequestContext) {
    return prisma.finance_shifts.findFirst({
      where: { tenant_id: ctx.tenantId, branch_id: ctx.branchId, user_id: ctx.userId, status: 'OPEN' },
    });
  },

  async getShifts(ctx: RequestContext, filters: { branchId?: string; status?: string }) {
    return prisma.finance_shifts.findMany({
      where: {
        tenant_id: ctx.tenantId,
        branch_id: filters.branchId || ctx.branchId,
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  },

  /**
   * Daily close: freeze all bills/payments for the day and generate summary.
   */
  async dailyClose(ctx: RequestContext, branchId: string, closeDate: string) {
    // Check not already closed
    const existing = await prisma.finance_daily_close.findFirst({
      where: { tenant_id: ctx.tenantId, branch_id: branchId, close_date: closeDate },
    });
    if (existing?.status === 'CLOSED') {
      throw new AppError('FINANCE_ALREADY_CLOSED', `Daily close already completed for ${closeDate}`, 400);
    }

    // Calculate totals from bills and payments for the day
    const dayStart = new Date(closeDate + 'T00:00:00');
    const dayEnd = new Date(closeDate + 'T23:59:59.999');

    const bills = await prisma.billing_bills.findMany({
      where: {
        tenant_id: ctx.tenantId,
        branch_id: branchId,
        bill_status: 'PAID',
        bill_date: { gte: dayStart, lte: dayEnd },
      },
    });

    const payments = await prisma.billing_payments.findMany({
      where: {
        tenant_id: ctx.tenantId,
        branch_id: branchId,
        status: 'SUCCESS',
        received_at: { gte: dayStart, lte: dayEnd },
      },
    });

    const adjustments = await prisma.billing_adjustments.findMany({
      where: {
        tenant_id: ctx.tenantId,
        branch_id: branchId,
        status: 'APPROVED',
        created_at: { gte: dayStart, lte: dayEnd },
      },
    });

    const totals = {
      bills: bills.length,
      revenue: bills.reduce((s, b) => s + Number(b.final_amount), 0),
      cash: 0, upi: 0, card: 0, other: 0,
      discounts: bills.reduce((s, b) => s + Number(b.discount_amount), 0),
      refunds: adjustments.reduce((s, a) => s + Number(a.amount), 0),
    };

    for (const p of payments) {
      const amt = Number(p.amount);
      switch (p.mode) {
        case 'CASH': totals.cash += amt; break;
        case 'UPI': totals.upi += amt; break;
        case 'CARD': totals.card += amt; break;
        default: totals.other += amt; break;
      }
    }

    const closeRecord = existing
      ? await prisma.finance_daily_close.update({
          where: { id: existing.id },
          data: {
            status: 'CLOSED',
            total_bills: totals.bills,
            total_revenue: totals.revenue,
            total_cash: totals.cash,
            total_upi: totals.upi,
            total_card: totals.card,
            total_other: totals.other,
            total_discounts: totals.discounts,
            total_refunds: totals.refunds,
            closed_by: ctx.userId,
            closed_at: new Date(),
            version: { increment: 1 },
            updated_by: ctx.userId,
          },
        })
      : await prisma.finance_daily_close.create({
          data: {
            id: generateId(),
            tenant_id: ctx.tenantId,
            branch_id: branchId,
            close_date: closeDate,
            status: 'CLOSED',
            total_bills: totals.bills,
            total_revenue: totals.revenue,
            total_cash: totals.cash,
            total_upi: totals.upi,
            total_card: totals.card,
            total_other: totals.other,
            total_discounts: totals.discounts,
            total_refunds: totals.refunds,
            closed_by: ctx.userId,
            closed_at: new Date(),
            created_by: ctx.userId,
            updated_by: ctx.userId,
          },
        });

    await emitDomainEvent({
      tenantId: ctx.tenantId,
      eventType: 'DailyBranchCloseCompleted',
      aggregateType: 'BranchClose',
      aggregateId: closeRecord.id,
      payload: { branchId, closeDate, totals },
    });

    return closeRecord;
  },

  async getDailyCloseHistory(ctx: RequestContext, branchId: string) {
    return prisma.finance_daily_close.findMany({
      where: { tenant_id: ctx.tenantId, branch_id: branchId },
      orderBy: { close_date: 'desc' },
      take: 30,
    });
  },
};
