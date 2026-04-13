import { vi } from 'vitest';

/**
 * Creates a mock PrismaClient for unit testing.
 * Each model gets standard CRUD methods that return vi.fn().
 */
export function createMockPrisma() {
  const mockModel = () => ({
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  });

  return {
    auth_users: mockModel(),
    auth_roles: mockModel(),
    auth_permissions: mockModel(),
    auth_role_permissions: mockModel(),
    mdm_branches: mockModel(),
    mdm_patients: mockModel(),
    mdm_doctors: mockModel(),
    mdm_tests: mockModel(),
    mdm_packages: mockModel(),
    mdm_package_tests: mockModel(),
    mdm_rate_plans: mockModel(),
    mdm_rate_plan_tests: mockModel(),
    lims_visits: mockModel(),
    lims_accessions: mockModel(),
    lims_samples: mockModel(),
    lims_test_orders: mockModel(),
    lims_results: mockModel(),
    lims_reports: mockModel(),
    lims_report_delivery_logs: mockModel(),
    billing_bills: mockModel(),
    billing_bill_items: mockModel(),
    billing_payments: mockModel(),
    billing_adjustments: mockModel(),
    domain_events: mockModel(),
    number_sequences: mockModel(),
    $queryRaw: vi.fn(),
    $transaction: vi.fn((fn: any) => fn({
      // Provide transaction-scoped mock models
      billing_bills: { create: vi.fn(), update: vi.fn() },
      billing_bill_items: { createMany: vi.fn() },
      billing_payments: { create: vi.fn() },
      lims_accessions: { create: vi.fn(), update: vi.fn() },
      lims_samples: { create: vi.fn() },
      lims_test_orders: { create: vi.fn(), update: vi.fn() },
      lims_results: { create: vi.fn(), update: vi.fn() },
      lims_reports: { create: vi.fn() },
      lims_report_delivery_logs: { create: vi.fn() },
      domain_events: { create: vi.fn(), update: vi.fn() },
    })),
    $disconnect: vi.fn(),
  };
}

export type MockPrisma = ReturnType<typeof createMockPrisma>;
