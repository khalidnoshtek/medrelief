/**
 * WhatsApp dispatch stub for prototype.
 * Logs the dispatch attempt and returns success.
 * Replace with actual WhatsApp Business API integration in production.
 */
export async function dispatchWhatsApp(params: {
  to: string;
  patientName: string;
  reportNumber: string;
  pdfPath: string;
}): Promise<{ success: boolean; note: string }> {
  console.log(
    `[WhatsApp STUB] Would send report ${params.reportNumber} to ${params.to} (${params.patientName})`
  );
  console.log(`[WhatsApp STUB] PDF: ${params.pdfPath}`);

  // Simulate a small delay as if calling an external API
  await new Promise((r) => setTimeout(r, 100));

  return {
    success: true,
    note: 'Simulated — WhatsApp Business API not configured',
  };
}
