import { prisma } from '../../../config/database';
import { AppError } from '../../../shared/errors/app-error';
import { Decimal } from '@prisma/client/runtime/library';

export interface ResolvedPrice {
  testId: string;
  ratePlanId: string;
  ratePlanName: string;
  price: number;
  discountPercent: number;
}

interface ResolutionInput {
  testIds: string[];
  billDateTime: Date;
  explicitPlanId?: string;
  referrerId?: string;
  organizationId?: string;
  payerType?: string;
  branchId: string;
  tenantId: string;
}

/**
 * Deterministic rate plan resolution per PRD section 4.3.
 * Priority chain: (1) explicit bill override, (2) referrer-linked, (3) organization/corporate,
 * (4) payer-type mapped, (5) branch default, (6) tenant MRP.
 * Per-test fallback down the chain is allowed.
 */
export async function resolveTestPrices(input: ResolutionInput): Promise<Map<string, ResolvedPrice>> {
  const { testIds, billDateTime, tenantId } = input;
  const resolved = new Map<string, ResolvedPrice>();
  const unresolvedTestIds = new Set(testIds);

  // Build the priority chain of plan candidates
  const planCandidates = await buildPlanCandidates(input);

  // For each priority level, try to resolve remaining unresolved tests
  for (const candidate of planCandidates) {
    if (unresolvedTestIds.size === 0) break;

    // Find prices for unresolved tests in this plan
    const planTests = await prisma.mdm_rate_plan_tests.findMany({
      where: {
        tenant_id: tenantId,
        rate_plan_id: candidate.planId,
        test_id: { in: Array.from(unresolvedTestIds) },
      },
    });

    for (const pt of planTests) {
      if (unresolvedTestIds.has(pt.test_id)) {
        resolved.set(pt.test_id, {
          testId: pt.test_id,
          ratePlanId: pt.rate_plan_id,
          ratePlanName: candidate.planName,
          price: Number(pt.price),
          discountPercent: Number(pt.discount_percent),
        });
        unresolvedTestIds.delete(pt.test_id);
      }
    }
  }

  // If any tests remain unresolved, reject
  if (unresolvedTestIds.size > 0) {
    throw new AppError(
      'BILLING_UNRESOLVED_TESTS',
      `No pricing found for tests: ${Array.from(unresolvedTestIds).join(', ')}`,
      400,
      { unresolved_test_ids: Array.from(unresolvedTestIds) }
    );
  }

  return resolved;
}

interface PlanCandidate {
  planId: string;
  planName: string;
  priority: number;
}

async function buildPlanCandidates(input: ResolutionInput): Promise<PlanCandidate[]> {
  const { tenantId, billDateTime, explicitPlanId, referrerId, payerType, branchId } = input;
  const candidates: PlanCandidate[] = [];

  const now = billDateTime;

  // Helper: find active plans matching criteria
  const findPlans = async (where: Record<string, unknown>) => {
    return prisma.mdm_rate_plans.findMany({
      where: {
        tenant_id: tenantId,
        status: 'ACTIVE',
        effective_from: { lte: now },
        OR: [
          { effective_to: null },
          { effective_to: { gt: now } },
        ],
        ...where,
      },
      orderBy: [
        { priority: 'asc' },
        { effective_from: 'desc' },
        { id: 'asc' }, // tie-breaker
      ],
    });
  };

  // Priority 1: Explicit bill-level override
  if (explicitPlanId) {
    const plan = await prisma.mdm_rate_plans.findFirst({
      where: { id: explicitPlanId, tenant_id: tenantId, status: 'ACTIVE' },
    });
    if (plan) {
      candidates.push({ planId: plan.id, planName: plan.name, priority: 1 });
    }
  }

  // Priority 2: Referrer-linked plan
  if (referrerId) {
    const doctor = await prisma.mdm_doctors.findFirst({
      where: { id: referrerId, tenant_id: tenantId },
    });
    if (doctor?.linked_rate_plan_id) {
      const plans = await findPlans({ id: doctor.linked_rate_plan_id });
      for (const p of plans) {
        candidates.push({ planId: p.id, planName: p.name, priority: 2 });
      }
    }
  }

  // Priority 3: Organization/corporate plan (skipped for prototype - no org entity yet)

  // Priority 4: Payer-type mapped plan
  if (payerType) {
    const plans = await findPlans({ plan_type: 'PAYER_TYPE' });
    for (const p of plans) {
      candidates.push({ planId: p.id, planName: p.name, priority: 4 });
    }
  }

  // Priority 5: Branch default plan
  const branch = await prisma.mdm_branches.findFirst({
    where: { id: branchId, tenant_id: tenantId },
  });
  if (branch?.default_rate_plan_id) {
    const plans = await findPlans({ id: branch.default_rate_plan_id });
    for (const p of plans) {
      candidates.push({ planId: p.id, planName: p.name, priority: 5 });
    }
  }
  // Also any BRANCH_DEFAULT type plans
  const branchPlans = await findPlans({ plan_type: 'BRANCH_DEFAULT' });
  for (const p of branchPlans) {
    if (!candidates.some(c => c.planId === p.id)) {
      candidates.push({ planId: p.id, planName: p.name, priority: 5 });
    }
  }

  // Priority 6: Tenant MRP plan
  const mrpPlans = await findPlans({ plan_type: 'MRP' });
  for (const p of mrpPlans) {
    candidates.push({ planId: p.id, planName: p.name, priority: 6 });
  }

  // Sort by priority (already ordered within each level)
  candidates.sort((a, b) => a.priority - b.priority);

  return candidates;
}
