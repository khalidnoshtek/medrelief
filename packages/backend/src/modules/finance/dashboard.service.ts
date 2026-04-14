import { prisma } from '../../config/database';
import { RequestContext } from '../../shared/types/request-context';

export const dashboardService = {
  async getBranchDashboard(ctx: RequestContext, branchId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const dayStart = new Date(today + 'T00:00:00');
    const dayEnd = new Date(today + 'T23:59:59.999');

    const yesterday = new Date(dayStart); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = new Date(yesterday); yesterdayStart.setHours(0, 0, 0, 0);

    // Today's bills + payments
    const [todayBills, todayPaidBills, todayPayments, pendingPaymentBills] = await Promise.all([
      prisma.billing_bills.count({
        where: { tenant_id: ctx.tenantId, branch_id: branchId, bill_date: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.billing_bills.findMany({
        where: { tenant_id: ctx.tenantId, branch_id: branchId, bill_status: 'PAID', bill_date: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.billing_payments.findMany({
        where: { tenant_id: ctx.tenantId, branch_id: branchId, status: 'SUCCESS', received_at: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.billing_bills.count({
        where: { tenant_id: ctx.tenantId, branch_id: branchId, bill_status: { in: ['PENDING_PAYMENT', 'PARTIALLY_PAID'] } },
      }),
    ]);

    const todayRevenue = todayPaidBills.reduce((s, b) => s + Number(b.final_amount), 0);
    const todayDiscounts = todayPaidBills.reduce((s, b) => s + Number(b.discount_amount), 0);

    // Payment mode breakdown
    const paymentByMode: Record<string, number> = { CASH: 0, UPI: 0, CARD: 0, OTHER: 0 };
    for (const p of todayPayments) {
      const mode = ['CASH', 'UPI', 'CARD'].includes(p.mode) ? p.mode : 'OTHER';
      paymentByMode[mode] += Number(p.amount);
    }

    // Case metrics (accessions)
    const [
      todaysCases, prevDayPendingCases, casesInProgress, casesClosedToday,
      pendingCollection, pendingResults, pendingSignoff, completedToday,
      reportsToday, pendingAdjustments,
    ] = await Promise.all([
      // Today's new accessions
      prisma.lims_accessions.count({
        where: { tenant_id: ctx.tenantId, branch_id: branchId, created_at: { gte: dayStart, lte: dayEnd } },
      }),
      // Previous day pending — accessions created before today that are still not COMPLETED
      prisma.lims_accessions.count({
        where: {
          tenant_id: ctx.tenantId,
          branch_id: branchId,
          created_at: { lt: dayStart },
          accession_status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }),
      // Cases in progress right now (all-time, not just today)
      prisma.lims_accessions.count({
        where: {
          tenant_id: ctx.tenantId,
          branch_id: branchId,
          accession_status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      }),
      // Cases closed today
      prisma.lims_accessions.count({
        where: {
          tenant_id: ctx.tenantId,
          branch_id: branchId,
          accession_status: 'COMPLETED',
          updated_at: { gte: dayStart, lte: dayEnd },
        },
      }),
      prisma.lims_samples.count({
        where: { tenant_id: ctx.tenantId, accession: { branch_id: branchId }, sample_status: 'PENDING_COLLECTION' },
      }),
      prisma.lims_test_orders.count({
        where: { tenant_id: ctx.tenantId, accession: { branch_id: branchId }, order_status: { in: ['ORDERED', 'IN_PROCESS'] } },
      }),
      prisma.lims_test_orders.count({
        where: { tenant_id: ctx.tenantId, accession: { branch_id: branchId }, order_status: 'COMPLETED' },
      }),
      prisma.lims_accessions.count({
        where: { tenant_id: ctx.tenantId, branch_id: branchId, accession_status: 'COMPLETED', created_at: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.lims_reports.count({
        where: { tenant_id: ctx.tenantId, accession: { branch_id: branchId }, created_at: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.billing_adjustments.count({
        where: { tenant_id: ctx.tenantId, branch_id: branchId, status: 'DRAFT' },
      }),
    ]);

    return {
      date: today,
      billing: {
        total_bills: todayBills,
        paid_bills: todayPaidBills.length,
        revenue: todayRevenue,
        discounts: todayDiscounts,
        pending_payment_bills: pendingPaymentBills,
        payment_by_mode: paymentByMode,
      },
      cases: {
        todays_cases: todaysCases,
        previous_day_pending: prevDayPendingCases,
        cases_in_progress: casesInProgress,
        cases_closed_today: casesClosedToday,
      },
      lims: {
        pending_collection: pendingCollection,
        pending_results: pendingResults,
        pending_signoff: pendingSignoff,
        completed_today: completedToday,
        reports_today: reportsToday,
      },
      approvals: {
        pending_adjustments: pendingAdjustments,
      },
    };
  },

  /**
   * List of previous-day pending cases (accessions not yet completed, created before today).
   */
  async getPreviousDayPendingCases(ctx: RequestContext, branchId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return prisma.lims_accessions.findMany({
      where: {
        tenant_id: ctx.tenantId,
        branch_id: branchId,
        created_at: { lt: today },
        accession_status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        visit: { include: { patient: true } },
        bill: { select: { bill_number: true, final_amount: true, bill_status: true } },
        test_orders: { select: { id: true, order_status: true, test: { select: { name: true } } } },
      },
      orderBy: { created_at: 'asc' },
      take: 100,
    });
  },

  /**
   * Itemized daily closing view — all bills created today with payments, per-test breakdown, totals.
   */
  async getDailyClosingItemized(ctx: RequestContext, branchId: string, dateParam?: string) {
    const today = dateParam || new Date().toISOString().slice(0, 10);
    const dayStart = new Date(today + 'T00:00:00');
    const dayEnd = new Date(today + 'T23:59:59.999');

    const bills = await prisma.billing_bills.findMany({
      where: {
        tenant_id: ctx.tenantId,
        branch_id: branchId,
        bill_date: { gte: dayStart, lte: dayEnd },
      },
      include: {
        visit: { include: { patient: { select: { full_name: true, mobile: true } } } },
        payments: { where: { status: 'SUCCESS' } },
        items: { select: { id: true, final_amount: true, test: { select: { name: true } } } },
      },
      orderBy: { bill_date: 'asc' },
    });

    // Totals by mode + status
    const totals = {
      total_bills: bills.length,
      paid_count: 0,
      pending_count: 0,
      cancelled_count: 0,
      gross: 0,
      discounts: 0,
      net_revenue: 0,
      by_mode: { CASH: 0, UPI: 0, CARD: 0, NEFT: 0, CHEQUE: 0, OTHER: 0 } as Record<string, number>,
    };

    for (const b of bills) {
      if (b.bill_status === 'PAID') totals.paid_count++;
      else if (b.bill_status === 'CANCELLED') totals.cancelled_count++;
      else totals.pending_count++;

      if (b.bill_status === 'PAID') {
        totals.net_revenue += Number(b.final_amount);
        totals.gross += Number(b.gross_amount);
        totals.discounts += Number(b.discount_amount);
      }

      for (const p of b.payments) {
        const mode = ['CASH', 'UPI', 'CARD', 'NEFT', 'CHEQUE'].includes(p.mode) ? p.mode : 'OTHER';
        totals.by_mode[mode] = (totals.by_mode[mode] || 0) + Number(p.amount);
      }
    }

    return { date: today, bills, totals };
  },
};
