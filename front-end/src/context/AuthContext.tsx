import { useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';
import { notify } from '../utils/notify';
import { AuthContext, type User } from './auth-context';

const normalizeUser = (user: User): User => ({
  ...user,
  id: user.id || user._id,
} as User);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    api.get('/auth/me')
      .then((res) => setUser(normalizeUser(res.data)))
      .catch((err) => {
        // Only clear token if it's actually invalid (401/403)
        // If it's 429 (Rate Limit), keep the token and maybe show an alert
        if (err.response?.status !== 429) {
          localStorage.removeItem('token');
        } else {
          notify('Too many requests. Please wait a moment before refreshing again.', { type: 'error' });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(normalizeUser(res.data.user));
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.patch('/auth/change-password', { currentPassword, newPassword });
    setUser((current) => current ? { ...current, mustChangePassword: false } : current);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, changePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
