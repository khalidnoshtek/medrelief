import { ReactNode } from 'react';

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6';
  return <div className={`${s} animate-spin rounded-full border-2 border-gray-200 border-t-blue-600 inline-block`} />;
}

export function LoadingPage({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-16 gap-3">
      <Spinner />
      <span className="text-gray-500">{message}</span>
    </div>
  );
}

export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
      {icon && <div className="text-5xl mb-3">{icon}</div>}
      <p className="text-gray-700 font-medium">{title}</p>
      {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
    </div>
  );
}

export function Alert({ tone = 'info', children, onDismiss }: { tone?: 'info' | 'success' | 'warn' | 'error'; children: ReactNode; onDismiss?: () => void }) {
  const toneCls = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warn: 'bg-orange-50 text-orange-700 border-orange-200',
    error: 'bg-red-50 text-red-700 border-red-200',
  }[tone];
  return (
    <div className={`border rounded-lg px-4 py-3 flex justify-between items-center text-sm ${toneCls}`}>
      <div>{children}</div>
      {onDismiss && <button onClick={onDismiss} className="ml-4 text-xs opacity-60 hover:opacity-100">Dismiss</button>}
    </div>
  );
}

export function BigButton({ children, onClick, tone = 'primary', disabled, icon }: {
  children: ReactNode; onClick?: () => void; tone?: 'primary' | 'secondary' | 'success' | 'danger'; disabled?: boolean; icon?: ReactNode;
}) {
  const toneCls = {
    primary: 'bg-blue-600 text-white active:bg-blue-700',
    secondary: 'bg-white text-gray-700 border border-gray-200 active:bg-gray-50',
    success: 'bg-green-600 text-white active:bg-green-700',
    danger: 'bg-red-600 text-white active:bg-red-700',
  }[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl py-4 px-5 font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2 ${toneCls}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const cls = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-red-100 text-red-700',
  }[level];
  const label = { high: 'Verified', medium: 'Check', low: 'Needs review' }[level];
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>{label}</span>;
}
