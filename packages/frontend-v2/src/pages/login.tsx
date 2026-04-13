import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuthStore } from '../store/auth-store';
import { BigButton, Alert } from '../components/ui/primitives';

const ROLE_DEFAULT_ROUTE: Record<string, string> = {
  RECEPTIONIST: '/home',
  LAB_TECHNICIAN: '/lab/worklist',
  PATHOLOGIST: '/lab/sign-off',
  CENTER_HEAD: '/home',
  FINANCE_MANAGER: '/dashboard',
  SYSTEM_ADMIN: '/home',
};

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await authApi.login(username, password);
      login(result.accessToken, result.user);
      navigate(ROLE_DEFAULT_ROUTE[result.user.roleCode] || '/home');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-gradient-to-br from-blue-50 to-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600 text-white flex items-center justify-center text-3xl font-bold mb-3">M</div>
          <h1 className="text-2xl font-bold text-gray-800">Medrelief</h1>
          <p className="text-gray-500 text-sm">Lab Management</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Username</label>
            <input
              type="text" value={username} autoFocus
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
              placeholder="receptionist1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Password</label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
              placeholder="demo123"
            />
          </div>
          {error && <Alert tone="error">{error}</Alert>}
          <BigButton onClick={submit as any} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </BigButton>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Demo: receptionist1 / labtech1 / pathologist1 / centerhead1 — demo123
        </p>
      </div>
    </div>
  );
}
