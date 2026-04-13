import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mdmApi, billingApi } from '../../api';
import { useAuthStore } from '../../store/auth-store';
import { BigButton, Alert, Spinner } from '../../components/ui/primitives';
import { useVisit } from './visit-context';
import { openRazorpay } from '../../utils/razorpay';

export default function PaymentPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user)!;
  const { draft, update } = useVisit();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [payments, setPayments] = useState<Array<{ mode: string; amount: string }>>([{ mode: 'CASH', amount: '' }]);

  const grossTotal = draft.selectedTests.reduce((s, t) => s + t.price, 0);
  const total = Math.round(grossTotal / 10) * 10;
  const totalPayments = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const exceeds = totalPayments > total + 0.01;

  // Prefill first payment line to full total
  useEffect(() => { if (payments[0].amount === '') setPayments([{ mode: 'CASH', amount: String(total) }]); }, [total]);

  const handleCreateBillAndPay = async () => {
    if (totalPayments <= 0) { setError('Enter payment amount'); return; }
    if (exceeds) { setError(`Total ₹${totalPayments} exceeds bill ₹${total}`); return; }
    setLoading(true); setError('');

    try {
      // 1. Find or create patient by mobile
      let patientId = draft.patientId;
      if (!patientId) {
        const existing = await mdmApi.searchPatients(draft.mobile!);
        const found = existing.find((p: any) => p.mobile === draft.mobile);
        if (found) { patientId = found.id; }
        else {
          const created = await mdmApi.createPatient({
            full_name: draft.patientName,
            gender: draft.gender,
            age_years: draft.ageYears,
            mobile: draft.mobile,
          });
          patientId = created.id;
        }
      }

      // 2. Create bill
      const bill = await billingApi.createBill({
        patient_id: patientId,
        branch_id: user.branchId,
        visit_type: draft.visitType,
        payer_type: draft.payerType,
        referrer_id: draft.referrerId || null,
        tests: draft.selectedTestIds.map((id) => ({ test_id: id, quantity: 1 })),
        packages: [],
      });

      // 3. Record payments — CASH is direct, UPI/CARD go through Razorpay
      for (const p of payments) {
        const amt = parseFloat(p.amount);
        if (!amt || amt <= 0) continue;

        const gatewayModes = ['UPI', 'CARD', 'NETBANKING'];
        if (gatewayModes.includes(p.mode)) {
          // Razorpay flow
          const order = await billingApi.razorpayOrder(bill.id, amt);
          await new Promise<void>((resolve, reject) => {
            openRazorpay({
              key: order.key_id,
              order_id: order.order_id,
              amount: order.amount,
              currency: order.currency,
              name: 'Medrelief',
              description: `Bill ${order.bill_number}`,
              prefill: {
                name: draft.patientName,
                contact: draft.mobile,
              },
              onSuccess: async (resp) => {
                try {
                  await billingApi.razorpayVerify({
                    ...resp,
                    bill_id: bill.id,
                    mode: p.mode,
                  });
                  resolve();
                } catch (e) { reject(e); }
              },
              onDismiss: () => reject(new Error('Payment cancelled')),
              onError: (e) => reject(new Error(e.description || 'Payment failed')),
            });
          });
        } else {
          // CASH / NEFT / CHEQUE — direct record
          await billingApi.recordPayment({ bill_id: bill.id, mode: p.mode, amount: amt });
        }
      }

      // 4. Navigate to done with bill id
      navigate(`/visit/done/${bill.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Payment failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="p-5 space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Payment</h1>
        <p className="text-sm text-gray-500">Step 4 of 4 • Collect payment</p>
      </div>

      {/* Bill summary */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <p className="text-xs text-gray-500">Patient</p>
        <p className="font-medium text-gray-800">{draft.patientName} • {draft.gender?.[0]} {draft.ageYears}y</p>
        <p className="text-xs text-gray-500 mt-2">{draft.selectedTests.length} test(s)</p>
        <div className="mt-2 space-y-1">
          {draft.selectedTests.map((t) => (
            <div key={t.id} className="flex justify-between text-sm">
              <span>{t.name}</span>
              <span className="text-gray-500">₹{t.price.toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div className="border-t mt-3 pt-3 flex justify-between">
          <p className="font-semibold">Total</p>
          <p className="text-xl font-bold">₹{total}</p>
        </div>
      </div>

      {/* Payment modes */}
      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase">Payment</p>
        {payments.map((p, idx) => (
          <div key={idx} className="flex gap-2">
            <select
              value={p.mode}
              onChange={(e) => { const arr = [...payments]; arr[idx].mode = e.target.value; setPayments(arr); }}
              className="px-3 py-2 border border-gray-200 rounded-xl bg-white"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NEFT">NEFT</option>
            </select>
            <input
              type="number"
              value={p.amount}
              onChange={(e) => { const arr = [...payments]; arr[idx].amount = e.target.value; setPayments(arr); }}
              placeholder="Amount"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl"
            />
            {payments.length > 1 && (
              <button onClick={() => setPayments(payments.filter((_, i) => i !== idx))} className="text-red-400 px-2">×</button>
            )}
          </div>
        ))}
        <button
          onClick={() => setPayments([...payments, { mode: 'UPI', amount: '' }])}
          className="text-blue-600 text-sm font-medium active:text-blue-700"
        >+ Add split payment</button>
        {exceeds && <p className="text-xs text-red-600">Total ₹{totalPayments} exceeds bill</p>}
        {!exceeds && totalPayments > 0 && totalPayments < total && (
          <p className="text-xs text-orange-600">Remaining: ₹{(total - totalPayments).toFixed(0)}</p>
        )}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <BigButton tone="success" onClick={handleCreateBillAndPay} disabled={loading || exceeds || totalPayments <= 0}>
        {loading ? <><Spinner size="sm" /> Processing...</> : `Collect ₹${totalPayments.toFixed(0)}`}
      </BigButton>
    </div>
  );
}
