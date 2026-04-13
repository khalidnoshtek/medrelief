import { z } from 'zod';

export const createPatientSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dob: z.string().optional().nullable(),
  age_years: z.number().int().min(0).max(150).optional().nullable(),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be 10 digits'),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
}).refine(
  (data) => data.dob || data.age_years !== undefined,
  { message: 'Either date of birth or age is required' }
);

export type CreatePatientDto = z.infer<typeof createPatientSchema>;
