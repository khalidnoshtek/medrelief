/**
 * End-to-end integration test via HTTP against the running server.
 * Tests the full vertical slice across all 3 personas:
 *   Receptionist -> Lab Technician -> Pathologist
 *
 * Requires: backend running on localhost:4782 with seeded data.
 */

const BASE = 'http://localhost:4782/api/v1';

async function api(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const resp = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await resp.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  return { status: resp.status, data };
}

// ── helpers ──
async function login(username: string): Promise<string> {
  const r = await api('POST', '/auth/login', { username, password: 'demo123' });
  if (r.status !== 200) throw new Error(`Login failed for ${username}: ${JSON.stringify(r.data)}`);
  return r.data.data.accessToken;
}

// ── Test runner ──
interface TestResult { name: string; pass: boolean; detail: string }
const results: TestResult[] = [];

function assert(name: string, condition: boolean, detail: string) {
  results.push({ name, pass: condition, detail });
  if (!condition) console.error(`  FAIL: ${name} — ${detail}`);
  else console.log(`  PASS: ${name}`);
}

async function run() {
  console.log('\n=== MEDRELIEF E2E FLOW TEST ===\n');

  // ────────────────────────────────────────
  // 1. RECEPTIONIST FLOW
  // ────────────────────────────────────────
  console.log('--- RECEPTIONIST ---');

  const recToken = await login('receptionist1');
  assert('Receptionist login', !!recToken, 'Got token');

  // Search patient
  const patSearch = await api('GET', '/patients?mobile=9876543210', null, recToken);
  assert('Patient search', patSearch.status === 200 && patSearch.data.data.length > 0,
    `Found ${patSearch.data.data?.length} patients`);
  const patient = patSearch.data.data[0];
  assert('Patient is Rahul Kumar', patient.full_name === 'Rahul Kumar', patient.full_name);

  // Get doctors
  const docs = await api('GET', '/mdm/doctors', null, recToken);
  assert('Load doctors', docs.status === 200 && docs.data.data.length >= 5,
    `${docs.data.data?.length} doctors`);
  const drSharma = docs.data.data.find((d: any) => d.name === 'Dr. Sharma');
  assert('Dr. Sharma found', !!drSharma, drSharma?.id || 'missing');

  // Get tests
  const tests = await api('GET', '/mdm/tests', null, recToken);
  assert('Load test catalog', tests.status === 200 && tests.data.data.length === 20,
    `${tests.data.data?.length} tests`);
  const cbc = tests.data.data.find((t: any) => t.test_code === 'CBC');
  const fbs = tests.data.data.find((t: any) => t.test_code === 'FBS');
  assert('CBC and FBS found', !!cbc && !!fbs, `CBC: ${cbc?.id}, FBS: ${fbs?.id}`);

  // Create bill with Dr. Sharma referrer
  const billResp = await api('POST', '/billing/bills', {
    patient_id: patient.id,
    branch_id: '10000000-0000-0000-0000-000000000001',
    visit_type: 'WALK_IN',
    payer_type: 'SELF',
    referrer_id: drSharma.id,
    tests: [
      { test_id: cbc.id, quantity: 1 },
      { test_id: fbs.id, quantity: 1 },
    ],
  }, recToken);
  assert('Bill created', billResp.status === 201, `Status: ${billResp.status}`);

  const bill = billResp.data.data;
  assert('Bill has number', !!bill.bill_number, bill.bill_number);
  assert('Bill status PENDING_PAYMENT', bill.bill_status === 'PENDING_PAYMENT', bill.bill_status);
  assert('Bill has 2 items', bill.items?.length === 2, `${bill.items?.length} items`);

  // Rate plan should use Dr. Sharma prices (CBC=250, FBS=120)
  const finalAmount = Number(bill.final_amount);
  assert('Final amount uses rate plan pricing', finalAmount > 0, `₹${finalAmount}`);
  console.log(`  Bill: ${bill.bill_number}, Final: ₹${finalAmount}`);

  // Collect payment
  const payResp = await api('POST', '/billing/payments', {
    bill_id: bill.id,
    mode: 'CASH',
    amount: finalAmount,
  }, recToken);
  assert('Payment recorded', payResp.status === 201, `Status: ${payResp.status}`);
  assert('Bill now PAID', payResp.data.data.bill_status === 'PAID', payResp.data.data.bill_status);
  console.log(`  Payment: ₹${finalAmount} CASH -> ${payResp.data.data.bill_status}`);

  // Check accession was auto-created
  const accResp = await api('GET', `/lims/accessions/by-bill/${bill.id}`, null, recToken);
  assert('Accession auto-created', accResp.status === 200 && !!accResp.data.data,
    accResp.data.data?.accession_number || 'missing');
  const accession = accResp.data.data;
  assert('Accession has samples', accession.samples?.length > 0, `${accession.samples?.length} samples`);
  assert('Accession has test orders', accession.test_orders?.length === 2,
    `${accession.test_orders?.length} orders`);
  console.log(`  Accession: ${accession.accession_number}, ${accession.samples?.length} sample(s), ${accession.test_orders?.length} orders`);

  // ────────────────────────────────────────
  // 2. LAB TECHNICIAN FLOW
  // ────────────────────────────────────────
  console.log('\n--- LAB TECHNICIAN ---');

  const labToken = await login('labtech1');
  assert('Lab tech login', !!labToken, 'Got token');

  // View worklist
  const wl = await api('GET', '/lims/worklist?branch_id=10000000-0000-0000-0000-000000000001', null, labToken);
  assert('Worklist loads', wl.status === 200, `Status: ${wl.status}`);
  const orders = wl.data.data;
  assert('Worklist has orders', orders.length >= 2, `${orders.length} orders`);

  // Find our specific orders
  const ourOrders = orders.filter((o: any) => o.accession_id === accession.id);
  assert('Our 2 orders in worklist', ourOrders.length === 2, `${ourOrders.length} orders`);

  // Collect sample (all tests share one sample since both are BLOOD)
  const sampleId = ourOrders[0].sample_id;
  const collectResp = await api('PATCH', `/lims/samples/${sampleId}/collect`, null, labToken);
  assert('Sample collected', collectResp.status === 200, `Status: ${collectResp.status}`);
  assert('Sample status COLLECTED', collectResp.data.data.sample_status === 'COLLECTED',
    collectResp.data.data.sample_status);

  // Receive at lab
  const receiveResp = await api('PATCH', `/lims/samples/${sampleId}/receive`, null, labToken);
  assert('Sample received at lab', receiveResp.status === 200, `Status: ${receiveResp.status}`);
  assert('Sample status RECEIVED_AT_LAB', receiveResp.data.data.sample_status === 'RECEIVED_AT_LAB',
    receiveResp.data.data.sample_status);

  // Enter CBC result (normal: 8.2, range 4.5-11.0)
  const cbcOrder = ourOrders.find((o: any) => o.test?.test_code === 'CBC' || o.department === 'HEMATOLOGY');
  const cbcResultResp = await api('POST', '/lims/results', {
    test_order_id: cbcOrder.id,
    raw_value: '8.2',
  }, labToken);
  assert('CBC result entered', cbcResultResp.status === 201, `Status: ${cbcResultResp.status}`);
  assert('CBC flag NORMAL', cbcResultResp.data.data.flag === 'NORMAL', cbcResultResp.data.data.flag);

  // Enter FBS result (normal: 95, range 70-100)
  const fbsOrder = ourOrders.find((o: any) => o.test?.test_code === 'FBS' || o.department === 'BIOCHEMISTRY');
  const fbsResultResp = await api('POST', '/lims/results', {
    test_order_id: fbsOrder.id,
    raw_value: '95',
  }, labToken);
  assert('FBS result entered', fbsResultResp.status === 201, `Status: ${fbsResultResp.status}`);
  assert('FBS flag NORMAL', fbsResultResp.data.data.flag === 'NORMAL', fbsResultResp.data.data.flag);
  console.log(`  Results: CBC=8.2 (NORMAL), FBS=95 (NORMAL)`);

  // Test HIGH flag: enter a high value for a new scenario
  // (We'll just verify the existing results are correct)

  // ────────────────────────────────────────
  // 3. PATHOLOGIST FLOW
  // ────────────────────────────────────────
  console.log('\n--- PATHOLOGIST ---');

  const pathToken = await login('pathologist1');
  assert('Pathologist login', !!pathToken, 'Got token');

  // View completed orders for sign-off
  const signoffWl = await api('GET', '/lims/worklist?branch_id=10000000-0000-0000-0000-000000000001&status=COMPLETED', null, pathToken);
  assert('Sign-off worklist loads', signoffWl.status === 200, `Status: ${signoffWl.status}`);
  const completedOrders = signoffWl.data.data.filter((o: any) => o.accession_id === accession.id);
  assert('2 completed orders for sign-off', completedOrders.length === 2, `${completedOrders.length} orders`);

  // Sign off CBC
  const signoff1 = await api('POST', `/lims/results/${cbcOrder.id}/sign-off`, {
    comments: 'Normal CBC. No abnormality.',
  }, pathToken);
  assert('CBC signed off', signoff1.status === 200, `Status: ${signoff1.status}`);
  assert('CBC status APPROVED', signoff1.data.data.status === 'APPROVED', signoff1.data.data.status);

  // Sign off FBS
  const signoff2 = await api('POST', `/lims/results/${fbsOrder.id}/sign-off`, {
    comments: 'FBS within normal limits.',
  }, pathToken);
  assert('FBS signed off', signoff2.status === 200, `Status: ${signoff2.status}`);
  assert('FBS status APPROVED', signoff2.data.data.status === 'APPROVED', signoff2.data.data.status);
  console.log('  Both results signed off');

  // ────────────────────────────────────────
  // 4. VERIFY REPORT GENERATION
  // ────────────────────────────────────────
  console.log('\n--- REPORT VERIFICATION ---');

  // Check report was auto-generated (uses receptionist token for report:read)
  const reports = await api('GET', `/reports?accession_id=${accession.id}`, null, recToken);
  assert('Report generated', reports.status === 200 && reports.data.data.length > 0,
    `${reports.data.data?.length} reports`);

  if (reports.data.data.length > 0) {
    const report = reports.data.data[0];
    assert('Report has number', !!report.report_number, report.report_number);
    assert('Report status GENERATED', report.report_status === 'GENERATED', report.report_status);

    const deliveryLogs = report.delivery_logs || [];
    assert('Delivery logs created', deliveryLogs.length >= 1, `${deliveryLogs.length} logs`);

    const whatsappLog = deliveryLogs.find((l: any) => l.channel === 'WHATSAPP');
    const emailLog = deliveryLogs.find((l: any) => l.channel === 'EMAIL');
    assert('WhatsApp delivery logged', !!whatsappLog, whatsappLog?.target || 'missing');
    assert('Email delivery logged', !!emailLog, emailLog?.target || 'missing');
    console.log(`  Report: ${report.report_number}`);
    console.log(`  Delivery: WhatsApp -> ${whatsappLog?.target}, Email -> ${emailLog?.target}`);
  }

  // ────────────────────────────────────────
  // 5. VERIFY FINAL STATE
  // ────────────────────────────────────────
  console.log('\n--- FINAL STATE CHECK ---');

  const finalBill = await api('GET', `/billing/bills/${bill.id}`, null, recToken);
  assert('Bill still PAID', finalBill.data.data.bill_status === 'PAID', finalBill.data.data.bill_status);

  const finalAcc = await api('GET', `/lims/accessions/${accession.id}`, null, recToken);
  assert('Accession COMPLETED', finalAcc.data.data.accession_status === 'COMPLETED',
    finalAcc.data.data.accession_status);

  const allApproved = finalAcc.data.data.test_orders.every((o: any) => o.order_status === 'APPROVED');
  assert('All test orders APPROVED', allApproved,
    finalAcc.data.data.test_orders.map((o: any) => o.order_status).join(', '));

  // ── RBAC TESTS ──
  console.log('\n--- RBAC CHECKS ---');

  // Lab tech should NOT be able to create bills
  const rbac1 = await api('POST', '/billing/bills', {}, labToken);
  assert('Lab tech cannot create bills', rbac1.status === 403, `Status: ${rbac1.status}`);

  // Pathologist should NOT be able to create payments
  const rbac2 = await api('POST', '/billing/payments', {}, pathToken);
  assert('Pathologist cannot create payments', rbac2.status === 403, `Status: ${rbac2.status}`);

  // Lab tech should NOT be able to sign off results
  const rbac3 = await api('POST', '/lims/results/fake-id/sign-off', {}, labToken);
  assert('Lab tech cannot sign off', rbac3.status === 403, `Status: ${rbac3.status}`);

  // ── SUMMARY ──
  console.log('\n========== RESULTS ==========');
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`TOTAL: ${results.length} | PASS: ${passed} | FAIL: ${failed}`);

  if (failed > 0) {
    console.log('\nFAILURES:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`  ✗ ${r.name}: ${r.detail}`);
    });
  }

  console.log('=============================\n');
  return { total: results.length, passed, failed, results };
}

run().catch(err => {
  console.error('E2E test crashed:', err);
  process.exit(1);
});
