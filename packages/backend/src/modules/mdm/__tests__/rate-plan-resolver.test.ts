import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing the module under test
vi.mock('../../../config/database', () => {
  const mockModel = () => ({
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
  });
  return {
    prisma: {
      mdm_rate_plans: mockModel(),
      mdm_rate_plan_tests: mockModel(),
      mdm_doctors: mockModel(),
      mdm_branches: mockModel(),
    },
  };
});

import { resolveTestPrices } from '../rate-plan/rate-plan-resolver';
import { prisma } from '../../../config/database';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const BRANCH_ID = 'branch-001';
const NOW = new Date('2026-04-08T10:00:00Z');

// Plan IDs
const MRP_PLAN = 'plan-mrp';
const BRANCH_DEFAULT_PLAN = 'plan-branch';
const PAYER_PLAN = 'plan-payer';
const REFERRER_PLAN = 'plan-referrer';

// Test IDs
const CBC_ID = 'test-cbc';
const FBS_ID = 'test-fbs';
const LIPID_ID = 'test-lipid';

describe('Rate Plan Resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves all tests from MRP plan when no higher-priority plans exist', async () => {
    // No doctor, no branch default
    (prisma.mdm_doctors.findFirst as any).mockResolvedValue(null);
    (prisma.mdm_branches.findFirst as any).mockResolvedValue({ id: BRANCH_ID, default_rate_plan_id: null });

    // No payer or branch default plans
    (prisma.mdm_rate_plans.findMany as any).mockImplementation(async ({ where }: any) => {
      if (where.plan_type === 'PAYER_TYPE') return [];
      if (where.plan_type === 'BRANCH_DEFAULT') return [];
      if (where.plan_type === 'MRP') return [{ id: MRP_PLAN, name: 'MRP', priority: 100 }];
      return [];
    });

    // MRP has prices for both tests
    (prisma.mdm_rate_plan_tests.findMany as any).mockResolvedValue([
      { test_id: CBC_ID, rate_plan_id: MRP_PLAN, price: 400, discount_percent: 0 },
      { test_id: FBS_ID, rate_plan_id: MRP_PLAN, price: 180, discount_percent: 0 },
    ]);

    const result = await resolveTestPrices({
      testIds: [CBC_ID, FBS_ID],
      billDateTime: NOW,
      branchId: BRANCH_ID,
      tenantId: TENANT_ID,
    });

    expect(result.size).toBe(2);
    expect(result.get(CBC_ID)!.price).toBe(400);
    expect(result.get(FBS_ID)!.price).toBe(180);
    expect(result.get(CBC_ID)!.ratePlanId).toBe(MRP_PLAN);
  });

  it('uses referrer-linked plan when doctor has a linked rate plan', async () => {
    const DOCTOR_ID = 'doc-001';

    // Doctor has linked plan
    (prisma.mdm_doctors.findFirst as any).mockResolvedValue({
      id: DOCTOR_ID,
      linked_rate_plan_id: REFERRER_PLAN,
    });

    // Referrer plan is active and valid
    (prisma.mdm_rate_plans.findMany as any).mockImplementation(async ({ where }: any) => {
      if (where.id === REFERRER_PLAN) return [{ id: REFERRER_PLAN, name: 'Dr Sharma', priority: 20 }];
      if (where.plan_type === 'PAYER_TYPE') return [];
      if (where.plan_type === 'BRANCH_DEFAULT') return [];
      if (where.plan_type === 'MRP') return [{ id: MRP_PLAN, name: 'MRP', priority: 100 }];
      return [];
    });

    (prisma.mdm_branches.findFirst as any).mockResolvedValue({ id: BRANCH_ID, default_rate_plan_id: null });

    // Referrer plan has CBC price, MRP has both
    let callCount = 0;
    (prisma.mdm_rate_plan_tests.findMany as any).mockImplementation(async ({ where }: any) => {
      if (where.rate_plan_id === REFERRER_PLAN) {
        return [
          { test_id: CBC_ID, rate_plan_id: REFERRER_PLAN, price: 250, discount_percent: 37.5 },
          { test_id: FBS_ID, rate_plan_id: REFERRER_PLAN, price: 120, discount_percent: 33 },
        ];
      }
      if (where.rate_plan_id === MRP_PLAN) {
        return []; // Should not need MRP since referrer covers both
      }
      return [];
    });

    const result = await resolveTestPrices({
      testIds: [CBC_ID, FBS_ID],
      billDateTime: NOW,
      referrerId: DOCTOR_ID,
      branchId: BRANCH_ID,
      tenantId: TENANT_ID,
    });

    expect(result.size).toBe(2);
    expect(result.get(CBC_ID)!.price).toBe(250);
    expect(result.get(CBC_ID)!.ratePlanId).toBe(REFERRER_PLAN);
    expect(result.get(FBS_ID)!.price).toBe(120);
  });

  it('falls back per-test when referrer plan is missing some tests', async () => {
    const DOCTOR_ID = 'doc-001';

    (prisma.mdm_doctors.findFirst as any).mockResolvedValue({
      id: DOCTOR_ID,
      linked_rate_plan_id: REFERRER_PLAN,
    });

    (prisma.mdm_rate_plans.findMany as any).mockImplementation(async ({ where }: any) => {
      if (where.id === REFERRER_PLAN) return [{ id: REFERRER_PLAN, name: 'Dr Sharma', priority: 20 }];
      if (where.plan_type === 'PAYER_TYPE') return [];
      if (where.plan_type === 'BRANCH_DEFAULT') return [];
      if (where.plan_type === 'MRP') return [{ id: MRP_PLAN, name: 'MRP', priority: 100 }];
      return [];
    });

    (prisma.mdm_branches.findFirst as any).mockResolvedValue({ id: BRANCH_ID, default_rate_plan_id: null });

    // Referrer plan only has CBC, not FBS or LIPID
    (prisma.mdm_rate_plan_tests.findMany as any).mockImplementation(async ({ where }: any) => {
      if (where.rate_plan_id === REFERRER_PLAN) {
        // Only return CBC if it's in the requested testIds
        const testIds = where.test_id?.in || [];
        const results = [];
        if (testIds.includes(CBC_ID)) {
          results.push({ test_id: CBC_ID, rate_plan_id: REFERRER_PLAN, price: 250, discount_percent: 37.5 });
        }
        return results;
      }
      if (where.rate_plan_id === MRP_PLAN) {
        const testIds = where.test_id?.in || [];
        const results = [];
        if (testIds.includes(FBS_ID)) {
          results.push({ test_id: FBS_ID, rate_plan_id: MRP_PLAN, price: 180, discount_percent: 0 });
        }
        if (testIds.includes(LIPID_ID)) {
          results.push({ test_id: LIPID_ID, rate_plan_id: MRP_PLAN, price: 800, discount_percent: 0 });
        }
        return results;
      }
      return [];
    });

    const result = await resolveTestPrices({
      testIds: [CBC_ID, FBS_ID, LIPID_ID],
      billDateTime: NOW,
      referrerId: DOCTOR_ID,
      branchId: BRANCH_ID,
      tenantId: TENANT_ID,
    });

    expect(result.size).toBe(3);
    // CBC from referrer plan
    expect(result.get(CBC_ID)!.price).toBe(250);
    expect(result.get(CBC_ID)!.ratePlanId).toBe(REFERRER_PLAN);
    // FBS and LIPID fall back to MRP
    expect(result.get(FBS_ID)!.price).toBe(180);
    expect(result.get(FBS_ID)!.ratePlanId).toBe(MRP_PLAN);
    expect(result.get(LIPID_ID)!.price).toBe(800);
    expect(result.get(LIPID_ID)!.ratePlanId).toBe(MRP_PLAN);
  });

  it('throws BILLING_UNRESOLVED_TESTS when a test has no price in any plan', async () => {
    (prisma.mdm_doctors.findFirst as any).mockResolvedValue(null);
    (prisma.mdm_branches.findFirst as any).mockResolvedValue({ id: BRANCH_ID, default_rate_plan_id: null });
    (prisma.mdm_rate_plans.findMany as any).mockImplementation(async ({ where }: any) => {
      if (where.plan_type === 'MRP') return [{ id: MRP_PLAN, name: 'MRP', priority: 100 }];
      return [];
    });

    // MRP only has CBC, not the unknown test
    (prisma.mdm_rate_plan_tests.findMany as any).mockImplementation(async ({ where }: any) => {
      const testIds = where.test_id?.in || [];
      const results = [];
      if (testIds.includes(CBC_ID)) {
        results.push({ test_id: CBC_ID, rate_plan_id: MRP_PLAN, price: 400, discount_percent: 0 });
      }
      return results;
    });

    await expect(
      resolveTestPrices({
        testIds: [CBC_ID, 'test-unknown'],
        billDateTime: NOW,
        branchId: BRANCH_ID,
        tenantId: TENANT_ID,
      })
    ).rejects.toThrow('No pricing found for tests');
  });

  it('uses explicit bill-level override plan first (priority 1)', async () => {
    const OVERRIDE_PLAN = 'plan-override';

    (prisma.mdm_rate_plans.findFirst as any).mockResolvedValue({
      id: OVERRIDE_PLAN,
      name: 'Override Plan',
      status: 'ACTIVE',
    });
    (prisma.mdm_doctors.findFirst as any).mockResolvedValue(null);
    (prisma.mdm_branches.findFirst as any).mockResolvedValue({ id: BRANCH_ID, default_rate_plan_id: null });
    (prisma.mdm_rate_plans.findMany as any).mockResolvedValue([]);

    (prisma.mdm_rate_plan_tests.findMany as any).mockResolvedValue([
      { test_id: CBC_ID, rate_plan_id: OVERRIDE_PLAN, price: 100, discount_percent: 75 },
    ]);

    const result = await resolveTestPrices({
      testIds: [CBC_ID],
      billDateTime: NOW,
      explicitPlanId: OVERRIDE_PLAN,
      branchId: BRANCH_ID,
      tenantId: TENANT_ID,
    });

    expect(result.get(CBC_ID)!.price).toBe(100);
    expect(result.get(CBC_ID)!.ratePlanId).toBe(OVERRIDE_PLAN);
  });
});
