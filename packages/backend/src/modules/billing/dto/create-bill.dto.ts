import { z } from 'zod';

export const createBillSchema = z.object({
  patient_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  visit_type: z.enum(['WALK_IN', 'HOME_COLLECTION', 'CAMP', 'CORPORATE']).default('WALK_IN'),
  payer_type: z.enum(['SELF', 'CORPORATE', 'INSURANCE']).default('SELF'),
  referrer_id: z.string().uuid().optional().nullable(),
  tests: z.array(z.object({
    test_id: z.string(),
    quantity: z.number().int().min(1).default(1),
  })).default([]),
  packages: z.array(z.object({
    package_id: z.string(),
  })).default([]),
  manual_discount_percent: z.number().min(0).max(100).optional(),
  discount_reason_code: z.string().optional(),
  explicit_rate_plan_id: z.string().uuid().optional(),
}).refine(
  (data) => data.tests.length > 0 || data.packages.length > 0,
  { message: 'At least one test or package is required' }
);

export type CreateBillDto = z.infer<typeof createBillSchema>;

export const createPaymentSchema = z.object({
  bill_id: z.string().uuid(),
  mode: z.enum(['CASH', 'UPI', 'CARD', 'NEFT', 'CHEQUE']),
  amount: z.number().positive(),
  upi_rrn: z.string().optional(),
  instrument_details: z.string().optional(),
});

export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
