import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { billingApi, limsApi } from '../../api';
import { LoadingPage, EmptyState, BigButton, Alert, Spinner } from '../../components/ui/primitives';
import { Receipt, Tag, FileText, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { openRazorpay } from '../../utils/razorpay';

export default function BillDetailPage() {
  const { billId } = useParams<{ billId: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();

  const { data: bill, isLoading } = useQuery({
    queryKey: ['bill', billId],
    queryFn: () => billingApi.getBill(billId!),
    enabled: !!billId,
  });

  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [payMode, setPayMode] = useState('CASH');
  const [payAmount, setPayAmount] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');

  if (isLoading) return <LoadingPage />;
  if (!bill) return <EmptyState title="Bill not found" />;

  const totalPaid = bill.payments?.filter((p: any) => p.status === 'SUCCESS').reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
  const remaining = Number(bill.final_amount) - totalPaid;
  const canPay = ['PENDING_PAYMENT', 'PARTIALLY_PAID'].includes(bill.bill_status) && remaining > 0;

  const handlePay = async () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return;
    setPayLoading(true);
    setPayError('');
    setPaySuccess('');

    try {
      const gatewayModes = ['UPI', 'CARD', 'NETBANKING'];
      if (gatewayModes.includes(payMode)) {
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
              name: bill.visit?.patient?.full_name,
              contact: bill.visit?.patient?.mobile,
            },
            onSuccess: async (resp) => {
              try {
                await billingApi.razorpayVerify({ ...resp, bill_id: bill.id, mode: payMode });
                resolve();
              } catch (e) { reject(e); }
            },
            onDismiss: () => reject(new Error('Payment cancelled')),
            onError: (e) => reject(new Error(e.description || 'Payment failed')),
          });
        });
      } else {
        // CASH / NEFT / CHEQUE — direct
        await billingApi.recordPayment({ bill_id: bill.id, mode: payMode, amount: amt });
      }

      setPaySuccess(`₹${amt} ${payMode} payment recorded`);
      setShowPayment(false);
      setPayAmount('');
      qc.invalidateQueries({ queryKey: ['bill', billId] });
    } catch (err: any) {
      setPayError(err.response?.data?.message || err.message || 'Payment failed');
    } finally {
      setPayLoading(false);
    }
  };

  const viewReport = async () => {
    try {
      const acc = await limsApi.getAccessionByBill(bill.id);
      if (acc?.id) nav(`/reports/${acc.id}`);
    } catch {}
  };

  return (
    <div className="p-5 space-y-4 pb-8">
      <button onClick={() => nav(-1)} className="text-sm text-blue-600">← Back</button>

      {/* Bill header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-mono text-sm font-semibold">{bill.bill_number}</p>
            <p className="text-xs text-gray-500">{new Date(bill.bill_date).toLocaleString('en-IN')}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            bill.bill_status === 'PAID' ? 'bg-green-100 text-green-700' :
            bill.bill_status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>{bill.bill_status}</span>
        </div>
      </div>

      {/* Patient */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-gray-500">Patient</p>
        <p className="font-medium">{bill.visit?.patient?.full_name}</p>
        <p className="text-sm text-gray-500">{bill.visit?.patient?.mobile} • {bill.visit?.patient?.gender}, {bill.visit?.patient?.age_years}y</p>
        {bill.visit?.referrer && <p className="text-xs text-gray-500 mt-1">Ref: {bill.visit.referrer.name}</p>}
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-gray-500 mb-2">Items</p>
        <div className="space-y-1.5">
          {bill.items?.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.test?.name}</span>
              <span className="font-medium">₹{Number(item.final_amount).toFixed(0)}</span>
            </div>
          ))}
        </div>
        <div className="border-t mt-3 pt-3 flex justify-between">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold">₹{Number(bill.final_amount).toFixed(0)}</span>
        </div>
      </div>

      {/* Payments */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-gray-500 mb-2">Payments</p>
        {bill.payments?.length > 0 ? (
          <div className="space-y-1">
            {bill.payments.map((p: any) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span>{p.mode} <span className="text-gray-400 text-xs">{p.payment_reference}</span></span>
                <span>₹{Number(p.amount).toFixed(0)}</span>
              </div>
            ))}
            <div className="border-t mt-2 pt-2 flex justify-between text-sm">
              <span className="text-gray-500">Paid</span>
              <span className="font-medium">₹{totalPaid.toFixed(0)}</span>
            </div>
            {remaining > 0.01 && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>Remaining</span>
                <span className="font-medium">₹{remaining.toFixed(0)}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No payments yet</p>
        )}

        {/* Collect payment button */}
        {canPay && !showPayment && (
          <BigButton tone="success" onClick={() => { setShowPayment(true); setPayAmount(String(remaining)); }}
            icon={<CreditCard size={18} />}>
            Collect Payment (₹{remaining.toFixed(0)} remaining)
          </BigButton>
        )}

        {/* Payment form */}
        {showPayment && (
          <div className="mt-3 border border-gray-200 rounded-xl p-3 space-y-3">
            <div className="flex gap-2">
              <select value={payMode} onChange={(e) => setPayMode(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm">
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="NEFT">NEFT</option>
              </select>
              <input type="number" value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Amount"
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
            </div>
            <div className="flex gap-2">
              <BigButton tone="success" onClick={handlePay} disabled={payLoading || !payAmount}>
                {payLoading ? <Spinner size="sm" /> : `Pay ₹${parseFloat(payAmount || '0').toFixed(0)}`}
              </BigButton>
              <BigButton tone="secondary" onClick={() => { setShowPayment(false); setPayError(''); }}>
                Cancel
              </BigButton>
            </div>
          </div>
        )}
      </div>

      {payError && <Alert tone="error" onDismiss={() => setPayError('')}>{payError}</Alert>}
      {paySuccess && <Alert tone="success" onDismiss={() => setPaySuccess('')}>{paySuccess}</Alert>}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <BigButton tone="secondary" onClick={() => billingApi.printBill(bill.id)} icon={<Receipt size={18} />}>Receipt</BigButton>
        {bill.accession && <BigButton tone="secondary" onClick={() => limsApi.printLabels(bill.accession.id)} icon={<Tag size={18} />}>Labels</BigButton>}
      </div>

      {bill.bill_status === 'PAID' && bill.accession && (
        <BigButton onClick={viewReport} icon={<FileText size={18} />}>View Report</BigButton>
      )}
    </div>
  );
}
