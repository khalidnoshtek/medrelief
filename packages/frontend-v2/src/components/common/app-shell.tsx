import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { ReactNode } from 'react';

interface NavItem { label: string; path: string; icon: string; }

const MENU_BY_ROLE: Record<string, NavItem[]> = {
  RECEPTIONIST: [
    { label: 'New Visit', path: '/visit/new', icon: '📝' },
    { label: 'Bills', path: '/bills', icon: '🧾' },
    { label: 'Status', path: '/status', icon: '🔍' },
  ],
  LAB_TECHNICIAN: [
    { label: 'Worklist', path: '/lab/worklist', icon: '🧪' },
    { label: 'Status', path: '/status', icon: '🔍' },
  ],
  PATHOLOGIST: [
    { label: 'Sign-Off', path: '/lab/sign-off', icon: '✍️' },
    { label: 'Worklist', path: '/lab/worklist', icon: '🧪' },
    { label: 'Status', path: '/status', icon: '🔍' },
  ],
  CENTER_HEAD: [
    { label: 'Home', path: '/home', icon: '🏠' },
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Visit', path: '/visit/new', icon: '📝' },
    { label: 'Lab', path: '/lab/worklist', icon: '🧪' },
    { label: 'Close', path: '/daily-close', icon: '📋' },
  ],
  FINANCE_MANAGER: [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Bills', path: '/bills', icon: '🧾' },
    { label: 'Close', path: '/daily-close', icon: '📋' },
  ],
  SYSTEM_ADMIN: [
    { label: 'Home', path: '/home', icon: '🏠' },
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Visit', path: '/visit/new', icon: '📝' },
    { label: 'Lab', path: '/lab/worklist', icon: '🧪' },
    { label: 'Close', path: '/daily-close', icon: '📋' },
  ],
};

export function AppShell({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const loc = useLocation();

  if (!user) { navigate('/login'); return null; }

  const items = MENU_BY_ROLE[user.roleCode] || [];
  const activePath = items.find((i) => loc.pathname.startsWith(i.path))?.path;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-3xl mx-auto relative">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-bold">M</div>
          <div>
            <p className="text-sm font-semibold leading-tight">Medrelief</p>
            <p className="text-[10px] text-gray-400 leading-tight">{user.branchName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-medium leading-tight">{user.fullName}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{user.roleName}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-gray-400 active:text-red-500 text-sm">⎋</button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 pb-24">
        {children || <Outlet />}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-white border-t border-gray-200 grid z-20"
           style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((item) => {
          const active = activePath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-2 text-[11px] transition ${active ? 'text-blue-600' : 'text-gray-500'}`}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
