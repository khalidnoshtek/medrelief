import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('../../../config/database', () => {
  const mockModel = () => ({
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  });
  return {
    prisma: {
      billing_bills: mockModel(),
      billing_bill_items: mockModel(),
      billing_payments: mockModel(),
      lims_visits: mockModel(),
      mdm_branches: mockModel(),
      mdm_rate_plans: mockModel(),
      mdm_rate_plan_tests: mockModel(),
      mdm_doctors: mockModel(),
      domain_events: mockModel(),
      $transaction: vi.fn(),
      $queryRaw: vi.fn(),
    },
  };
});

vi.mock('../../mdm/rate-plan/rate-plan-resolver', () => ({
  resolveTestPrices: vi.fn(),
}));

vi.mock('../../lims/visit/visit.service', () => ({
  visitService: {
    createVisit: vi.fn(),
  },
}));

vi.mock('../../../shared/events/event-emitter', () => ({
  emitDomainEvent: vi.fn(),
}));

vi.mock('../../../shared/utils/number-sequence', () => ({
  generateSequenceNumber: vi.fn().mockResolvedValue('BILL-MDH-MAIN-20260408-0001'),
}));

vi.mock('../../../shared/utils/id-generator', () => ({
  generateId: vi.fn().mockReturnValue('generated-uuid'),
}));

import { billingService } from '../billing.service';
import { resolveTestPrices } from '../../mdm/rate-plan/rate-plan-resolver';
import { visitService } from '../../lims/visit/visit.service';
import { emitDomainEvent } from '../../../shared/events/event-emitter';
import { prisma } from '../../../config/database';

const ctx = {
  requestId: 'req-001',
  tenantId: '00000000-0000-0000-0000-000000000001',
  branchId: 'branch-001',
  userId: 'user-001',
  roleCode: 'RECEPTIONIST',
  permissions: ['billing:create', 'payment:create'],
};

describe('Billing Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBill', () => {
    it('creates a bill with rate-plan-resolved prices', async () => {
      const visit = { id: 'visit-001', visit_number: 'VIS-MDH-MAIN-20260408-0001' };
      (visitService.createVisit as any).mockResolvedValue(visit);

      // Rate plan resolver returns prices
      (resolveTestPrices as any).mockResolvedValue(
        new Map([
          ['test-cbc', { testId: 'test-cbc', ratePlanId: 'plan-001', ratePlanName: 'Dr Sharma', price: 250, discountPercent: 0 }],
          ['test-fbs', { testId: 'test-fbs', ratePlanId: 'plan-001', ratePlanName: 'Dr Sharma', price: 120, discountPercent: 0 }],
        ])
      );

      (prisma.mdm_branches.findFirst as any).mockResolvedValue({ id: 'branch-001', code: 'MDH-MAIN' });

      const createdBill = {
        id: 'generated-uuid',
        bill_number: 'BILL-MDH-MAIN-20260408-0001',
        gross_amount: 370,
        discount_amount: 0,
        net_amount: 370,
        tax_amount: 0,
        rounding_adjustment: 0,
        final_amount: 370,
        bill_status: 'PENDING_PAYMENT',
        payment_status: 'UNPAID',
      };

      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          billing_bills: { create: vi.fn().mockResolvedValue(createdBill) },
          billing_bill_items: { createMany: vi.fn() },
        };
        return fn(tx);
      });

      const result = await billingService.createBill(ctx, {
        patient_id: 'pat-001',
        branch_id: 'branch-001',
        visit_type: 'WALK_IN',
        payer_type: 'SELF',
        referrer_id: 'doc-001',
        tests: [
          { test_id: 'test-cbc', quantity: 1 },
          { test_id: 'test-fbs', quantity: 1 },
        ],
      });

      expect(visitService.createVisit).toHaveBeenCalledWith(ctx, expect.objectContaining({
        patientId: 'pat-001',
        referrerId: 'doc-001',
      }));
      expect(resolveTestPrices).toHaveBeenCalledWith(expect.objectContaining({
        testIds: ['test-cbc', 'test-fbs'],
        referrerId: 'doc-001',
      }));
      expect(result.bill_number).toBe('BILL-MDH-MAIN-20260408-0001');
    });
  });

  describe('recordPayment', () => {
    it('transitions bill to PAID on full payment and emits BillConfirmed', async () => {
      const bill = {
        id: 'bill-001',
        tenant_id: ctx.tenantId,
        branch_id: 'branch-001',
        visit_id: 'visit-001',
        final_amount: 370,
        bill_status: 'PENDING_PAYMENT',
        payments: [],
      };

      (prisma.billing_bills.findFirst as any).mockResolvedValue(bill);
      (prisma.mdm_branches.findFirst as any).mockResolvedValue({ id: 'branch-001', code: 'MDH-MAIN' });

      const createdPayment = { id: 'pay-001', amount: 370, status: 'SUCCESS' };

      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          billing_payments: { create: vi.fn().mockResolvedValue(createdPayment) },
          billing_bills: { update: vi.fn() },
        };
        return fn(tx);
      });

      (emitDomainEvent as any).mockResolvedValue(undefined);

      const result = await billingService.recordPayment(ctx, {
        bill_id: 'bill-001',
        mode: 'CASH',
        amount: 370,
      });

      expect(result.bill_status).toBe('PAID');
      expect(result.payment_status).toBe('PAID');
      expect(emitDomainEvent).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'BillConfirmed',
        aggregateId: 'bill-001',
      }));
    });

    it('transitions to PARTIALLY_PAID and does NOT emit BillConfirmed', async () => {
      const bill = {
        id: 'bill-001',
        tenant_id: ctx.tenantId,
        branch_id: 'branch-001',
        visit_id: 'visit-001',
        final_amount: 370,
        bill_status: 'PENDING_PAYMENT',
        payments: [],
      };

      (prisma.billing_bills.findFirst as any).mockResolvedValue(bill);
      (prisma.mdm_branches.findFirst as any).mockResolvedValue({ id: 'branch-001', code: 'MDH-MAIN' });

      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          billing_payments: { create: vi.fn().mockResolvedValue({ id: 'pay-001', amount: 200 }) },
          billing_bills: { update: vi.fn() },
        };
        return fn(tx);
      });

      const result = await billingService.recordPayment(ctx, {
        bill_id: 'bill-001',
        mode: 'CASH',
        amount: 200,
      });

      expect(result.bill_status).toBe('PARTIALLY_PAID');
      expect(emitDomainEvent).not.toHaveBeenCalled();
    });

    it('rejects payment exceeding remaining balance', async () => {
      const bill = {
        id: 'bill-001',
        tenant_id: ctx.tenantId,
        branch_id: 'branch-001',
        final_amount: 370,
        bill_status: 'PENDING_PAYMENT',
        payments: [{ amount: 300, status: 'SUCCESS' }],
      };

      (prisma.billing_bills.findFirst as any).mockResolvedValue(bill);

      await expect(
        billingService.recordPayment(ctx, { bill_id: 'bill-001', mode: 'CASH', amount: 100 })
      ).rejects.toThrow('Payment amount exceeds remaining balance');
    });

    it('rejects payment on cancelled bill', async () => {
      const bill = {
        id: 'bill-001',
        tenant_id: ctx.tenantId,
        final_amount: 370,
        bill_status: 'CANCELLED',
        payments: [],
      };

      (prisma.billing_bills.findFirst as any).mockResolvedValue(bill);

      await expect(
        billingService.recordPayment(ctx, { bill_id: 'bill-001', mode: 'CASH', amount: 370 })
      ).rejects.toThrow('Cannot accept payment for this bill');
    });
  });
});
