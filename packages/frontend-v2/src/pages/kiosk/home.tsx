import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';

export default function KioskHome() {
  const user = useAuthStore((s) => s.user)!;

  return (
    <div className="p-5 space-y-4">
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">Welcome, {user.fullName}</p>
      </div>

      {/* The one big button */}
      <Link
        to="/visit/new"
        className="block bg-blue-600 active:bg-blue-700 text-white rounded-3xl p-8 shadow-lg"
      >
        <div className="flex items-center gap-4">
          <div className="text-5xl">📝</div>
          <div>
            <p className="text-2xl font-bold">New Visit</p>
            <p className="text-sm text-blue-100 mt-1">Scan prescription and register</p>
          </div>
        </div>
      </Link>

      {/* Secondary actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/status" className="bg-white rounded-2xl p-5 shadow-sm active:bg-gray-50">
          <div className="text-3xl mb-2">🔍</div>
          <p className="font-semibold text-gray-800">Check Status</p>
          <p className="text-xs text-gray-500 mt-0.5">Patient or doctor</p>
        </Link>
        <Link to="/bills" className="bg-white rounded-2xl p-5 shadow-sm active:bg-gray-50">
          <div className="text-3xl mb-2">🧾</div>
          <p className="font-semibold text-gray-800">Bills</p>
          <p className="text-xs text-gray-500 mt-0.5">Today's bills</p>
        </Link>
      </div>

      {(user.roleCode === 'CENTER_HEAD' || user.roleCode === 'SYSTEM_ADMIN' || user.roleCode === 'FINANCE_MANAGER') && (
        <Link to="/dashboard" className="block bg-white rounded-2xl p-5 shadow-sm active:bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="text-3xl">📊</div>
            <div>
              <p className="font-semibold text-gray-800">Dashboard</p>
              <p className="text-xs text-gray-500">Today's metrics and approvals</p>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
