import { prisma } from '../../config/database';

/**
 * Generates a sequential number for bills, accessions, visits, etc.
 * Format: {PREFIX}-{BRANCH_CODE}-{YYYYMMDD}-{NNNN}
 * Uses SELECT FOR UPDATE to ensure uniqueness under concurrency.
 */
export async function generateSequenceNumber(
  tenantId: string,
  branchId: string,
  prefix: string,
  branchCode: string,
  date: Date = new Date()
): Promise<string> {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

  // Use raw query for atomic increment with UPSERT
  // Note: "current_date" is a PostgreSQL reserved keyword, must be quoted
  const result = await prisma.$queryRaw<Array<{ last_value: number }>>`
    INSERT INTO number_sequences (id, tenant_id, branch_id, prefix, "current_date", last_value)
    VALUES (gen_random_uuid(), ${tenantId}, ${branchId}, ${prefix}, ${dateStr}, 1)
    ON CONFLICT (tenant_id, branch_id, prefix, "current_date")
    DO UPDATE SET last_value = number_sequences.last_value + 1
    RETURNING last_value
  `;

  const seq = result[0].last_value;
  return `${prefix}-${branchCode}-${dateStr}-${String(seq).padStart(4, '0')}`;
}
