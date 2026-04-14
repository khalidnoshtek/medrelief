import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { financeApi } from '../../api';
import { useAuthStore } from '../../store/auth-store';
import { LoadingPage, Alert } from '../../components/ui/primitives';
import { AssistantChat } from '../../components/common/assistant-chat';

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

  const { billing, lims, approvals, cases } = data;

  const Metric = ({ label, value, tone = 'default' }: any) => (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <p className="text-[10px] text-gray-500 uppercase font-semibold">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${
        tone === 'green' ? 'text-green-700' :
        tone === 'orange' ? 'text-orange-600' :
        tone === 'red' ? 'text-red-600' :
        tone === 'blue' ? 'text-blue-700' :
        tone === 'purple' ? 'text-purple-700' : 'text-gray-800'
      }`}>{value}</p>
    </div>
  );

  return (
    <div className="p-5 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-xs text-gray-500">{data.date} • {user.branchName}</p>
      </div>

      {/* Case metrics — top priority per stakeholder */}
      <section>
        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide mb-2">Daily operation</p>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/pending-cases" className="bg-white rounded-xl p-3 shadow-sm active:bg-gray-50 relative">
            <p className="text-[10px] text-gray-500 uppercase font-semibold">Previous day pending</p>
            <p className="text-xl font-bold mt-0.5 text-orange-600">{cases.previous_day_pending}</p>
            <p className="text-[10px] text-blue-600 mt-1">View list →</p>
          </Link>
          <Metric label="Today's cases" value={cases.todays_cases} tone="blue" />
          <Metric label="Cases closed today" value={cases.cases_closed_today} tone="green" />
          <Metric label="Cases in progress" value={cases.cases_in_progress} tone="purple" />
        </div>
      </section>

      {/* Revenue cards */}
      <section>
        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide mb-2">Revenue today</p>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Revenue" value={`₹${billing.revenue.toFixed(0)}`} tone="green" />
          <Metric label="Bills paid/total" value={`${billing.paid_bills}/${billing.total_bills}`} />
          <Metric label="Discounts" value={`₹${billing.discounts.toFixed(0)}`} tone="orange" />
          <Metric label="Pending payment" value={billing.pending_payment_bills} tone="red" />
        </div>
      </section>

      {/* Collections by mode */}
      <Link to="/daily-close/itemized" className="block bg-white rounded-xl p-4 shadow-sm active:bg-gray-50">
        <div className="flex justify-between items-start mb-3">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Collections by channel</p>
          <p className="text-[10px] text-blue-600">Itemized →</p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {Object.entries(billing.payment_by_mode).map(([mode, amt]) => (
            <div key={mode}>
              <p className="text-[10px] text-gray-500">{mode}</p>
              <p className="text-sm font-bold">₹{(amt as number).toFixed(0)}</p>
            </div>
          ))}
        </div>
      </Link>

      {/* Lab status */}
      <section className="bg-white rounded-xl p-3 shadow-sm">
        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Lab status</p>
        <div className="grid grid-cols-5 gap-1 text-center">
          <div><p className="text-lg font-bold text-yellow-600">{lims.pending_collection}</p><p className="text-[9px] text-gray-500">Collect</p></div>
          <div><p className="text-lg font-bold text-blue-600">{lims.pending_results}</p><p className="text-[9px] text-gray-500">Results</p></div>
          <div><p className="text-lg font-bold text-purple-600">{lims.pending_signoff}</p><p className="text-[9px] text-gray-500">Sign-off</p></div>
          <div><p className="text-lg font-bold text-green-600">{lims.completed_today}</p><p className="text-[9px] text-gray-500">Done</p></div>
          <div><p className="text-lg font-bold text-gray-700">{lims.reports_today}</p><p className="text-[9px] text-gray-500">Reports</p></div>
        </div>
      </section>

      {approvals.pending_adjustments > 0 && (
        <Alert tone="warn">{approvals.pending_adjustments} pending adjustment(s) need approval</Alert>
      )}

      {/* AI Business Assistant — floating chat */}
      <AssistantChat />
    </div>
  );
}
