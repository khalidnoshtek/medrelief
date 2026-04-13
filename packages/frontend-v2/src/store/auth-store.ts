import { create } from 'zustand';

export interface User {
  id: string;
  username: string;
  fullName: string;
  roleCode: string;
  roleName: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  permissions: string[];
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (code: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('mr_token'),
  user: JSON.parse(localStorage.getItem('mr_user') || 'null'),
  login: (token, user) => {
    localStorage.setItem('mr_token', token);
    localStorage.setItem('mr_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('mr_token');
    localStorage.removeItem('mr_user');
    set({ token: null, user: null });
  },
  hasPermission: (code) => get().user?.permissions.includes(code) ?? false,
}));
