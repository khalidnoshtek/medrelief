import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database', () => {
  const mockModel = () => ({
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  });
  return {
    prisma: {
      lims_test_orders: mockModel(),
      lims_results: mockModel(),
      domain_events: mockModel(),
      $transaction: vi.fn(),
    },
  };
});

vi.mock('../../../shared/events/event-emitter', () => ({
  emitDomainEvent: vi.fn(),
}));

vi.mock('../../../shared/utils/id-generator', () => ({
  generateId: vi.fn().mockReturnValue('gen-uuid'),
}));

import { resultService } from '../result/result.service';
import { prisma } from '../../../config/database';
import { emitDomainEvent } from '../../../shared/events/event-emitter';

const ctx = {
  requestId: 'req-001',
  tenantId: '00000000-0000-0000-0000-000000000001',
  branchId: 'branch-001',
  userId: 'user-path-01',
  roleCode: 'PATHOLOGIST',
  permissions: ['lims:sign-off'],
};

describe('Result Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enterResult', () => {
    it('creates a new result and marks order COMPLETED', async () => {
      const order = {
        id: 'order-001',
        tenant_id: ctx.tenantId,
        accession_id: 'acc-001',
        order_status: 'IN_PROCESS',
        test: { sample_type: 'BLOOD', unit: '10^3/uL', reference_range: '4.5-11.0' },
      };

      (prisma.lims_test_orders.findFirst as any).mockResolvedValue(order);
      (prisma.lims_results.findUnique as any).mockResolvedValue(null); // no existing result
      (prisma.lims_results.create as any).mockResolvedValue({
        id: 'gen-uuid',
        raw_value: '8.2',
        flag: 'NORMAL',
      });
      (prisma.lims_test_orders.update as any).mockResolvedValue({});

      const result = await resultService.enterResult(ctx, 'order-001', {
        raw_value: '8.2',
      });

      expect(prisma.lims_results.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          raw_value: '8.2',
          flag: 'NORMAL',
          unit: '10^3/uL',
          reference_range: '4.5-11.0',
        }),
      }));
      expect(prisma.lims_test_orders.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ order_status: 'COMPLETED' }),
      }));
    });

    it('auto-derives HIGH flag when value exceeds reference range', async () => {
      const order = {
        id: 'order-001',
        tenant_id: ctx.tenantId,
        order_status: 'IN_PROCESS',
        test: { unit: 'mg/dL', reference_range: '70-100' },
      };

      (prisma.lims_test_orders.findFirst as any).mockResolvedValue(order);
      (prisma.lims_results.findUnique as any).mockResolvedValue(null);
      (prisma.lims_results.create as any).mockResolvedValue({});
      (prisma.lims_test_orders.update as any).mockResolvedValue({});

      await resultService.enterResult(ctx, 'order-001', { raw_value: '130' });

      expect(prisma.lims_results.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ flag: 'HIGH' }),
      }));
    });

    it('auto-derives LOW flag when value is below reference range', async () => {
      const order = {
        id: 'order-001',
        tenant_id: ctx.tenantId,
        order_status: 'IN_PROCESS',
        test: { unit: '10^3/uL', reference_range: '4.5-11.0' },
      };

      (prisma.lims_test_orders.findFirst as any).mockResolvedValue(order);
      (prisma.lims_results.findUnique as any).mockResolvedValue(null);
      (prisma.lims_results.create as any).mockResolvedValue({});
      (prisma.lims_test_orders.update as any).mockResolvedValue({});

      await resultService.enterResult(ctx, 'order-001', { raw_value: '3.0' });

      expect(prisma.lims_results.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ flag: 'LOW' }),
      }));
    });

    it('rejects result entry on already-approved order', async () => {
      (prisma.lims_test_orders.findFirst as any).mockResolvedValue({
        id: 'order-001',
        tenant_id: ctx.tenantId,
        order_status: 'APPROVED',
        test: {},
      });

      await expect(
        resultService.enterResult(ctx, 'order-001', { raw_value: '8.0' })
      ).rejects.toThrow('Cannot modify approved result');
    });
  });

  describe('signOff', () => {
    it('marks order APPROVED and emits ResultSignedOff event', async () => {
      const order = {
        id: 'order-001',
        tenant_id: ctx.tenantId,
        accession_id: 'acc-001',
        order_status: 'COMPLETED',
        result: { id: 'res-001', comments: null },
      };

      (prisma.lims_test_orders.findFirst as any).mockResolvedValue(order);

      (prisma.$transaction as any).mockImplementation(async (fn: any) => {
        const tx = {
          lims_test_orders: { update: vi.fn() },
          lims_results: { update: vi.fn() },
        };
        return fn(tx);
      });
      (emitDomainEvent as any).mockResolvedValue(undefined);

      const result = await resultService.signOff(ctx, 'order-001', {});

      expect(result.status).toBe('APPROVED');
      expect(emitDomainEvent).toHaveBeenCalledWith(expect.objectContaining({
        eventType: 'ResultSignedOff',
        aggregateId: 'order-001',
      }));
    });

    it('rejects sign-off when no result exists', async () => {
      (prisma.lims_test_orders.findFirst as any).mockResolvedValue({
        id: 'order-001',
        tenant_id: ctx.tenantId,
        order_status: 'COMPLETED',
        result: null,
      });

      await expect(
        resultService.signOff(ctx, 'order-001', {})
      ).rejects.toThrow('Cannot sign off without a result');
    });

    it('rejects double sign-off', async () => {
      (prisma.lims_test_orders.findFirst as any).mockResolvedValue({
        id: 'order-001',
        tenant_id: ctx.tenantId,
        order_status: 'APPROVED',
        result: { id: 'res-001' },
      });

      await expect(
        resultService.signOff(ctx, 'order-001', {})
      ).rejects.toThrow('Test already signed off');
    });
  });
});
