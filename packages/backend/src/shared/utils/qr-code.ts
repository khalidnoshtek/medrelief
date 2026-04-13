import QRCode from 'qrcode';

/**
 * Generates a QR code as a base64 PNG data URL.
 * The payload is typically a URL like `https://app/status?bill=<bill_id>`
 * or just the bill ID for offline lookup.
 */
export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    width: 200,
    margin: 1,
  });
}

export async function generateQrBuffer(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    errorCorrectionLevel: 'M',
    width: 200,
    margin: 1,
  });
}
