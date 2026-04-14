import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { financeApi } from '../../api';
import { useAuthStore } from '../../store/auth-store';
import { LoadingPage, EmptyState } from '../../components/ui/primitives';

export default function DailyClosingItemizedPage() {
  const user = useAuthStore((s) => s.user)!;
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date') || undefined; // e.g. 2026-04-08

  const { data, isLoading } = useQuery({
    queryKey: ['daily-close-itemized', user.branchId, dateParam],
    queryFn: () => financeApi.getDailyClosingItemized(user.branchId, dateParam),
  });

  if (isLoading) return <LoadingPage />;
  if (!data) return <EmptyState title="No data" />;

  const { bills, totals, date } = data;

  const Pill = ({ tone, children }: any) => (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
      tone === 'green' ? 'bg-green-100 text-green-700' :
      tone === 'red' ? 'bg-red-100 text-red-700' :
      tone === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
      'bg-gray-100 text-gray-700'
    }`}>{children}</span>
  );

  return (
    <div className="p-5 space-y-4 pb-8">
      <button onClick={() => nav(-1)} className="text-sm text-blue-600">← Back</button>
      <div>
        <h1 className="text-xl font-bold text-gray-800">Daily Closing — Itemized</h1>
        <p className="text-xs text-gray-500">{date} • {user.branchName}</p>
      </div>

      {/* Summary strip */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-[10px] text-gray-500">Bills</p>
            <p className="text-lg font-bold">{totals.total_bills}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Paid</p>
            <p className="text-lg font-bold text-green-600">{totals.paid_count}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Pending</p>
            <p className="text-lg font-bold text-yellow-600">{totals.pending_count}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Cancelled</p>
            <p className="text-lg font-bold text-red-600">{totals.cancelled_count}</p>
          </div>
        </div>
        <div className="border-t mt-3 pt-3 grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] text-gray-500">Gross</p>
            <p className="text-base font-semibold">₹{totals.gross.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Discounts</p>
            <p className="text-base font-semibold text-orange-600">₹{totals.discounts.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Net revenue</p>
            <p className="text-base font-bold text-green-700">₹{totals.net_revenue.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Collections by mode */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Collections by channel</p>
        <div className="grid grid-cols-6 gap-2 text-center">
          {Object.entries(totals.by_mode).map(([mode, amt]) => (
            <div key={mode}>
              <p className="text-[9px] text-gray-500">{mode}</p>
              <p className="text-xs font-bold">₹{(amt as number).toFixed(0)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Itemized bills */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">All bills today ({bills.length})</p>
        {bills.length === 0 ? (
          <EmptyState title="No bills today" />
        ) : (
          <div className="space-y-2">
            {bills.map((b: any) => (
              <button
                key={b.id}
                onClick={() => nav(`/bills/${b.id}`)}
                className="w-full text-left bg-white rounded-xl p-3 shadow-sm active:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{b.visit?.patient?.full_name}</p>
                    <p className="text-[10px] font-mono text-gray-400">{b.bill_number}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{b.items?.length || 0} tests</p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="font-bold">₹{Number(b.final_amount).toFixed(0)}</p>
                    <Pill tone={
                      b.bill_status === 'PAID' ? 'green' :
                      b.bill_status === 'CANCELLED' ? 'red' :
                      'yellow'
                    }>{b.bill_status}</Pill>
                  </div>
                </div>
                {b.payments?.length > 0 && (
                  <div className="flex gap-1.5 mt-2">
                    {b.payments.map((p: any) => (
                      <span key={p.id} className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {p.mode} ₹{Number(p.amount).toFixed(0)}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
