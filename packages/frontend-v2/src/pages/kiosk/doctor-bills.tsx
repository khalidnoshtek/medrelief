import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mdmApi, billingApi } from '../../api';
import { LoadingPage, EmptyState } from '../../components/ui/primitives';
import { ArrowLeft } from 'lucide-react';

export default function DoctorBillsPage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const nav = useNavigate();

  const { data: doctors } = useQuery({ queryKey: ['doctors'], queryFn: mdmApi.getDoctors });
  const doctor = doctors?.find((d: any) => d.id === doctorId);

  const { data: billsData, isLoading } = useQuery({
    queryKey: ['bills-by-doctor', doctorId],
    queryFn: () => billingApi.searchBills({ limit: 100 }),
    enabled: !!doctorId,
  });

  // Filter bills by this doctor (referrer_id match)
  const bills = (billsData?.data || []).filter((b: any) =>
    b.visit?.referrer?.id === doctorId || b.referrer_id === doctorId
  );

  if (isLoading) return <LoadingPage />;

  return (
    <div className="p-5 space-y-4 pb-8">
      <button onClick={() => nav(-1)} className="flex items-center gap-1 text-sm text-blue-600">
        <ArrowLeft size={16} /> Back
      </button>

      <div>
        <h1 className="text-xl font-bold text-gray-800">{doctor?.name || 'Doctor'}</h1>
        <p className="text-xs text-gray-500">{doctor?.specialty} {doctor?.mobile ? `• ${doctor.mobile}` : ''}</p>
      </div>

      <p className="text-sm text-gray-600">{bills.length} bill(s) referred by this doctor</p>

      {bills.length === 0 ? (
        <EmptyState title="No bills found" description="No bills linked to this doctor yet" />
      ) : (
        <div className="space-y-2">
          {bills.map((b: any) => (
            <button key={b.id} onClick={() => nav(`/bills/${b.id}`)}
              className="w-full text-left bg-white rounded-xl p-3 shadow-sm active:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-800">{b.visit?.patient?.full_name}</p>
                  <p className="text-[10px] font-mono text-gray-400">{b.bill_number}</p>
                  <p className="text-xs text-gray-500">{b.items?.length || 0} tests • {new Date(b.bill_date).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">₹{Number(b.final_amount).toFixed(0)}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    b.bill_status === 'PAID' ? 'bg-green-100 text-green-700' :
                    b.bill_status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{b.bill_status}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
