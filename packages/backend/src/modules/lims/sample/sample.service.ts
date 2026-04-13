import { prisma } from '../../../config/database';
import { AppError, NotFoundError } from '../../../shared/errors/app-error';
import { RequestContext } from '../../../shared/types/request-context';

export const sampleService = {
  async markCollected(ctx: RequestContext, sampleId: string) {
    const sample = await prisma.lims_samples.findFirst({
      where: { id: sampleId, tenant_id: ctx.tenantId },
    });
    if (!sample) throw new NotFoundError('Sample', sampleId);
    if (sample.sample_status !== 'PENDING_COLLECTION') {
      throw new AppError('SAMPLE_INVALID_STATE', `Cannot collect sample in status ${sample.sample_status}`, 400);
    }

    return prisma.lims_samples.update({
      where: { id: sampleId },
      data: {
        sample_status: 'COLLECTED',
        collection_time: new Date(),
        version: { increment: 1 },
        updated_by: ctx.userId,
      },
    });
  },

  async markReceivedAtLab(ctx: RequestContext, sampleId: string) {
    const sample = await prisma.lims_samples.findFirst({
      where: { id: sampleId, tenant_id: ctx.tenantId },
    });
    if (!sample) throw new NotFoundError('Sample', sampleId);
    if (sample.sample_status !== 'COLLECTED') {
      throw new AppError('SAMPLE_INVALID_STATE', `Cannot receive sample in status ${sample.sample_status}`, 400);
    }

    return prisma.lims_samples.update({
      where: { id: sampleId },
      data: {
        sample_status: 'RECEIVED_AT_LAB',
        received_time: new Date(),
        version: { increment: 1 },
        updated_by: ctx.userId,
      },
    });
  },

  async rejectSample(ctx: RequestContext, sampleId: string, reason: string) {
    const sample = await prisma.lims_samples.findFirst({
      where: { id: sampleId, tenant_id: ctx.tenantId },
    });
    if (!sample) throw new NotFoundError('Sample', sampleId);

    return prisma.lims_samples.update({
      where: { id: sampleId },
      data: {
        sample_status: 'REJECTED',
        rejection_reason: reason,
        version: { increment: 1 },
        updated_by: ctx.userId,
      },
    });
  },
};
