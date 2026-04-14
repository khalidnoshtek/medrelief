import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { generateQrBuffer } from '../../shared/utils/qr-code';

const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'receipts');

export async function generateBillReceipt(bill: any): Promise<string> {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });

  const filePath = path.join(STORAGE_DIR, `${bill.id}.pdf`);
  const relativePath = `storage/receipts/${bill.id}.pdf`;

  // Generate QR buffer so it can be embedded
  const qrPayload = bill.qr_code || bill.id;
  const qrBuf = await generateQrBuffer(qrPayload);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [226, 820], margin: 10 }); // taller to fit QR + footer
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const w = 206;
    const drawLine = () => {
      doc.moveTo(10, doc.y).lineTo(w + 10, doc.y).stroke('#cccccc');
      doc.moveDown(0.3);
    };

    // Header
    doc.fontSize(12).font('Helvetica-Bold').text(bill.branch?.name || 'Medrelief', 10, doc.y, { width: w, align: 'center' });
    if (bill.branch?.address) {
      doc.fontSize(6).font('Helvetica').text(bill.branch.address, 10, doc.y, { width: w, align: 'center' });
    }
    if (bill.branch?.gstin) {
      doc.fontSize(6).text('GSTIN: ' + bill.branch.gstin, 10, doc.y, { width: w, align: 'center' });
    }
    doc.moveDown(0.5);
    drawLine();

    // Bill info
    doc.fontSize(9).font('Helvetica-Bold').text('TAX INVOICE', 10, doc.y, { width: w, align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(7).font('Helvetica');
    doc.text('Bill #: ' + bill.bill_number, 10);
    doc.text('Date: ' + new Date(bill.bill_date).toLocaleString('en-IN'), 10);
    doc.text('Patient: ' + (bill.visit?.patient?.full_name || '-'), 10);
    doc.text('Mobile: ' + (bill.visit?.patient?.mobile || '-'), 10);
    if (bill.visit?.referrer) {
      doc.text('Ref Dr: ' + bill.visit.referrer.name, 10);
    }
    doc.moveDown(0.3);
    drawLine();

    // Items header
    doc.fontSize(7).font('Helvetica-Bold');
    const colTest = 10;
    const colAmt = 170;
    doc.text('Test', colTest, doc.y);
    doc.text('Amt', colAmt, doc.y - doc.currentLineHeight(), { width: 36, align: 'right' });
    doc.moveDown(0.3);
    drawLine();

    // Items
    doc.font('Helvetica').fontSize(7);
    for (const item of bill.items || []) {
      const y = doc.y;
      doc.text(item.test?.name || '-', colTest, y, { width: 155 });
      doc.text(Number(item.final_amount).toFixed(0), colAmt, y, { width: 36, align: 'right' });
      doc.moveDown(0.2);
    }

    doc.moveDown(0.2);
    drawLine();

    // Totals
    doc.font('Helvetica').fontSize(7);
    doc.text('Gross: Rs.' + Number(bill.gross_amount).toFixed(0), 10);
    if (Number(bill.discount_amount) > 0) {
      doc.text('Discount: -Rs.' + Number(bill.discount_amount).toFixed(0), 10);
    }
    if (Number(bill.rounding_adjustment) !== 0) {
      doc.text('Rounding: Rs.' + Number(bill.rounding_adjustment).toFixed(0), 10);
    }
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('TOTAL: Rs.' + Number(bill.final_amount).toFixed(0), 10, doc.y, { width: w, align: 'center' });
    doc.moveDown(0.3);
    drawLine();

    // Payments
    doc.fontSize(7).font('Helvetica');
    for (const p of bill.payments || []) {
      doc.text(p.mode + ': Rs.' + Number(p.amount).toFixed(0), 10);
    }
    doc.moveDown(0.2);
    doc.text('Status: ' + bill.bill_status, 10);

    // QR code block
    doc.moveDown(0.5);
    drawLine();
    doc.moveDown(0.3);
    doc.fontSize(7).font('Helvetica-Bold').text('Scan to check status', 10, doc.y, { width: w, align: 'center' });
    doc.moveDown(0.3);
    try {
      const qrSize = 90;
      const qrY = doc.y;
      doc.image(qrBuf, (w - qrSize) / 2 + 10, qrY, { width: qrSize, height: qrSize });
      // Move cursor past the QR image
      doc.y = qrY + qrSize + 8;
    } catch {}
    doc.fontSize(6).font('Helvetica').text('Show this QR at the counter anytime', 10, doc.y, { width: w, align: 'center' });

    // Footer
    doc.moveDown(0.5);
    drawLine();
    doc.fontSize(6).text('Thank you for choosing Medrelief', 10, doc.y, { width: w, align: 'center' });
    doc.text('Computer-generated receipt', 10, doc.y, { width: w, align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(relativePath));
    stream.on('error', reject);
  });
}
