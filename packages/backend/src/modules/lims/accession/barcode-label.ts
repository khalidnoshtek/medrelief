import PDFDocument from 'pdfkit';
import bwipjs from 'bwip-js';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'labels');

async function generateBarcodePng(text: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: 'code128',
    text,
    scale: 2,
    height: 8,
    includetext: false,
  });
}

export async function generateBarcodeLabel(accession: any): Promise<string> {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });

  const filePath = path.join(STORAGE_DIR, `${accession.id}.pdf`);
  const relativePath = `storage/labels/${accession.id}.pdf`;

  const samples = accession.samples || [];
  const patient = accession.visit?.patient;
  const date = new Date(accession.accessioned_at || accession.created_at).toLocaleDateString('en-IN');

  // Pre-generate barcode images
  const barcodeBuffers = new Map<string, Buffer>();
  for (const sample of samples) {
    try {
      const buf = await generateBarcodePng(accession.accession_number);
      barcodeBuffers.set(sample.id, buf);
    } catch {
      // Skip barcode if generation fails
    }
  }

  return new Promise((resolve, reject) => {
    const labelW = 170;
    const labelH = 85;
    const pageH = labelH * Math.max(samples.length, 1) + 10;

    const doc = new PDFDocument({ size: [labelW, pageH], margin: 5 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      const y = i * labelH + 5;

      // Border
      doc.rect(3, y, labelW - 6, labelH - 4).stroke('#aaaaaa');

      // Accession number text
      doc.fontSize(8).font('Courier-Bold').text(accession.accession_number, 7, y + 3, { width: labelW - 14 });

      // Barcode image
      const barcodeBuf = barcodeBuffers.get(sample.id);
      if (barcodeBuf) {
        doc.image(barcodeBuf, 7, y + 14, { width: labelW - 20, height: 22 });
      }

      // Sample code
      doc.fontSize(7).font('Courier').text(sample.sample_code, 7, y + 39, { width: labelW - 14 });

      // Patient name
      const name = (patient?.full_name || '-').substring(0, 24);
      doc.fontSize(6).font('Helvetica').text(name, 7, y + 50);

      // Sample type + date
      doc.fontSize(6).text(sample.sample_type + ' | ' + date, 7, y + 59);

      // Accession number below barcode (human-readable)
      doc.fontSize(5).font('Courier').text(accession.accession_number, 7, y + 68, { width: labelW - 14, align: 'center' });
    }

    if (samples.length === 0) {
      doc.fontSize(8).font('Helvetica').text('No samples', 8, 10);
    }

    doc.end();
    stream.on('finish', () => resolve(relativePath));
    stream.on('error', reject);
  });
}
