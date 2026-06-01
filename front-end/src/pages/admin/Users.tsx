import { useEffect, useState } from 'react';
import api from '../../services/api';
import { TableSkeleton } from '../../components/LoadingSkeleton';

interface User { _id: string; name: string; email: string; role: string; isActive: boolean; }

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'panel' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/users')
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false));
  };
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

  const downloadTemplate = () => {
    const csvContent = "name,email,password,role\nJuan Dela Cruz,juan@example.com,password123,panel\nMaria Clara,maria@example.com,password123,admin";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "user_import_template.csv";
    link.click();
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Skip header
      const data = lines.slice(1).map(line => {
        const [name, email, password, role] = line.split(',').map(s => s.trim());
        return { name, email, password, role };
      });

      try {
        const res = await api.post('/users/bulk', { users: data });
        alert(`Import Complete!\nCreated: ${res.data.created}\nSkipped: ${res.data.skipped}`);
        load();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error during bulk import');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="evl-page-title">Panel Accounts</h2>
          <p className="evl-page-subtitle">Create and manage evaluator panel accounts.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="evl-btn-secondary !text-xs !py-1.5">
            Download Template
          </button>
          <label className="evl-btn-primary !text-xs !py-1.5 cursor-pointer">
            Bulk Import (CSV)
            <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" />
          </label>
        </div>
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
                <option value="admin">Instructor</option>
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
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <div className="evl-card overflow-hidden">
          <table className="evl-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="col-actions">Actions</th>
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
                  <td className="col-actions">
                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <button onClick={() => handleToggle(u._id)}
                        className="evl-btn-ghost text-primary hover:bg-primary/5">
                        {u.isActive ? 'Block' : 'Unblock'}
                      </button>
                      <button onClick={async () => {
                        const pass = prompt('Enter new password for ' + u.name);
                        if (!pass) return;
                        await api.patch(`/users/${u._id}/reset-password`, { newPassword: pass });
                        alert('Password updated!');
                      }}
                        className="evl-btn-ghost text-primary hover:bg-primary/5">
                        Reset
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
      )}
    </div>
  );
}
