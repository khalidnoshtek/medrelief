import { Router, Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { billingService } from './billing.service';
import { createBillSchema, createPaymentSchema } from './dto/create-bill.dto';
import { AppError, NotFoundError } from '../../shared/errors/app-error';
import { requirePermission } from '../../shared/middleware/auth-middleware';
import { generateBillReceipt } from './bill-print';
import { generateQrDataUrl } from '../../shared/utils/qr-code';
import { prisma } from '../../config/database';
import { razorpayService } from './razorpay.service';

const router = Router();

// Preview prices (before bill creation)
router.post('/preview-prices', requirePermission('billing:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await billingService.previewPrices(req.ctx, {
      test_ids: req.body.test_ids || [],
      package_ids: req.body.package_ids || [],
      referrer_id: req.body.referrer_id,
      payer_type: req.body.payer_type,
      branch_id: req.body.branch_id || req.ctx.branchId,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/bills', requirePermission('billing:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createBillSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid input', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const bill = await billingService.createBill(req.ctx, parsed.data);
    res.status(201).json({ data: bill });
  } catch (err) {
    next(err);
  }
});

router.get('/bills', requirePermission('billing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await billingService.searchBills(req.ctx, {
      branchId: req.query.branch_id as string,
      status: req.query.status as string,
      date: req.query.date as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    });
    res.json({ data: result.bills, meta: { page: result.page, limit: result.limit, total: result.total } });
  } catch (err) {
    next(err);
  }
});

router.get('/bills/:id', requirePermission('billing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bill = await billingService.getBill(req.ctx, req.params.id);
    res.json({ data: bill });
  } catch (err) {
    next(err);
  }
});

// Cancel bill (before accession only)
router.post('/bills/:id/cancel', requirePermission('billing:update'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bill = await billingService.cancelBill(req.ctx, req.params.id, req.body.reason_code);
    res.json({ data: bill });
  } catch (err) {
    next(err);
  }
});

router.post('/payments', requirePermission('payment:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid input', 400, {
        errors: parsed.error.flatten().fieldErrors,
      });
    }
    const result = await billingService.recordPayment(req.ctx, parsed.data);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// Credit note / refund
router.post('/adjustments', requirePermission('billing:approve-adjustment'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bill_id, type, amount, reason_code, remarks } = req.body;
    if (!bill_id || !type || !amount || !reason_code) {
      throw new AppError('VALIDATION_ERROR', 'bill_id, type, amount, and reason_code are required', 400);
    }
    const adj = await billingService.createAdjustment(req.ctx, { bill_id, type, amount, reason_code, remarks });
    res.status(201).json({ data: adj });
  } catch (err) {
    next(err);
  }
});

// Get QR code image (data URL) for a bill
router.get('/bills/:id/qr', requirePermission('billing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bill = await billingService.getBill(req.ctx, req.params.id);
    const payload = bill.qr_code || bill.id;
    const qrDataUrl = await generateQrDataUrl(payload);
    res.json({ data: { bill_id: bill.id, bill_number: bill.bill_number, qr_payload: payload, qr_data_url: qrDataUrl } });
  } catch (err) { next(err); }
});

// Lookup bill by QR payload (for status scan)
router.get('/bills/by-qr/:payload', requirePermission('billing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bill = await prisma.billing_bills.findFirst({
      where: { tenant_id: req.ctx.tenantId, OR: [{ qr_code: req.params.payload }, { id: req.params.payload }] },
      include: {
        items: { include: { test: true } },
        payments: true,
        visit: { include: { patient: true, referrer: true } },
        accession: { include: { test_orders: { include: { test: true, result: true } } } },
      },
    });
    if (!bill) { res.status(404).json({ error_code: 'BILL_NOT_FOUND', message: 'No bill found for this QR' }); return; }
    res.json({ data: bill });
  } catch (err) { next(err); }
});

// Bill receipt PDF
router.get('/bills/:id/print', requirePermission('billing:read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bill = await billingService.getBill(req.ctx, req.params.id);
    // Include branch info for the receipt
    const pdfPath = await generateBillReceipt(bill);
    const fullPath = path.resolve(process.cwd(), pdfPath);
    if (!fs.existsSync(fullPath)) throw new NotFoundError('Receipt PDF', req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${bill.bill_number}-receipt.pdf"`);
    res.sendFile(fullPath);
  } catch (err) { next(err); }
});

// UPI QR stub
router.post('/upi/generate-qr', requirePermission('payment:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, bill_id } = req.body;
    const upiId = 'medrelief@upi';
    const upiLink = `upi://pay?pa=${upiId}&pn=Medrelief&am=${amount}&cu=INR&tn=Bill-${bill_id}`;
    res.json({ data: { upi_link: upiLink, upi_id: upiId, amount } });
  } catch (err) { next(err); }
});

// Debug: check razorpay config (temporary — remove after deploy is confirmed)
router.get('/razorpay/debug', requirePermission('payment:create'), async (_req: Request, res: Response) => {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || '';
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim() || '';
  res.json({
    key_id_set: !!keyId,
    key_id_length: keyId.length,
    key_id_prefix: keyId.substring(0, 8) + '...',
    secret_set: !!secret,
    secret_length: secret.length,
  });
});

// Razorpay — create order
router.post('/razorpay/order', requirePermission('payment:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { bill_id, amount } = req.body;
    if (!bill_id || !amount) {
      res.status(400).json({ error_code: 'VALIDATION_ERROR', message: 'bill_id and amount required' });
      return;
    }
    const order = await razorpayService.createOrder(req.ctx, bill_id, Number(amount));
    res.json({ data: order });
  } catch (err) { next(err); }
});

// Razorpay — verify payment signature and record
router.post('/razorpay/verify', requirePermission('payment:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bill_id, mode } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bill_id) {
      res.status(400).json({ error_code: 'VALIDATION_ERROR', message: 'Missing required fields' });
      return;
    }
    const result = await razorpayService.verifyAndRecord(req.ctx, {
      razorpay_order_id, razorpay_payment_id, razorpay_signature, bill_id, mode: mode || 'UPI',
    });
    res.json({ data: result });
  } catch (err) { next(err); }
});

export const billingRoutes = router;
