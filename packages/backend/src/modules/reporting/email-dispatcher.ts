import nodemailer from 'nodemailer';
import path from 'path';

let cachedTransporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    // Use configured SMTP
    cachedTransporter = nodemailer.createTransport({
      host,
      port: port ? parseInt(port) : 587,
      secure: port === '465',
      auth: { user, pass },
    });
  } else {
    // Auto-create Ethereal test account (free, no signup)
    const testAccount = await nodemailer.createTestAccount();
    console.log('[Email] Using Ethereal test account:', testAccount.user);
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  return cachedTransporter;
}

export async function dispatchEmail(params: {
  to: string;
  patientName: string;
  reportNumber: string;
  pdfPath: string;
}): Promise<{ success: boolean; messageId?: string; previewUrl?: string; error?: string }> {
  try {
    const transporter = await getTransporter();
    const fullPath = path.resolve(process.cwd(), params.pdfPath);

    const info = await transporter.sendMail({
      from: '"Medrelief Diagnostics" <reports@medrelief.in>',
      to: params.to,
      subject: `Lab Report Ready - ${params.reportNumber}`,
      text: `Dear ${params.patientName},\n\nYour lab report (${params.reportNumber}) is ready. Please find the report attached.\n\nRegards,\nMedrelief Diagnostics`,
      html: `
        <p>Dear ${params.patientName},</p>
        <p>Your lab report (<strong>${params.reportNumber}</strong>) is ready. Please find the report attached.</p>
        <p>Regards,<br/>Medrelief Diagnostics</p>
      `,
      attachments: [
        {
          filename: `${params.reportNumber}.pdf`,
          path: fullPath,
          contentType: 'application/pdf',
        },
      ],
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[Email] Preview URL: ${previewUrl}`);
    }
    console.log(`[Email] Sent to ${params.to}, messageId: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    };
  } catch (err: any) {
    console.error(`[Email] Failed to send to ${params.to}:`, err.message);
    // Reset transporter on auth failure so next attempt creates a new one
    if (err.code === 'EAUTH' || err.code === 'ESOCKET') {
      cachedTransporter = null;
    }
    return { success: false, error: err.message };
  }
}
