import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { billingApi, limsApi } from '../../api';
import { BigButton, Spinner } from '../../components/ui/primitives';
import { useVisit } from './visit-context';

export default function DonePage() {
  const { billId } = useParams<{ billId: string }>();
  const navigate = useNavigate();
  const { reset } = useVisit();
  const [bill, setBill] = useState<any>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!billId) return;
    (async () => {
      try {
        const b = await billingApi.getBill(billId);
        setBill(b);
        const q = await billingApi.getQr(billId);
        setQr(q.qr_data_url);
      } catch {}
    })();
  }, [billId]);

  const newVisit = () => { reset(); navigate('/visit/new'); };
  const handlePrintReceipt = () => { if (billId) billingApi.printBill(billId); };
  const handlePrintLabels = async () => {
    if (!billId) return;
    try {
      const acc = await limsApi.getAccessionByBill(billId);
      if (acc?.id) limsApi.printLabels(acc.id);
    } catch {}
  };

  if (!bill) return <div className="p-8 text-center"><Spinner /></div>;

  return (
    <div className="p-5 space-y-5 text-center">
      <div className="pt-6">
        <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center text-5xl mb-3">✅</div>
        <h1 className="text-2xl font-bold text-gray-800">Payment Confirmed</h1>
        <p className="text-gray-500 text-sm mt-1">Accession created. Labels and receipt ready.</p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <p className="text-xs text-gray-500">Bill</p>
        <p className="font-mono font-semibold text-gray-800 text-sm">{bill.bill_number}</p>
        <p className="text-3xl font-bold mt-2">₹{Number(bill.final_amount).toFixed(0)}</p>
        <p className="text-xs text-gray-500 mt-1">{bill.bill_status}</p>

        {qr && (
          <div className="mt-5 pt-5 border-t">
            <p className="text-sm font-semibold text-gray-700 mb-1">Patient QR</p>
            <p className="text-xs text-gray-500 mb-3">Patient shows this at reception to check report status. Staff can scan from Status screen.</p>
            <img src={qr} alt="QR" className="w-40 h-40 mx-auto rounded-lg border border-gray-200" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BigButton tone="secondary" onClick={handlePrintReceipt}>🧾 Receipt</BigButton>
        <BigButton tone="secondary" onClick={handlePrintLabels}>🏷️ Labels</BigButton>
      </div>

      <BigButton onClick={newVisit}>New Visit</BigButton>
    </div>
  );
}
