import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';
import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  role?: 'admin' | 'panel';
}

export default function ProtectedRoute({ children, role }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text/50 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;

  return <Layout>{children}</Layout>;
}
