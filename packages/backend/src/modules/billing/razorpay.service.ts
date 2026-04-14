import crypto from 'crypto';
import Razorpay from 'razorpay';
import { prisma } from '../../config/database';
import { generateId } from '../../shared/utils/id-generator';
import { generateSequenceNumber } from '../../shared/utils/number-sequence';
import { emitDomainEvent } from '../../shared/events/event-emitter';
import { AppError, NotFoundError } from '../../shared/errors/app-error';
import { RequestContext } from '../../shared/types/request-context';

function getClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!key_id || !key_secret) {
    throw new AppError('RAZORPAY_NOT_CONFIGURED',
      `Razorpay credentials missing. KEY_ID length: ${key_id?.length || 0}, SECRET length: ${key_secret?.length || 0}`, 500);
  }
  // Don't cache — fresh client each time so env var changes take effect without restart
  return new Razorpay({ key_id, key_secret });
}

export const razorpayService = {
  /**
   * Creates a Razorpay order tied to a bill. Frontend uses this to open Razorpay Checkout.
   */
  async createOrder(ctx: RequestContext, billId: string, amount: number) {
    const bill = await prisma.billing_bills.findFirst({
      where: { id: billId, tenant_id: ctx.tenantId },
      include: { payments: { where: { status: 'SUCCESS' } } },
    });
    if (!bill) throw new NotFoundError('Bill', billId);
    if (bill.bill_status === 'PAID' || bill.bill_status === 'CANCELLED') {
      throw new AppError('BILL_INVALID_STATE', `Bill is ${bill.bill_status}`, 400);
    }

    const paid = bill.payments.reduce((s, p) => s + Number(p.amount), 0);
    const remaining = Number(bill.final_amount) - paid;
    if (amount > remaining + 0.01) {
      throw new AppError('AMOUNT_EXCEEDS_BALANCE', 'Amount exceeds remaining balance', 400, { remaining });
    }

    let client: Razorpay;
    try {
      client = getClient();
    } catch (e: any) {
      throw new AppError('RAZORPAY_NOT_CONFIGURED', e.message || 'Razorpay credentials missing', 400);
    }

    const receiptId = `rcpt_${bill.bill_number}_${Date.now()}`.slice(0, 40);

    let order: any;
    try {
      order = await client.orders.create({
        amount: Math.round(amount * 100),      // Razorpay expects paise
        currency: 'INR',
        receipt: receiptId,
        notes: {
          bill_id: bill.id,
          bill_number: bill.bill_number,
          tenant_id: ctx.tenantId,
          branch_id: bill.branch_id,
        },
      });
    } catch (e: any) {
      const msg = e?.error?.description || e?.message || 'Razorpay order creation failed';
      throw new AppError('RAZORPAY_ORDER_FAILED', msg, 400, { razorpay_error: e?.error || e?.message });
    }

    return {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key_id: process.env.RAZORPAY_KEY_ID,
      bill_id: bill.id,
      bill_number: bill.bill_number,
    };
  },

  /**
   * Verifies Razorpay payment signature and records the payment on the bill.
   * Signature: HMAC_SHA256(`${order_id}|${payment_id}`, KEY_SECRET)
   */
  async verifyAndRecord(ctx: RequestContext, data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    bill_id: string;
    mode: string; // 'UPI' | 'CARD' | 'NETBANKING' etc
  }) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new AppError('RAZORPAY_NOT_CONFIGURED', 'Razorpay not configured', 500);

    // Verify signature
    const body = `${data.razorpay_order_id}|${data.razorpay_payment_id}`;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (expected !== data.razorpay_signature) {
      throw new AppError('RAZORPAY_SIGNATURE_INVALID', 'Payment signature verification failed', 400);
    }

    // Fetch the payment details from Razorpay to get exact amount paid
    const client = getClient();
    const rzpPayment: any = await client.payments.fetch(data.razorpay_payment_id);
    const amountPaid = Number(rzpPayment.amount) / 100;

    const bill = await prisma.billing_bills.findFirst({
      where: { id: data.bill_id, tenant_id: ctx.tenantId },
      include: { payments: true },
    });
    if (!bill) throw new NotFoundError('Bill', data.bill_id);

    const totalPaid = bill.payments.filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + Number(p.amount), 0);
    const newTotalPaid = totalPaid + amountPaid;
    const isFullyPaid = newTotalPaid >= Number(bill.final_amount) - 0.01;

    const branch = await prisma.mdm_branches.findFirst({
      where: { id: bill.branch_id, tenant_id: ctx.tenantId },
    });
    const paymentRef = await generateSequenceNumber(
      ctx.tenantId, bill.branch_id, 'PAY', branch?.code || 'UNK'
    );

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.billing_payments.create({
        data: {
          id: generateId(),
          tenant_id: ctx.tenantId,
          branch_id: bill.branch_id,
          payment_reference: paymentRef,
          bill_id: bill.id,
          mode: data.mode || 'UPI',
          amount: amountPaid,
          gateway_txn_id: data.razorpay_payment_id,
          upi_rrn: rzpPayment.acquirer_data?.rrn || null,
          instrument_details: JSON.stringify({
            method: rzpPayment.method,
            order_id: data.razorpay_order_id,
            vpa: rzpPayment.vpa,
            bank: rzpPayment.bank,
            card_id: rzpPayment.card_id,
          }).slice(0, 500),
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

      return p;
    }, { timeout: 15000 });

    if (isFullyPaid) {
      await emitDomainEvent({
        tenantId: ctx.tenantId,
        eventType: 'BillConfirmed',
        aggregateType: 'Bill',
        aggregateId: bill.id,
        payload: { billId: bill.id, visitId: bill.visit_id, branchId: bill.branch_id, userId: ctx.userId },
      });
    }

    return {
      payment,
      bill_status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
      total_paid: newTotalPaid,
      remaining: Number(bill.final_amount) - newTotalPaid,
    };
  },
};
