import { prisma } from '../../config/database';
import { RequestContext } from '../../shared/types/request-context';

/**
 * AI Business Assistant — uses Claude to understand questions and query the database.
 * Gathers business data, sends to Claude with the question, gets a natural answer.
 */
export const assistantService = {
  async ask(ctx: RequestContext, branchId: string, question: string): Promise<string> {
    const tenantId = ctx.tenantId;
    const today = new Date().toISOString().slice(0, 10);
    const ds = new Date(today + 'T00:00:00');
    const de = new Date(today + 'T23:59:59.999');

    // Gather all relevant business data upfront (fast, parallel queries)
    const [
      todayBills, allPaidBills, pendingPaymentBills,
      todayPayments, pendingTests, completedTests,
      pendingCollection, totalPatients, accessions,
      todayAccessions, completedAccToday, reports, doctors,
    ] = await Promise.all([
      prisma.billing_bills.findMany({
        where: { tenant_id: tenantId, branch_id: branchId, bill_date: { gte: ds, lte: de } },
        include: { visit: { include: { patient: { select: { full_name: true } }, referrer: { select: { name: true } } } }, items: { include: { test: { select: { name: true } } } }, payments: true },
      }),
      prisma.billing_bills.findMany({
        where: { tenant_id: tenantId, branch_id: branchId, bill_status: 'PAID' },
        include: { visit: { include: { referrer: { select: { name: true, id: true } } } }, items: { include: { test: { select: { name: true } } } } },
      }),
      prisma.billing_bills.findMany({
        where: { tenant_id: tenantId, branch_id: branchId, bill_status: { in: ['PENDING_PAYMENT', 'PARTIALLY_PAID'] } },
        include: { visit: { include: { patient: { select: { full_name: true } } } } },
      }),
      prisma.billing_payments.findMany({
        where: { tenant_id: tenantId, branch_id: branchId, status: 'SUCCESS', received_at: { gte: ds, lte: de } },
      }),
      prisma.lims_test_orders.findMany({
        where: { tenant_id: tenantId, accession: { branch_id: branchId }, order_status: { in: ['ORDERED', 'IN_PROCESS', 'COMPLETED'] } },
        include: { test: { select: { name: true } }, accession: { include: { visit: { include: { patient: { select: { full_name: true } } } } } } },
        take: 50,
      }),
      prisma.lims_test_orders.count({
        where: { tenant_id: tenantId, accession: { branch_id: branchId }, order_status: 'APPROVED' },
      }),
      prisma.lims_samples.count({
        where: { tenant_id: tenantId, accession: { branch_id: branchId }, sample_status: 'PENDING_COLLECTION' },
      }),
      prisma.mdm_patients.count({ where: { tenant_id: tenantId, status: 'ACTIVE' } }),
      prisma.lims_accessions.count({ where: { tenant_id: tenantId, branch_id: branchId } }),
      prisma.lims_accessions.count({ where: { tenant_id: tenantId, branch_id: branchId, created_at: { gte: ds, lte: de } } }),
      prisma.lims_accessions.count({ where: { tenant_id: tenantId, branch_id: branchId, accession_status: 'COMPLETED', updated_at: { gte: ds, lte: de } } }),
      prisma.lims_reports.count({ where: { tenant_id: tenantId, accession: { branch_id: branchId } } }),
      prisma.mdm_doctors.findMany({ where: { tenant_id: tenantId, status: 'ACTIVE' }, select: { id: true, name: true, specialty: true } }),
    ]);

    // Build a data summary for Claude
    const todayRevenue = todayBills.filter(b => b.bill_status === 'PAID').reduce((s, b) => s + Number(b.final_amount), 0);
    const todayDiscounts = todayBills.filter(b => b.bill_status === 'PAID').reduce((s, b) => s + Number(b.discount_amount), 0);
    const paymentModes: Record<string, number> = {};
    for (const p of todayPayments) { paymentModes[p.mode] = (paymentModes[p.mode] || 0) + Number(p.amount); }

    // Doctor referral stats
    const doctorStats = new Map<string, { name: string; count: number; revenue: number }>();
    for (const b of allPaidBills) {
      const doc = b.visit?.referrer;
      if (!doc) continue;
      const e = doctorStats.get(doc.id) || { name: doc.name, count: 0, revenue: 0 };
      e.count++; e.revenue += Number(b.final_amount);
      doctorStats.set(doc.id, e);
    }

    // Test popularity
    const testStats = new Map<string, { name: string; count: number; revenue: number }>();
    for (const b of allPaidBills) {
      for (const item of b.items) {
        const e = testStats.get(item.test?.name || '?') || { name: item.test?.name || '?', count: 0, revenue: 0 };
        e.count++; e.revenue += Number(item.final_amount);
        testStats.set(item.test?.name || '?', e);
      }
    }

    const pendingTestsList = pendingTests.slice(0, 10).map(t =>
      `${t.test?.name} for ${t.accession?.visit?.patient?.full_name} (${t.order_status})`
    );

    const pendingBillsList = pendingPaymentBills.slice(0, 10).map(b =>
      `${b.bill_number}: ${b.visit?.patient?.full_name} ₹${Number(b.final_amount).toFixed(0)} (${b.bill_status})`
    );

    const todayBillsList = todayBills.slice(0, 15).map(b =>
      `${b.bill_number}: ${b.visit?.patient?.full_name} ₹${Number(b.final_amount).toFixed(0)} ${b.bill_status} [${b.items.map(i => i.test?.name).join(', ')}]`
    );

    const topDoctors = [...doctorStats.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const topTests = [...testStats.values()].sort((a, b) => b.count - a.count).slice(0, 10);

    const dataContext = `
BUSINESS DATA (as of ${today}):

TODAY'S SUMMARY:
- Revenue: ₹${todayRevenue} from ${todayBills.filter(b => b.bill_status === 'PAID').length} paid bills
- Total bills today: ${todayBills.length}
- Discounts: ₹${todayDiscounts}
- Payment breakdown: ${Object.entries(paymentModes).map(([m, a]) => `${m}: ₹${a.toFixed(0)}`).join(', ') || 'none'}
- New accessions today: ${todayAccessions}, completed: ${completedAccToday}

PENDING:
- ${pendingPaymentBills.length} unpaid bills (₹${pendingPaymentBills.reduce((s, b) => s + Number(b.final_amount), 0).toFixed(0)} total)
- ${pendingTests.filter(t => t.order_status === 'ORDERED').length} tests waiting to start
- ${pendingTests.filter(t => t.order_status === 'IN_PROCESS').length} tests in process
- ${pendingTests.filter(t => t.order_status === 'COMPLETED').length} tests awaiting sign-off
- ${pendingCollection} samples awaiting collection

TOTALS (ALL TIME):
- ${totalPatients} active patients
- ${accessions} total accessions
- ${completedTests} tests approved
- ${reports} reports generated
- ${doctors.length} doctors in system

TOP REFERRING DOCTORS:
${topDoctors.map((d, i) => `${i + 1}. ${d.name}: ${d.count} bills, ₹${d.revenue.toFixed(0)}`).join('\n')}

MOST ORDERED TESTS:
${topTests.map((t, i) => `${i + 1}. ${t.name}: ${t.count} times, ₹${t.revenue.toFixed(0)}`).join('\n')}

TODAY'S BILLS:
${todayBillsList.join('\n') || 'None today'}

PENDING BILLS:
${pendingBillsList.join('\n') || 'All paid'}

PENDING TESTS:
${pendingTestsList.join('\n') || 'All done'}

DOCTORS IN SYSTEM:
${doctors.map(d => `${d.name} (${d.specialty})`).join(', ')}
`;

    // Call Claude API
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        // Fallback to simple answer if no API key
        return this.simpleFallback(question, dataContext);
      }

      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
        max_tokens: 500,
        system: `You are a business assistant for Medrelief, a diagnostic lab. Answer questions about the lab's business using ONLY the data provided below. Be concise, direct, use bullet points and numbers. If asked about something not in the data, say so. Use ₹ for currency. Don't make up data.

${dataContext}`,
        messages: [{ role: 'user', content: question }],
      });

      const text = response.content.find((b: any) => b.type === 'text') as any;
      return text?.text || 'Sorry, I could not generate a response.';
    } catch (err: any) {
      console.error('[Assistant] Claude API error:', err.message);
      return this.simpleFallback(question, dataContext);
    }
  },

  /** Fallback when Claude API is unavailable — extract key numbers from data context */
  simpleFallback(question: string, dataContext: string): string {
    // Just return relevant section of the data context
    const q = question.toLowerCase();
    const sections = dataContext.split('\n\n');
    for (const section of sections) {
      const header = section.split('\n')[0].toLowerCase();
      if (
        (q.includes('pending') && (header.includes('pending'))) ||
        (q.includes('revenue') && header.includes('summary')) ||
        (q.includes('doctor') && header.includes('doctor')) ||
        (q.includes('test') && (header.includes('test') || header.includes('ordered'))) ||
        (q.includes('today') && header.includes('summary')) ||
        (q.includes('bill') && header.includes('bill'))
      ) {
        return section.trim();
      }
    }
    return dataContext.split('\n\n').slice(0, 3).join('\n\n').trim();
  },
};
