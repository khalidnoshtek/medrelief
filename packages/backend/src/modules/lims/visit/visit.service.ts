import { prisma } from '../../../config/database';
import { generateId } from '../../../shared/utils/id-generator';
import { generateSequenceNumber } from '../../../shared/utils/number-sequence';
import { RequestContext } from '../../../shared/types/request-context';

export const visitService = {
  async createVisit(ctx: RequestContext, dto: {
    patientId: string;
    branchId: string;
    visitType?: string;
    payerType?: string;
    referrerId?: string;
  }) {
    const branchCode = await getBranchCode(ctx.tenantId, dto.branchId);
    const visitNumber = await generateSequenceNumber(
      ctx.tenantId, dto.branchId, 'VIS', branchCode
    );

    return prisma.lims_visits.create({
      data: {
        id: generateId(),
        tenant_id: ctx.tenantId,
        branch_id: dto.branchId,
        visit_number: visitNumber,
        patient_id: dto.patientId,
        visit_type: dto.visitType || 'WALK_IN',
        payer_type: dto.payerType || 'SELF',
        referrer_id: dto.referrerId || null,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
    });
  },
};

async function getBranchCode(tenantId: string, branchId: string): Promise<string> {
  const branch = await prisma.mdm_branches.findFirst({
    where: { id: branchId, tenant_id: tenantId },
  });
  return branch?.code || 'UNK';
}
