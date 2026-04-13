import { prisma } from '../../config/database';
import { RequestContext } from '../../shared/types/request-context';

export const dashboardService = {
  async getBranchDashboard(ctx: RequestContext, branchId: string) {
    const today = new Date().toISOString().slice(0, 10);
    const dayStart = new Date(today + 'T00:00:00');
    const dayEnd = new Date(today + 'T23:59:59.999');

    // Today's bills
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

    // LIMS stats
    const [pendingCollection, pendingResults, pendingSignoff, completedToday] = await Promise.all([
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
    ]);

    // Pending adjustments (need center head approval)
    const pendingAdjustments = await prisma.billing_adjustments.count({
      where: { tenant_id: ctx.tenantId, branch_id: branchId, status: 'DRAFT' },
    });

    // Reports generated today
    const reportsToday = await prisma.lims_reports.count({
      where: { tenant_id: ctx.tenantId, accession: { branch_id: branchId }, created_at: { gte: dayStart, lte: dayEnd } },
    });

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
};
