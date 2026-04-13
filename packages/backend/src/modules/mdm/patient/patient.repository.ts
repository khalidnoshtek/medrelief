import { prisma } from '../../../config/database';

export const patientRepository = {
  async searchByMobile(tenantId: string, mobile: string) {
    return prisma.mdm_patients.findMany({
      where: { tenant_id: tenantId, mobile: { contains: mobile }, status: 'ACTIVE' },
      orderBy: { created_at: 'desc' },
      take: 10,
    });
  },

  async findById(tenantId: string, id: string) {
    return prisma.mdm_patients.findFirst({
      where: { id, tenant_id: tenantId },
    });
  },

  async findByMobileExact(tenantId: string, mobile: string) {
    return prisma.mdm_patients.findFirst({
      where: { tenant_id: tenantId, mobile, status: 'ACTIVE' },
    });
  },

  async create(data: {
    id: string;
    tenant_id: string;
    patient_code: string;
    full_name: string;
    gender: string;
    dob?: Date | null;
    age_years?: number | null;
    mobile: string;
    email?: string | null;
    address?: string | null;
    created_by: string;
    updated_by: string;
  }) {
    return prisma.mdm_patients.create({ data });
  },
};
