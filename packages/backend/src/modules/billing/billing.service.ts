import { prisma } from '../../config/database';
import { generateId } from '../../shared/utils/id-generator';
import { generateSequenceNumber } from '../../shared/utils/number-sequence';
import { roundToNearest } from '../../shared/utils/rounding';
import { resolveTestPrices } from '../mdm/rate-plan/rate-plan-resolver';
import { visitService } from '../lims/visit/visit.service';
import { emitDomainEvent } from '../../shared/events/event-emitter';
import { AppError, NotFoundError } from '../../shared/errors/app-error';
import { RequestContext } from '../../shared/types/request-context';
import { CreateBillDto, CreatePaymentDto } from './dto/create-bill.dto';

export const billingService = {
  async createBill(ctx: RequestContext, dto: CreateBillDto) {
    // 1. Create visit
    const visit = await visitService.createVisit(ctx, {
      patientId: dto.patient_id,
      branchId: dto.branch_id,
      visitType: dto.visit_type,
      payerType: dto.payer_type,
      referrerId: dto.referrer_id,
    });

    // 2. Expand packages into child tests
    const allTestEntries: Array<{ test_id: string; quantity: number; package_id?: string; parent_item_id?: string }> = [];

    // Individual tests
    for (const t of dto.tests) {
      allTestEntries.push({ test_id: t.test_id, quantity: t.quantity });
    }

    // Package tests — expand each package into its child tests
    const packageItems: Array<{ package_id: string; package_name: string; child_test_ids: string[] }> = [];
    for (const pkg of dto.packages || []) {
      const dbPkg = await prisma.mdm_packages.findFirst({
        where: { id: pkg.package_id, tenant_id: ctx.tenantId, active: true },
        include: { package_tests: { where: { active: true }, include: { test: true } } },
      });
      if (!dbPkg) throw new AppError('BILLING_PACKAGE_NOT_FOUND', `Package not found: ${pkg.package_id}`, 400);
      const childTestIds = dbPkg.package_tests.map((pt) => pt.test_id);
      packageItems.push({ package_id: dbPkg.id, package_name: dbPkg.name, child_test_ids: childTestIds });
      for (const testId of childTestIds) {
        allTestEntries.push({ test_id: testId, quantity: 1, package_id: dbPkg.id });
      }
    }

    // 3. Resolve prices via rate plan for all tests
    const allTestIds = allTestEntries.map((t) => t.test_id);
    const uniqueTestIds = [...new Set(allTestIds)];
    const prices = await resolveTestPrices({
      testIds: uniqueTestIds,
      billDateTime: new Date(),
      explicitPlanId: dto.explicit_rate_plan_id,
      referrerId: dto.referrer_id || undefined,
      payerType: dto.payer_type,
      branchId: dto.branch_id,
      tenantId: ctx.tenantId,
    });

    // 4. Build bill items
    const billId = generateId();
    let grossAmount = 0;
    let discountAmount = 0;
    const items: Array<any> = [];

    // Create package parent items first (billing_visible=true, amount = sum of children)
    const packageParentIds = new Map<string, string>(); // package_id -> parent_bill_item_id
    for (const pkg of packageItems) {
      const parentId = generateId();
      packageParentIds.set(pkg.package_id, parentId);
      // Parent item will be updated with totals after children are calculated
    }

    // Build individual test items and package child items
    // Note: resolved.price IS the final rate-plan price (already discounted from MRP).
    // resolved.discountPercent is informational only (the discount vs MRP).
    // Only manual_discount_percent (receptionist-entered) should reduce the price further.
    for (const entry of allTestEntries) {
      const resolved = prices.get(entry.test_id)!;
      const mrp = resolved.price * entry.quantity;
      let lineDiscount = 0;

      // Only apply manual discount (if any) — rate plan discount is already baked into resolved.price
      if (dto.manual_discount_percent) {
        lineDiscount = mrp * (dto.manual_discount_percent / 100);
      }

      lineDiscount = Math.round(lineDiscount * 100) / 100;
      const finalAmount = mrp - lineDiscount;

      grossAmount += mrp;
      discountAmount += lineDiscount;

      items.push({
        id: generateId(),
        tenant_id: ctx.tenantId,
        bill_id: billId,
        test_id: entry.test_id,
        item_type: entry.package_id ? 'PACKAGE' : 'TEST',
        parent_bill_item_id: entry.package_id ? packageParentIds.get(entry.package_id) : null,
        billing_visible: !entry.package_id, // child items hidden, parent visible
        package_id: entry.package_id || null,
        quantity: entry.quantity,
        mrp_amount: mrp,
        rate_plan_id: resolved.ratePlanId,
        line_discount_amount: lineDiscount,
        final_amount: finalAmount,
        created_by: ctx.userId,
        updated_by: ctx.userId,
      });
    }

    // 4. Compute totals
    const netAmount = grossAmount - discountAmount;
    const taxAmount = 0; // GST exempt for diagnostic labs
    const { rounded: finalAmount, adjustment: roundingAdj } = roundToNearest(netAmount + taxAmount);

    // 5. Generate bill number
    const branch = await prisma.mdm_branches.findFirst({
      where: { id: dto.branch_id, tenant_id: ctx.tenantId },
    });
    const billNumber = await generateSequenceNumber(
      ctx.tenantId, dto.branch_id, 'BILL', branch?.code || 'UNK'
    );

    // 6. Create bill + items in transaction
    const bill = await prisma.$transaction(async (tx) => {
      const bill = await tx.billing_bills.create({
        data: {
          id: billId,
          tenant_id: ctx.tenantId,
          branch_id: dto.branch_id,
          bill_number: billNumber,
          visit_id: visit.id,
          gross_amount: grossAmount,
          discount_amount: discountAmount,
          net_amount: netAmount,
          tax_amount: taxAmount,
          rounding_adjustment: roundingAdj,
          final_amount: finalAmount,
          bill_status: 'PENDING_PAYMENT',
          payment_status: 'UNPAID',
          payer_type: dto.payer_type,
          referrer_id: dto.referrer_id || null,
          discount_reason_code: dto.discount_reason_code || null,
          qr_code: billId, // simple payload = bill id for status lookup
          created_by: ctx.userId,
          updated_by: ctx.userId,
        },
      });

      await tx.billing_bill_items.createMany({ data: items });

      return bill;
    });

    return {
      ...bill,
      items,
      visit_number: visit.visit_number,
    };
  },

  async getBill(ctx: RequestContext, billId: string) {
    const bill = await prisma.billing_bills.findFirst({
      where: { id: billId, tenant_id: ctx.tenantId },
      include: {
        items: { include: { test: true } },
        payments: true,
        visit: { include: { patient: true, referrer: true } },
        accession: true,
      },
    });
    if (!bill) throw new NotFoundError('Bill', billId);
    return bill;
  },

  async searchBills(ctx: RequestContext, filters: {
    branchId?: string;
    status?: string;
    date?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const where: any = { tenant_id: ctx.tenantId };
    if (filters.branchId) where.branch_id = filters.branchId;
    if (filters.status) where.bill_status = filters.status;
    if (filters.date) {
      const d = new Date(filters.date);
      where.bill_date = {
        gte: d,
        lt: new Date(d.getTime() + 86400000),
      };
    }

    const [bills, total] = await Promise.all([
      prisma.billing_bills.findMany({
        where,
        include: {
          visit: { include: { patient: true } },
          items: { include: { test: true } },
        },
        orderBy: { bill_date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.billing_bills.count({ where }),
    ]);

    return { bills, total, page, limit };
  },

  async recordPayment(ctx: RequestContext, dto: CreatePaymentDto) {
    const bill = await prisma.billing_bills.findFirst({
      where: { id: dto.bill_id, tenant_id: ctx.tenantId },
      include: { payments: true },
    });

    if (!bill) throw new NotFoundError('Bill', dto.bill_id);

    if (bill.bill_status === 'CANCELLED' || bill.bill_status === 'REFUNDED') {
      throw new AppError('BILL_INVALID_STATE', 'Cannot accept payment for this bill', 400, {
        bill_id: bill.id,
        current_status: bill.bill_status,
      });
    }

    // Calculate total already paid
    const totalPaid = bill.payments
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const remaining = Number(bill.final_amount) - totalPaid;

    if (dto.amount > remaining + 0.01) { // small tolerance for rounding
      throw new AppError('PAYMENT_EXCEEDS_BALANCE', 'Payment amount exceeds remaining balance', 400, {
        remaining,
        attempted: dto.amount,
      });
    }

    // Generate payment reference
    const branch = await prisma.mdm_branches.findFirst({
      where: { id: bill.branch_id, tenant_id: ctx.tenantId },
    });
    const paymentRef = await generateSequenceNumber(
      ctx.tenantId, bill.branch_id, 'PAY', branch?.code || 'UNK'
    );

    const newTotalPaid = totalPaid + dto.amount;
    const isFullyPaid = newTotalPaid >= Number(bill.final_amount) - 0.01;

    // Create payment and update bill in transaction
    const payment = await prisma.$transaction(async (tx) => {
      const payment = await tx.billing_payments.create({
        data: {
          id: generateId(),
          tenant_id: ctx.tenantId,
          branch_id: bill.branch_id,
          payment_reference: paymentRef,
          bill_id: bill.id,
          mode: dto.mode,
          amount: dto.amount,
          upi_rrn: dto.upi_rrn || null,
          instrument_details: dto.instrument_details || null,
          status: 'SUCCESS',
          created_by: ctx.userId,
          updated_by: ctx.userId,
        },
      });

      await tx.billing_bills.update({
        where: { id: bill.id },
        data: {
          payment_status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
          bill_status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
          version: { increment: 1 },
          updated_by: ctx.userId,
        },
      });

      return payment;
    });

    // Emit BillConfirmed event if fully paid
    if (isFullyPaid) {
      await emitDomainEvent({
        tenantId: ctx.tenantId,
        eventType: 'BillConfirmed',
        aggregateType: 'Bill',
        aggregateId: bill.id,
        payload: {
          billId: bill.id,
          visitId: bill.visit_id,
          branchId: bill.branch_id,
          userId: ctx.userId,
        },
      });
    }

    return {
      payment,
      bill_status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
      payment_status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
      total_paid: newTotalPaid,
      remaining: Number(bill.final_amount) - newTotalPaid,
    };
  },

  async cancelBill(ctx: RequestContext, billId: string, reasonCode: string) {
    const bill = await prisma.billing_bills.findFirst({
      where: { id: billId, tenant_id: ctx.tenantId },
    });
    if (!bill) throw new NotFoundError('Bill', billId);

    // Can only cancel before accession (DRAFT or PENDING_PAYMENT)
    if (!['DRAFT', 'PENDING_PAYMENT'].includes(bill.bill_status)) {
      throw new AppError('BILL_CANNOT_CANCEL', 'Bill can only be cancelled before accession. Use credit note/refund for confirmed bills.', 400, {
        bill_id: billId,
        current_status: bill.bill_status,
      });
    }

    if (!reasonCode) {
      throw new AppError('VALIDATION_ERROR', 'Cancellation reason code is required', 400);
    }

    return prisma.billing_bills.update({
      where: { id: billId },
      data: {
        bill_status: 'CANCELLED',
        discount_reason_code: reasonCode,
        version: { increment: 1 },
        updated_by: ctx.userId,
      },
    });
  },

  async createAdjustment(ctx: RequestContext, dto: {
    bill_id: string;
    type: 'CREDIT_NOTE' | 'REFUND';
    amount: number;
    reason_code: string;
    remarks?: string;
  }) {
    const bill = await prisma.billing_bills.findFirst({
      where: { id: dto.bill_id, tenant_id: ctx.tenantId },
    });
    if (!bill) throw new NotFoundError('Bill', dto.bill_id);

    if (bill.bill_status !== 'PAID') {
      throw new AppError('BILL_INVALID_STATE', 'Adjustments can only be created for PAID bills', 400, {
        current_status: bill.bill_status,
      });
    }

    if (dto.amount <= 0 || dto.amount > Number(bill.final_amount)) {
      throw new AppError('ADJUSTMENT_INVALID_AMOUNT', 'Amount must be positive and not exceed bill total', 400);
    }

    const branch = await prisma.mdm_branches.findFirst({
      where: { id: bill.branch_id, tenant_id: ctx.tenantId },
    });
    const adjNumber = await generateSequenceNumber(
      ctx.tenantId, bill.branch_id, 'ADJ', branch?.code || 'UNK'
    );

    return prisma.billing_adjustments.create({
      data: {
        id: generateId(),
        tenant_id: ctx.tenantId,
        branch_id: bill.branch_id,
        bill_id: dto.bill_id,
        adjustment_number: adjNumber,
        type: dto.type,
        amount: dto.amount,
        reason_code: dto.reason_code,
        remarks: dto.remarks || null,
        status: 'DRAFT',
        created_by: ctx.userId,
        updated_by: ctx.userId,
      },
    });
  },

  async previewPrices(ctx: RequestContext, dto: {
    test_ids: string[];
    package_ids?: string[];
    referrer_id?: string;
    payer_type?: string;
    branch_id: string;
  }) {
    // Expand packages
    const allTestIds = [...dto.test_ids];
    const packageDetails: Array<{ id: string; name: string; tests: string[] }> = [];

    for (const pkgId of dto.package_ids || []) {
      const pkg = await prisma.mdm_packages.findFirst({
        where: { id: pkgId, tenant_id: ctx.tenantId, active: true },
        include: { package_tests: { where: { active: true } } },
      });
      if (pkg) {
        const childIds = pkg.package_tests.map((pt) => pt.test_id);
        packageDetails.push({ id: pkg.id, name: pkg.name, tests: childIds });
        allTestIds.push(...childIds);
      }
    }

    const uniqueTestIds = [...new Set(allTestIds)];

    const prices = await resolveTestPrices({
      testIds: uniqueTestIds,
      billDateTime: new Date(),
      referrerId: dto.referrer_id || undefined,
      payerType: dto.payer_type,
      branchId: dto.branch_id,
      tenantId: ctx.tenantId,
    });

    // Build response with resolved prices
    const testPrices = uniqueTestIds.map((id) => {
      const resolved = prices.get(id);
      return {
        test_id: id,
        price: resolved?.price || 0,
        discount_percent: resolved?.discountPercent || 0,
        rate_plan_name: resolved?.ratePlanName || 'Unknown',
        rate_plan_id: resolved?.ratePlanId || null,
      };
    });

    return { test_prices: testPrices, packages: packageDetails };
  },
};
