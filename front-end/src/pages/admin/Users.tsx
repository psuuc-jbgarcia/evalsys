import { useEffect, useState } from 'react';
import api from '../../services/api';

interface User { _id: string; name: string; email: string; role: string; isActive: boolean; }

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'panel' });
  const [error, setError] = useState('');

  const load = () => api.get('/users').then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/users', form);
      setForm({ name: '', email: '', password: '', role: 'panel' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error');
    }
  };

  const handleToggle = async (id: string) => {
    await api.patch(`/users/${id}/toggle`);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    await api.delete(`/users/${id}`);
    load();
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="evl-page-title">Panel Accounts</h2>
        <p className="evl-page-subtitle">Create and manage evaluator panel accounts.</p>
      </div>

      {/* Add form */}
      <div className="evl-card p-6 mb-6">
        <h3 className="text-text font-bold text-sm mb-4">Create New Account</h3>
        <form onSubmit={handleAdd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="evl-label">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                className="evl-input" placeholder="Full name" />
            </div>
            <div>
              <label className="evl-label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required
                className="evl-input" placeholder="email@example.com" />
            </div>
            <div>
              <label className="evl-label">Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required
                className="evl-input" placeholder="••••••••" />
            </div>
            <div>
              <label className="evl-label">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="evl-select">
                <option value="panel">Panel</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button type="submit" className="evl-btn-primary">Create Account</button>
            {error && <p className="text-danger text-sm font-medium">{error}</p>}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="evl-card overflow-hidden">
        <table className="evl-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td className="font-semibold text-text">{u.name}</td>
                <td className="text-text/50">{u.email}</td>
                <td className="capitalize text-text">{u.role}</td>
                <td>
                  <span className={u.isActive ? 'evl-badge-success' : 'evl-badge-danger'}>
                    {u.isActive ? 'Active' : 'Blocked'}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleToggle(u._id)}
                      className="evl-btn-ghost text-primary hover:bg-primary/5">
                      {u.isActive ? 'Block' : 'Unblock'}
                    </button>
                    <button onClick={() => handleDelete(u._id)}
                      className="evl-btn-ghost text-danger hover:text-danger hover:bg-danger/5">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr><td colSpan={5} className="text-center text-text/50 py-12">No accounts yet. Create one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
