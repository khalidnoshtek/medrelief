import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { billingApi, limsApi } from '../../api';
import { LoadingPage, EmptyState, BigButton } from '../../components/ui/primitives';

export default function BillDetailPage() {
  const { billId } = useParams<{ billId: string }>();
  const nav = useNavigate();
  const { data: bill, isLoading } = useQuery({
    queryKey: ['bill', billId],
    queryFn: () => billingApi.getBill(billId!),
    enabled: !!billId,
  });

  if (isLoading) return <LoadingPage />;
  if (!bill) return <EmptyState title="Bill not found" />;

  const viewReport = async () => {
    try {
      const acc = await limsApi.getAccessionByBill(bill.id);
      if (acc?.id) nav(`/reports/${acc.id}`);
    } catch {}
  };

  return (
    <div className="p-5 space-y-4 pb-8">
      <button onClick={() => nav(-1)} className="text-sm text-blue-600">← Back</button>

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

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-gray-500">Patient</p>
        <p className="font-medium">{bill.visit?.patient?.full_name}</p>
        <p className="text-sm text-gray-500">{bill.visit?.patient?.mobile} • {bill.visit?.patient?.gender}, {bill.visit?.patient?.age_years}y</p>
        {bill.visit?.referrer && <p className="text-xs text-gray-500 mt-1">Ref: {bill.visit.referrer.name}</p>}
      </div>

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

      {bill.payments?.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-gray-500 mb-2">Payments</p>
          {bill.payments.map((p: any) => (
            <div key={p.id} className="flex justify-between text-sm py-1">
              <span>{p.mode}</span>
              <span>₹{Number(p.amount).toFixed(0)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <BigButton tone="secondary" onClick={() => billingApi.printBill(bill.id)}>🧾 Receipt</BigButton>
        {bill.accession && <BigButton tone="secondary" onClick={() => limsApi.printLabels(bill.accession.id)}>🏷️ Labels</BigButton>}
      </div>

      {bill.bill_status === 'PAID' && bill.accession && (
        <BigButton onClick={viewReport}>View Report</BigButton>
      )}
    </div>
  );
}
