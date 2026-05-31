import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'panel';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const normalizeUser = (user: any): User => ({
  ...user,
  id: user.id || user._id,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then((res) => setUser(normalizeUser(res.data)))
        .catch((err) => {
          // Only clear token if it's actually invalid (401/403)
          // If it's 429 (Rate Limit), keep the token and maybe show an alert
          if (err.response?.status !== 429) {
            localStorage.removeItem('token');
          } else {
            alert('Too many requests. Please wait a moment before refreshing again.');
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(normalizeUser(res.data.user));
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
