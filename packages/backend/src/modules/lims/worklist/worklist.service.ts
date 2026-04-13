import { prisma } from '../../../config/database';
import { RequestContext } from '../../../shared/types/request-context';

export const worklistService = {
  async getWorklist(ctx: RequestContext, filters: {
    branchId?: string;
    department?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;

    const where: any = {
      tenant_id: ctx.tenantId,
      accession: {
        branch_id: filters.branchId || ctx.branchId,
      },
    };

    if (filters.department) where.department = filters.department;
    if (filters.status) {
      where.order_status = filters.status;
    } else {
      where.order_status = { in: ['ORDERED', 'IN_PROCESS'] };
    }

    const [orders, total] = await Promise.all([
      prisma.lims_test_orders.findMany({
        where,
        include: {
          test: true,
          sample: true,
          result: true,
          accession: {
            include: {
              visit: { include: { patient: true } },
            },
          },
        },
        orderBy: [
          { created_at: 'asc' }, // oldest first (TAT priority)
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lims_test_orders.count({ where }),
    ]);

    return { orders, total, page, limit };
  },

  async startProcessing(ctx: RequestContext, testOrderId: string) {
    return prisma.lims_test_orders.update({
      where: { id: testOrderId },
      data: {
        order_status: 'IN_PROCESS',
        started_at: new Date(),
        assigned_to: ctx.userId,
        version: { increment: 1 },
        updated_by: ctx.userId,
      },
    });
  },
};
