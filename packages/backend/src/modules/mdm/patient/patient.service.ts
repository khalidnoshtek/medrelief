import { patientRepository } from './patient.repository';
import { generateId } from '../../../shared/utils/id-generator';
import { generateSequenceNumber } from '../../../shared/utils/number-sequence';
import { ConflictError, NotFoundError } from '../../../shared/errors/app-error';
import { RequestContext } from '../../../shared/types/request-context';

export const patientService = {
  async searchByMobile(ctx: RequestContext, mobile: string) {
    return patientRepository.searchByMobile(ctx.tenantId, mobile);
  },

  async getById(ctx: RequestContext, id: string) {
    const patient = await patientRepository.findById(ctx.tenantId, id);
    if (!patient) throw new NotFoundError('Patient', id);
    return patient;
  },

  async create(ctx: RequestContext, dto: {
    full_name: string;
    gender: string;
    dob?: string | null;
    age_years?: number | null;
    mobile: string;
    email?: string | null;
    address?: string | null;
  }) {
    // Check duplicate mobile
    const existing = await patientRepository.findByMobileExact(ctx.tenantId, dto.mobile);
    if (existing) {
      throw new ConflictError('PATIENT_DUPLICATE_MOBILE', 'A patient with this mobile already exists', {
        existing_patient_id: existing.id,
      });
    }

    const patientCode = await generateSequenceNumber(
      ctx.tenantId, ctx.branchId, 'PAT', 'MR'
    );

    return patientRepository.create({
      id: generateId(),
      tenant_id: ctx.tenantId,
      patient_code: patientCode,
      full_name: dto.full_name,
      gender: dto.gender,
      dob: dto.dob ? new Date(dto.dob) : null,
      age_years: dto.age_years ?? null,
      mobile: dto.mobile,
      email: dto.email ?? null,
      address: dto.address ?? null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
  },
};
