import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../../api';
import { useAuthStore } from '../../store/auth-store';
import { LoadingPage, Alert } from '../../components/ui/primitives';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)!;
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', user.branchId],
    queryFn: () => financeApi.getDashboard(user.branchId),
    refetchInterval: 30000,
  });

  if (isLoading) return <LoadingPage />;
  if (error) return <div className="p-5"><Alert tone="error">Failed to load dashboard</Alert></div>;
  if (!data) return null;

  const { billing, lims, approvals } = data;

  const Metric = ({ label, value, tone = 'default' }: any) => (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <p className="text-[10px] text-gray-500 uppercase font-semibold">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${
        tone === 'green' ? 'text-green-700' :
        tone === 'orange' ? 'text-orange-600' :
        tone === 'red' ? 'text-red-600' : 'text-gray-800'
      }`}>{value}</p>
    </div>
  );

  return (
    <div className="p-5 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
      <p className="text-xs text-gray-500">{data.date} • {user.branchName}</p>

      <div className="grid grid-cols-2 gap-3">
        <Metric label="Revenue" value={`₹${billing.revenue.toFixed(0)}`} tone="green" />
        <Metric label="Bills" value={`${billing.paid_bills}/${billing.total_bills}`} />
        <Metric label="Discounts" value={`₹${billing.discounts.toFixed(0)}`} tone="orange" />
        <Metric label="Pending" value={billing.pending_payment_bills} tone="red" />
      </div>

      <div className="bg-white rounded-xl p-3 shadow-sm">
        <p className="text-[10px] text-gray-500 uppercase font-semibold mb-2">Collections by mode</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {Object.entries(billing.payment_by_mode).map(([mode, amt]) => (
            <div key={mode}>
              <p className="text-[10px] text-gray-500">{mode}</p>
              <p className="text-sm font-bold">₹{(amt as number).toFixed(0)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 shadow-sm">
        <p className="text-[10px] text-gray-500 uppercase font-semibold mb-2">Lab status</p>
        <div className="grid grid-cols-5 gap-1 text-center">
          <div><p className="text-lg font-bold text-yellow-600">{lims.pending_collection}</p><p className="text-[9px] text-gray-500">Collect</p></div>
          <div><p className="text-lg font-bold text-blue-600">{lims.pending_results}</p><p className="text-[9px] text-gray-500">Results</p></div>
          <div><p className="text-lg font-bold text-purple-600">{lims.pending_signoff}</p><p className="text-[9px] text-gray-500">Sign-off</p></div>
          <div><p className="text-lg font-bold text-green-600">{lims.completed_today}</p><p className="text-[9px] text-gray-500">Done</p></div>
          <div><p className="text-lg font-bold text-gray-700">{lims.reports_today}</p><p className="text-[9px] text-gray-500">Reports</p></div>
        </div>
      </div>

      {approvals.pending_adjustments > 0 && (
        <Alert tone="warn">{approvals.pending_adjustments} pending adjustment(s) need approval</Alert>
      )}
    </div>
  );
}
