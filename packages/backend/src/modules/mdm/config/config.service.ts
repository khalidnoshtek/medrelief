import { prisma } from '../../../config/database';
import { generateId } from '../../../shared/utils/id-generator';
import { RequestContext } from '../../../shared/types/request-context';

// Default config values (code defaults per PRD)
const DEFAULTS: Record<string, string> = {
  'discount.max_percent': '50',
  'discount.requires_approval_above': '20',
  'rounding.nearest': '10',
  'payment.modes_allowed': '["CASH","UPI","CARD","NEFT","CHEQUE"]',
  'report.retention_days': '730',
  'report.signed_url_expiry_hours': '72',
  'alerts.payment_failure_spike_count': '10',
  'alerts.payment_failure_spike_window_minutes': '15',
  'alerts.whatsapp_failure_rate_percent': '25',
  'alerts.reconciliation_variance_amount': '500',
};

export const configService = {
  /**
   * Get a config value. Resolution: branch config → tenant config → code default.
   */
  async get(tenantId: string, branchId: string | null, key: string): Promise<string> {
    // Try branch-level first
    if (branchId) {
      const branchConfig = await prisma.config_settings.findFirst({
        where: { tenant_id: tenantId, branch_id: branchId, key },
      });
      if (branchConfig) return branchConfig.value;
    }

    // Try tenant-level
    const tenantConfig = await prisma.config_settings.findFirst({
      where: { tenant_id: tenantId, branch_id: null, key },
    });
    if (tenantConfig) return tenantConfig.value;

    // Code default
    return DEFAULTS[key] || '';
  },

  async getAll(ctx: RequestContext) {
    const configs = await prisma.config_settings.findMany({
      where: { tenant_id: ctx.tenantId },
      orderBy: { key: 'asc' },
    });

    // Merge with defaults
    const result: Record<string, { value: string; source: string; branch_id?: string | null }> = {};

    // Start with defaults
    for (const [key, value] of Object.entries(DEFAULTS)) {
      result[key] = { value, source: 'default' };
    }

    // Override with DB values
    for (const c of configs) {
      const isMyBranch = c.branch_id === ctx.branchId;
      const existing = result[c.key];
      if (!existing || c.branch_id === null || isMyBranch) {
        result[c.key] = {
          value: c.value,
          source: c.branch_id ? 'branch' : 'tenant',
          branch_id: c.branch_id,
        };
      }
    }

    return result;
  },

  async set(ctx: RequestContext, key: string, value: string, branchId?: string | null) {
    const bid = branchId ?? null;

    const existing = await prisma.config_settings.findFirst({
      where: { tenant_id: ctx.tenantId, branch_id: bid, key },
    });

    if (existing) {
      return prisma.config_settings.update({
        where: { id: existing.id },
        data: { value, updated_by: ctx.userId },
      });
    }

    return prisma.config_settings.create({
      data: {
        id: generateId(),
        tenant_id: ctx.tenantId,
        branch_id: bid,
        key,
        value,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
    });
  },
};
