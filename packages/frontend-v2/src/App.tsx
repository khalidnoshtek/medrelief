import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth-store';
import { AppShell } from './components/common/app-shell';
import { VisitProvider } from './pages/visit/visit-context';

import LoginPage from './pages/login';
import KioskHome from './pages/kiosk/home';
import StatusPage from './pages/kiosk/status';
import PatientDetail from './pages/kiosk/patient-detail';

import CapturePage from './pages/visit/capture';
import VerifyPage from './pages/visit/verify';
import TestsPage from './pages/visit/tests';
import PaymentPage from './pages/visit/payment';
import DonePage from './pages/visit/done';

import WorklistPage from './pages/lab/worklist';
import ResultEntryPage from './pages/lab/result-entry';
import SignOffPage from './pages/lab/sign-off';

import DashboardPage from './pages/owner/dashboard';
import DailyClosePage from './pages/owner/daily-close';
import DailyClosingItemizedPage from './pages/owner/daily-close-itemized';
import PendingCasesPage from './pages/owner/pending-cases';
import BillsListPage from './pages/owner/bills-list';
import BillDetailPage from './pages/owner/bill-detail';
import ReportViewerPage from './pages/owner/report-viewer';

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const ROLE_HOME: Record<string, string> = {
  RECEPTIONIST: '/home',
  LAB_TECHNICIAN: '/lab/worklist',
  PATHOLOGIST: '/lab/sign-off',
  CENTER_HEAD: '/home',
  FINANCE_MANAGER: '/dashboard',
  SYSTEM_ADMIN: '/home',
};

export default function App() {
  const user = useAuthStore((s) => s.user);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<Protected><AppShell /></Protected>}>
        <Route path="/home" element={<KioskHome />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/patients/:id" element={<PatientDetail />} />

        <Route path="/lab/worklist" element={<WorklistPage />} />
        <Route path="/lab/sign-off" element={<SignOffPage />} />

        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/daily-close" element={<DailyClosePage />} />
        <Route path="/daily-close/itemized" element={<DailyClosingItemizedPage />} />
        <Route path="/pending-cases" element={<PendingCasesPage />} />
        <Route path="/bills" element={<BillsListPage />} />
        <Route path="/bills/:billId" element={<BillDetailPage />} />
        <Route path="/reports/:accessionId" element={<ReportViewerPage />} />
      </Route>

      {/* Result entry uses shell but also standalone */}
      <Route path="/lab/result/:testOrderId" element={
        <Protected>
          <AppShell>
            <ResultEntryPage />
          </AppShell>
        </Protected>
      } />

      {/* Visit flow - wrapped in VisitProvider */}
      <Route path="/visit/*" element={
        <Protected>
          <VisitProvider>
            <AppShell>
              <Routes>
                <Route path="new" element={<CapturePage />} />
                <Route path="verify" element={<VerifyPage />} />
                <Route path="tests" element={<TestsPage />} />
                <Route path="payment" element={<PaymentPage />} />
                <Route path="done/:billId" element={<DonePage />} />
              </Routes>
            </AppShell>
          </VisitProvider>
        </Protected>
      } />

      <Route path="/" element={
        user ? <Navigate to={ROLE_HOME[user.roleCode] || '/home'} replace /> : <Navigate to="/login" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
