import { prisma } from '../../../config/database';
import { RequestContext } from '../../../shared/types/request-context';

export const patientHistoryService = {
  async getHistory(ctx: RequestContext, patientId: string) {
    const patient = await prisma.mdm_patients.findFirst({
      where: { id: patientId, tenant_id: ctx.tenantId },
    });

    if (!patient) return null;

    const visits = await prisma.lims_visits.findMany({
      where: { tenant_id: ctx.tenantId, patient_id: patientId },
      include: {
        bill: {
          include: {
            items: { include: { test: true } },
            payments: true,
            accession: {
              include: {
                test_orders: {
                  include: { test: true, result: true },
                },
                reports: { include: { delivery_logs: true } },
              },
            },
          },
        },
        referrer: true,
      },
      orderBy: { created_at: 'desc' },
      take: 20,
    });

    return { patient, visits };
  },
};
