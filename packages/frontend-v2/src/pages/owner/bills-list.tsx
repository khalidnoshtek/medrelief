import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { billingApi } from '../../api';
import { useAuthStore } from '../../store/auth-store';
import { LoadingPage, EmptyState } from '../../components/ui/primitives';

export default function BillsListPage() {
  const user = useAuthStore((s) => s.user)!;
  const nav = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['bills', user.branchId],
    queryFn: () => billingApi.searchBills({ branch_id: user.branchId, limit: 50 }),
  });

  const bills = data?.data || [];

  return (
    <div className="p-5 space-y-3 pb-8">
      <h1 className="text-xl font-bold text-gray-800">Bills</h1>
      {isLoading ? <LoadingPage /> :
        bills.length === 0 ? <EmptyState title="No bills" /> :
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
      }
    </div>
  );
}
