import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { ReactNode } from 'react';
import {
  Home, FileText, FilePlus, ClipboardList, Search,
  FlaskConical, ClipboardCheck, BarChart3, ListChecks,
  LogOut,
} from 'lucide-react';

interface NavItem { label: string; path: string; icon: ReactNode }

const ICON_SIZE = 20;
const MENU_BY_ROLE: Record<string, NavItem[]> = {
  RECEPTIONIST: [
    { label: 'New Visit', path: '/visit/new', icon: <FilePlus size={ICON_SIZE} /> },
    { label: 'Bills', path: '/bills', icon: <FileText size={ICON_SIZE} /> },
    { label: 'Status', path: '/status', icon: <Search size={ICON_SIZE} /> },
  ],
  LAB_TECHNICIAN: [
    { label: 'Worklist', path: '/lab/worklist', icon: <FlaskConical size={ICON_SIZE} /> },
    { label: 'Status', path: '/status', icon: <Search size={ICON_SIZE} /> },
  ],
  PATHOLOGIST: [
    { label: 'Sign-Off', path: '/lab/sign-off', icon: <ClipboardCheck size={ICON_SIZE} /> },
    { label: 'Worklist', path: '/lab/worklist', icon: <FlaskConical size={ICON_SIZE} /> },
    { label: 'Status', path: '/status', icon: <Search size={ICON_SIZE} /> },
  ],
  CENTER_HEAD: [
    { label: 'Dashboard', path: '/dashboard', icon: <BarChart3 size={ICON_SIZE} /> },
    { label: 'Visit', path: '/visit/new', icon: <FilePlus size={ICON_SIZE} /> },
    { label: 'Lab', path: '/lab/worklist', icon: <FlaskConical size={ICON_SIZE} /> },
    { label: 'Status', path: '/status', icon: <Search size={ICON_SIZE} /> },
    { label: 'Close', path: '/daily-close', icon: <ClipboardList size={ICON_SIZE} /> },
  ],
  FINANCE_MANAGER: [
    { label: 'Dashboard', path: '/dashboard', icon: <BarChart3 size={ICON_SIZE} /> },
    { label: 'Bills', path: '/bills', icon: <FileText size={ICON_SIZE} /> },
    { label: 'Close', path: '/daily-close', icon: <ClipboardList size={ICON_SIZE} /> },
  ],
  SYSTEM_ADMIN: [
    { label: 'Home', path: '/home', icon: <Home size={ICON_SIZE} /> },
    { label: 'Dashboard', path: '/dashboard', icon: <BarChart3 size={ICON_SIZE} /> },
    { label: 'Visit', path: '/visit/new', icon: <FilePlus size={ICON_SIZE} /> },
    { label: 'Lab', path: '/lab/worklist', icon: <FlaskConical size={ICON_SIZE} /> },
    { label: 'Close', path: '/daily-close', icon: <ClipboardList size={ICON_SIZE} /> },
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
        <Link to="/home" className="flex items-center gap-2 active:opacity-70">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-black">M</div>
          <div>
            <p className="text-sm font-semibold leading-tight">Medrelief</p>
            <p className="text-[10px] text-gray-400 leading-tight">{user.branchName}</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-medium leading-tight">{user.fullName}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{user.roleName}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-10 h-10 rounded-full hover:bg-red-50 active:bg-red-100 text-gray-500 hover:text-red-600 flex items-center justify-center transition"
            aria-label="Sign out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 pb-24">
        {children || <Outlet />}
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl bg-white border-t border-gray-200 grid z-20 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.04)]"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map((item) => {
          const active = activePath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-2.5 text-[11px] transition ${active ? 'text-blue-600' : 'text-gray-500'}`}
            >
              <span className={`mb-0.5 ${active ? 'scale-110' : ''} transition`}>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
