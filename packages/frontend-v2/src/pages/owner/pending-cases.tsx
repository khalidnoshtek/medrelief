import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { financeApi } from '../../api';
import { useAuthStore } from '../../store/auth-store';
import { LoadingPage, EmptyState } from '../../components/ui/primitives';

export default function PendingCasesPage() {
  const user = useAuthStore((s) => s.user)!;
  const nav = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['pending-cases', user.branchId],
    queryFn: () => financeApi.getPendingCases(user.branchId),
  });

  if (isLoading) return <LoadingPage />;
  const cases = data || [];

  return (
    <div className="p-5 space-y-3 pb-8">
      <button onClick={() => nav(-1)} className="text-sm text-blue-600">← Back</button>
      <div>
        <h1 className="text-xl font-bold text-gray-800">Pending Cases</h1>
        <p className="text-xs text-gray-500">From previous days, not yet completed</p>
      </div>

      {cases.length === 0 ? (
        <EmptyState title="Nothing pending" description="All previous-day cases are closed" />
      ) : (
        <div className="space-y-2">
          {cases.map((acc: any) => {
            const ageDays = Math.floor(
              (Date.now() - new Date(acc.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            const progress = acc.test_orders?.filter((o: any) => o.order_status === 'APPROVED').length || 0;
            const total = acc.test_orders?.length || 0;
            return (
              <div key={acc.id} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{acc.visit?.patient?.full_name}</p>
                    <p className="text-[11px] text-gray-500">{acc.visit?.patient?.mobile}</p>
                    <p className="text-[10px] font-mono text-gray-400 mt-0.5">{acc.accession_number}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      ageDays > 3 ? 'bg-red-100 text-red-700' :
                      ageDays > 1 ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{ageDays}d old</span>
                    <p className="text-[11px] text-gray-500 mt-1">{progress}/{total} done</p>
                  </div>
                </div>

                {acc.bill && (
                  <div className="flex justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                    <span>{acc.bill.bill_number}</span>
                    <span className="font-medium text-gray-700">₹{Number(acc.bill.final_amount).toFixed(0)}</span>
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  <button onClick={() => nav(`/lab/worklist`)}
                    className="text-[11px] bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                    Worklist
                  </button>
                  {acc.bill && (
                    <button onClick={() => nav(`/bills/${acc.bill.id || acc.bill_id}`)}
                      className="text-[11px] bg-gray-100 text-gray-700 px-3 py-1 rounded-full">
                      View bill
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
