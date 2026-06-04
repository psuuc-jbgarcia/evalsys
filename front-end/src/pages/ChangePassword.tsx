import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const isStrongPassword = (password: string) =>
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

const getErrorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to change password';

export default function ChangePassword() {
  const { user, loading, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="min-h-screen bg-bg" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) return <Navigate to="/dashboard" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!isStrongPassword(newPassword)) {
      setError('Use 8+ characters with uppercase, lowercase, number, and symbol.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="evl-page-title">Change Your Password</h1>
          <p className="evl-page-subtitle">Set a private password before continuing to EvalSys.</p>
        </div>
        <form onSubmit={submit} className="evl-card p-6 space-y-4">
          {error && <div className="evl-alert-error">{error}</div>}
          <div>
            <label className="evl-label">Current Temporary Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="evl-input" required />
          </div>
          <div>
            <label className="evl-label">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="evl-input" required />
            <p className="text-[11px] text-text/55 font-semibold mt-1.5">Use 8+ characters with uppercase, lowercase, number, and symbol.</p>
          </div>
          <div>
            <label className="evl-label">Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="evl-input" required />
          </div>
          <button type="submit" disabled={saving} className="evl-btn-primary w-full">
            {saving ? 'Changing Password...' : 'Change Password'}
          </button>
          <button type="button" onClick={logout} className="evl-btn-secondary w-full">Sign Out</button>
        </form>
      </div>
    </div>
  );
}
