import { registerEventHandler } from './event-emitter';
import { accessionService } from '../../modules/lims/accession/accession.service';
import { reportingService } from '../../modules/reporting/reporting.service';

export function registerAllEventHandlers() {
  // BillConfirmed -> auto-create accession with samples and test orders
  registerEventHandler('BillConfirmed', async (event) => {
    const { billId, userId } = event.payload as { billId: string; userId: string };
    console.log(`[Event] BillConfirmed: creating accession for bill ${billId}`);
    const result = await accessionService.createAccessionFromBill(billId, userId);
    console.log(`[Event] Accession created: ${result.accessionNumber}`);
  });

  // ResultSignedOff -> check if all results done, generate report
  registerEventHandler('ResultSignedOff', async (event) => {
    const { accessionId, userId } = event.payload as { accessionId: string; userId: string };
    console.log(`[Event] ResultSignedOff: checking accession ${accessionId} for report generation`);
    const report = await reportingService.tryGenerateReport(accessionId, userId);
    if (report) {
      console.log(`[Event] Report generated: ${report.report_number}`);
    }
  });

  console.log('Domain event handlers registered');
}
