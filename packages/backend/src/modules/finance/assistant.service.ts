import { prisma } from '../../config/database';
import { RequestContext } from '../../shared/types/request-context';

/**
 * AI Business Assistant — answers natural language questions about the lab's data.
 * Phase 1: pattern-matching on common questions with real DB queries.
 * Phase 2: Claude API for free-form NL → SQL.
 */
export const assistantService = {
  async ask(ctx: RequestContext, branchId: string, question: string): Promise<string> {
    const q = question.toLowerCase().trim();
    const tenantId = ctx.tenantId;

    // Today's date
    const today = new Date().toISOString().slice(0, 10);
    const dayStart = new Date(today + 'T00:00:00');
    const dayEnd = new Date(today + 'T23:59:59.999');

    // ─── Revenue questions ───
    if (q.includes('revenue') || q.includes('sale') || q.includes('collection') || q.includes('earning')) {
      // Check if asking about a specific date
      const dateMatch = q.match(/(\d{4}-\d{2}-\d{2})/);
      const dateStr = dateMatch ? dateMatch[1] : today;
      const ds = new Date(dateStr + 'T00:00:00');
      const de = new Date(dateStr + 'T23:59:59.999');

      const bills = await prisma.billing_bills.findMany({
        where: { tenant_id: tenantId, branch_id: branchId, bill_status: 'PAID', bill_date: { gte: ds, lte: de } },
      });
      const revenue = bills.reduce((s, b) => s + Number(b.final_amount), 0);
      const discounts = bills.reduce((s, b) => s + Number(b.discount_amount), 0);
      return `Revenue for ${dateStr}: ₹${revenue.toFixed(0)} from ${bills.length} paid bills. Discounts given: ₹${discounts.toFixed(0)}.`;
    }

    // ─── Bill count questions ───
    if (q.includes('how many bill') || q.includes('total bill') || q.includes('bill count')) {
      const dateMatch = q.match(/(\d{4}-\d{2}-\d{2})/);
      const dateStr = dateMatch ? dateMatch[1] : today;
      const ds = new Date(dateStr + 'T00:00:00');
      const de = new Date(dateStr + 'T23:59:59.999');

      const [total, paid, pending, cancelled] = await Promise.all([
        prisma.billing_bills.count({ where: { tenant_id: tenantId, branch_id: branchId, bill_date: { gte: ds, lte: de } } }),
        prisma.billing_bills.count({ where: { tenant_id: tenantId, branch_id: branchId, bill_status: 'PAID', bill_date: { gte: ds, lte: de } } }),
        prisma.billing_bills.count({ where: { tenant_id: tenantId, branch_id: branchId, bill_status: { in: ['PENDING_PAYMENT', 'PARTIALLY_PAID'] }, bill_date: { gte: ds, lte: de } } }),
        prisma.billing_bills.count({ where: { tenant_id: tenantId, branch_id: branchId, bill_status: 'CANCELLED', bill_date: { gte: ds, lte: de } } }),
      ]);
      return `Bills for ${dateStr}: ${total} total — ${paid} paid, ${pending} pending, ${cancelled} cancelled.`;
    }

    // ─── Doctor / referrer questions ───
    if (q.includes('doctor') || q.includes('referr') || q.includes('dr ')) {
      const bills = await prisma.billing_bills.findMany({
        where: { tenant_id: tenantId, branch_id: branchId, bill_status: 'PAID', referrer_id: { not: null } },
        include: { visit: { include: { referrer: true } } },
      });

      const doctorMap = new Map<string, { name: string; count: number; revenue: number }>();
      for (const b of bills) {
        const doc = b.visit?.referrer;
        if (!doc) continue;
        const existing = doctorMap.get(doc.id) || { name: doc.name, count: 0, revenue: 0 };
        existing.count++;
        existing.revenue += Number(b.final_amount);
        doctorMap.set(doc.id, existing);
      }

      const sorted = [...doctorMap.values()].sort((a, b) => b.revenue - a.revenue);
      if (sorted.length === 0) return 'No doctor referrals found yet.';

      const lines = sorted.slice(0, 5).map((d, i) =>
        `${i + 1}. ${d.name}: ${d.count} bills, ₹${d.revenue.toFixed(0)}`
      );
      return `Top referring doctors:\n${lines.join('\n')}`;
    }

    // ─── Test / popular test questions ───
    if (q.includes('test') || q.includes('popular') || q.includes('most ordered')) {
      const items = await prisma.billing_bill_items.findMany({
        where: { tenant_id: tenantId },
        include: { test: true },
      });

      const testMap = new Map<string, { name: string; count: number; revenue: number }>();
      for (const item of items) {
        const existing = testMap.get(item.test_id) || { name: item.test?.name || '?', count: 0, revenue: 0 };
        existing.count++;
        existing.revenue += Number(item.final_amount);
        testMap.set(item.test_id, existing);
      }

      const sorted = [...testMap.values()].sort((a, b) => b.count - a.count);
      const lines = sorted.slice(0, 5).map((t, i) =>
        `${i + 1}. ${t.name}: ordered ${t.count} times, ₹${t.revenue.toFixed(0)} revenue`
      );
      return `Top tests:\n${lines.join('\n')}`;
    }

    // ─── Pending / overdue questions ───
    if (q.includes('pending') || q.includes('overdue') || q.includes('unpaid')) {
      const pending = await prisma.billing_bills.findMany({
        where: { tenant_id: tenantId, branch_id: branchId, bill_status: { in: ['PENDING_PAYMENT', 'PARTIALLY_PAID'] } },
        include: { visit: { include: { patient: true } } },
        orderBy: { bill_date: 'asc' },
        take: 10,
      });

      if (pending.length === 0) return 'No pending bills. All clear!';

      const total = pending.reduce((s, b) => s + Number(b.final_amount), 0);
      const lines = pending.slice(0, 5).map(b =>
        `• ${b.bill_number}: ${b.visit?.patient?.full_name} — ₹${Number(b.final_amount).toFixed(0)} (${b.bill_status})`
      );
      return `${pending.length} pending bills totaling ₹${total.toFixed(0)}:\n${lines.join('\n')}${pending.length > 5 ? `\n...and ${pending.length - 5} more` : ''}`;
    }

    // ─── Patient count ───
    if (q.includes('patient') && (q.includes('how many') || q.includes('count') || q.includes('total'))) {
      const count = await prisma.mdm_patients.count({ where: { tenant_id: tenantId, status: 'ACTIVE' } });
      return `Total active patients: ${count}`;
    }

    // ─── Specific bill lookup ───
    const billMatch = q.match(/bill[- #]*(mdh[- ]*main[- ]*\d{8}[- ]*\d+|[a-f0-9-]{36})/i);
    if (billMatch) {
      const search = billMatch[1].replace(/\s/g, '');
      const bill = await prisma.billing_bills.findFirst({
        where: { tenant_id: tenantId, OR: [{ bill_number: { contains: search } }, { id: search }] },
        include: { visit: { include: { patient: true, referrer: true } }, payments: true, items: { include: { test: true } } },
      });
      if (!bill) return `Bill "${search}" not found.`;
      const paid = bill.payments.filter(p => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0);
      return `Bill ${bill.bill_number}:\nPatient: ${bill.visit?.patient?.full_name}\nAmount: ₹${Number(bill.final_amount).toFixed(0)}\nStatus: ${bill.bill_status}\nPaid: ₹${paid.toFixed(0)}\nTests: ${bill.items.map(i => i.test?.name).join(', ')}`;
    }

    // ─── Fallback ───
    return "I can answer questions about revenue, bills, doctors, tests, pending payments, and patient count. Try: 'What's today's revenue?' or 'Top referring doctors' or 'How many bills on 2026-04-08?'";
  },
};
