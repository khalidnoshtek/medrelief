import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { LoadingPage, EmptyState } from '../../components/ui/primitives';

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['patient-history', id],
    queryFn: () => api.get(`/patients/${id}/history`).then((r) => r.data.data),
    enabled: !!id,
  });

  if (isLoading) return <LoadingPage />;
  if (!data) return <EmptyState title="Patient not found" />;

  const { patient, visits } = data;

  return (
    <div className="p-5 space-y-4 pb-8">
      <div>
        <h1 className="text-xl font-bold text-gray-800">{patient.full_name}</h1>
        <p className="text-sm text-gray-500">{patient.mobile} • {patient.gender}, {patient.age_years}y</p>
      </div>

      <div className="space-y-3">
        {visits.length === 0 ? <EmptyState title="No visits yet" /> : visits.map((v: any) => {
          const bill = v.bill;
          const testOrders = bill?.accession?.test_orders || [];
          return (
            <div key={v.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{new Date(v.created_at).toLocaleDateString('en-IN')}</p>
                  <p className="text-xs text-gray-400">{bill?.bill_number}</p>
                </div>
                {bill && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    bill.bill_status === 'PAID' ? 'bg-green-100 text-green-700' :
                    bill.bill_status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{bill.bill_status}</span>
                )}
              </div>
              <div className="p-4">
                {testOrders.length > 0 ? (
                  <div className="space-y-2">
                    {testOrders.map((o: any) => (
                      <div key={o.id} className="flex justify-between text-sm">
                        <span>{o.test?.name}</span>
                        <div className="flex items-center gap-2">
                          {o.result?.flag && o.result.flag !== 'NORMAL' && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              o.result.flag === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                              o.result.flag === 'LOW' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }`}>{o.result.flag}</span>
                          )}
                          <span className="text-xs text-gray-500">{o.order_status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-400">No tests</p>}

                <div className="flex gap-2 mt-3">
                  {bill && <button onClick={() => navigate(`/bills/${bill.id}`)} className="text-xs bg-gray-100 px-3 py-1.5 rounded-full">Bill</button>}
                  {bill?.accession && <button onClick={() => navigate(`/reports/${bill.accession.id}`)} className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full">Report</button>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
