import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database', () => {
  const mockModel = () => ({
    findFirst: vi.fn(),
    update: vi.fn(),
  });
  return {
    prisma: {
      lims_samples: mockModel(),
    },
  };
});

import { sampleService } from '../sample/sample.service';
import { prisma } from '../../../config/database';

const ctx = {
  requestId: 'req-001',
  tenantId: '00000000-0000-0000-0000-000000000001',
  branchId: 'branch-001',
  userId: 'user-001',
  roleCode: 'LAB_TECHNICIAN',
  permissions: ['lims:update'],
};

describe('Sample Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('markCollected', () => {
    it('transitions PENDING_COLLECTION -> COLLECTED', async () => {
      (prisma.lims_samples.findFirst as any).mockResolvedValue({
        id: 'sample-001',
        tenant_id: ctx.tenantId,
        sample_status: 'PENDING_COLLECTION',
      });
      (prisma.lims_samples.update as any).mockResolvedValue({
        id: 'sample-001',
        sample_status: 'COLLECTED',
      });

      const result = await sampleService.markCollected(ctx, 'sample-001');
      expect(prisma.lims_samples.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ sample_status: 'COLLECTED' }),
      }));
    });

    it('rejects collection of already-collected sample', async () => {
      (prisma.lims_samples.findFirst as any).mockResolvedValue({
        id: 'sample-001',
        tenant_id: ctx.tenantId,
        sample_status: 'COLLECTED',
      });

      await expect(
        sampleService.markCollected(ctx, 'sample-001')
      ).rejects.toThrow('Cannot collect sample in status COLLECTED');
    });

    it('throws NotFoundError for non-existent sample', async () => {
      (prisma.lims_samples.findFirst as any).mockResolvedValue(null);

      await expect(
        sampleService.markCollected(ctx, 'nonexistent')
      ).rejects.toThrow('Sample not found');
    });
  });

  describe('markReceivedAtLab', () => {
    it('transitions COLLECTED -> RECEIVED_AT_LAB', async () => {
      (prisma.lims_samples.findFirst as any).mockResolvedValue({
        id: 'sample-001',
        tenant_id: ctx.tenantId,
        sample_status: 'COLLECTED',
      });
      (prisma.lims_samples.update as any).mockResolvedValue({
        id: 'sample-001',
        sample_status: 'RECEIVED_AT_LAB',
      });

      await sampleService.markReceivedAtLab(ctx, 'sample-001');
      expect(prisma.lims_samples.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ sample_status: 'RECEIVED_AT_LAB' }),
      }));
    });

    it('rejects receive of non-collected sample', async () => {
      (prisma.lims_samples.findFirst as any).mockResolvedValue({
        id: 'sample-001',
        tenant_id: ctx.tenantId,
        sample_status: 'PENDING_COLLECTION',
      });

      await expect(
        sampleService.markReceivedAtLab(ctx, 'sample-001')
      ).rejects.toThrow('Cannot receive sample in status PENDING_COLLECTION');
    });
  });

  describe('rejectSample', () => {
    it('transitions to REJECTED with reason', async () => {
      (prisma.lims_samples.findFirst as any).mockResolvedValue({
        id: 'sample-001',
        tenant_id: ctx.tenantId,
        sample_status: 'COLLECTED',
      });
      (prisma.lims_samples.update as any).mockResolvedValue({
        sample_status: 'REJECTED',
        rejection_reason: 'HEMOLYZED',
      });

      await sampleService.rejectSample(ctx, 'sample-001', 'HEMOLYZED');
      expect(prisma.lims_samples.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          sample_status: 'REJECTED',
          rejection_reason: 'HEMOLYZED',
        }),
      }));
    });
  });
});
