import { useEffect, useState } from 'react';
import api from '../../services/api';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';

interface User { _id: string; name: string; email: string; role: string; isActive: boolean; }

const roleText = (role: string) => {
  if (role === 'superadmin') return 'Super Admin';
  if (role === 'admin') return 'Instructor';
  return 'Panel';
};

const getErrorMessage = (err: unknown, fallback: string) => {
  const response = (err as { response?: { data?: { message?: string } } })?.response;
  return response?.data?.message || fallback;
};

const emailUsername = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/@evalsys\.com$/i, '')
    .replace(/@/g, '')
    .replace(/[^a-z0-9._-]/g, '');

const isStrongPassword = (password: string) =>
  password.length >= 8 &&
  /[a-z]/.test(password) &&
  /[A-Z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

const passwordRuleText = 'Use 8+ chars with uppercase, lowercase, number, and symbol.';

const generatePassword = () => {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numbers = '23456789';
  const symbols = '!@#$%&*?';
  const all = lower + upper + numbers + symbols;
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  const required = [pick(upper), pick(lower), pick(numbers), pick(symbols)];
  const rest = Array.from({ length: 8 }, () => pick(all));

  return [...required, ...rest]
    .sort(() => Math.random() - 0.5)
    .join('');
};

export default function Users() {
  const { user } = useAuth();
  const isSuperadmin = user?.role === 'superadmin';
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'panel', createdBy: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const pageTitle = isSuperadmin ? 'Accounts' : 'Panel Accounts';
  const pageSubtitle = isSuperadmin
    ? 'Create, review, and manage platform accounts by role.'
    : 'Create and manage evaluator panel accounts.';
  const visibleRoles = isSuperadmin ? ['superadmin', 'admin', 'panel'] : ['panel'];
  const usersByRole = visibleRoles.map((role) => ({
    role,
    label: roleText(role),
    users: users.filter((item) => item.role === role),
  }));
  const activeCount = users.filter((item) => item.isActive).length;
  const activeInstructors = users.filter((item) => item.role === 'admin' && item.isActive);
  const panelOwnerRequired = isSuperadmin && form.role === 'panel';
  const createGridClass = isSuperadmin && form.role === 'panel'
    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 items-start'
    : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_170px] gap-4 items-start';

  const load = () => {
    setLoading(true);
    api.get('/users')
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/users')
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const username = emailUsername(form.email);
    if (!username) {
      setError('Email username is required');
      return;
    }
    if (isSuperadmin && form.role === 'panel' && !form.createdBy) {
      setError('Select the instructor who owns this panel account');
      return;
    }
    if (!isStrongPassword(form.password)) {
      setError(passwordRuleText);
      return;
    }
    try {
      await api.post('/users', { ...form, email: username });
      setForm({ name: '', email: '', password: '', role: 'panel', createdBy: '' });
      load();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error'));
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
    const csvContent = "name,email,password,role\nJuan Dela Cruz,juan,Panel@123,panel\nMaria Clara,maria,Admin@123,admin";
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
      } catch (err: unknown) {
        alert(getErrorMessage(err, 'Error during bulk import'));
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="evl-page-title">{pageTitle}</h2>
          <p className="evl-page-subtitle">{pageSubtitle}</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="evl-card p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-text/40">Total Accounts</p>
          <p className="text-2xl font-black text-text mt-1">{users.length}</p>
        </div>
        <div className="evl-card p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-text/40">Active</p>
          <p className="text-2xl font-black text-success mt-1">{activeCount}</p>
        </div>
        <div className="evl-card p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-text/40">{isSuperadmin ? 'Panels' : 'Blocked'}</p>
          <p className="text-2xl font-black text-primary mt-1">
            {isSuperadmin ? users.filter((item) => item.role === 'panel').length : users.length - activeCount}
          </p>
        </div>
      </div>

      {/* Add form */}
      <div className="evl-card p-6 mb-6">
        <h3 className="text-text font-bold text-sm mb-4">Create New Account</h3>
        <form onSubmit={handleAdd}>
          <div className={createGridClass}>
            <div>
              <label className="evl-label">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                className="evl-input" placeholder="Full name" />
            </div>
            <div>
              <label className="evl-label">Email</label>
              <div className="flex">
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: emailUsername(e.target.value) })}
                  required
                  className="evl-input rounded-r-none"
                  placeholder="username"
                />
                <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-primary/30 bg-primary/5 text-xs font-black text-primary">
                  @evalsys.com
                </span>
              </div>
              <p className="text-[11px] text-text/60 font-semibold mt-1.5">Type only the username. The domain is always @evalsys.com.</p>
            </div>
            <div>
              <label className="evl-label">Password</label>
              <div className="flex">
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="evl-input rounded-r-none font-mono"
                  placeholder="Generate or type"
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, password: generatePassword() })}
                  className="px-3 rounded-r-lg border border-l-0 border-muted bg-bg text-xs font-bold text-primary hover:bg-primary/5 whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
              <p className={`text-[11px] font-semibold mt-1.5 ${form.password && !isStrongPassword(form.password) ? 'text-danger' : 'text-text/60'}`}>
                {passwordRuleText}
              </p>
            </div>
            <div>
              <label className="evl-label">Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, createdBy: e.target.value === 'panel' ? form.createdBy : '' })}
                className="evl-select">
                <option value="panel">Panel</option>
                {isSuperadmin && <option value="admin">Instructor</option>}
              </select>
            </div>
            {isSuperadmin && form.role === 'panel' && (
              <div>
                <label className="evl-label">Instructor Owner</label>
                <select
                  value={form.createdBy}
                  onChange={(e) => setForm({ ...form, createdBy: e.target.value })}
                  required
                  className="evl-select"
                >
                  <option value="">Select instructor</option>
                  {activeInstructors.map((instructor) => (
                      <option key={instructor._id} value={instructor._id}>
                        {instructor.name}
                      </option>
                    ))}
                </select>
                {!activeInstructors.length && (
                  <p className="text-[10px] text-danger mt-1">Create an active instructor first.</p>
                )}
              </div>
            )}
            <div className={isSuperadmin && form.role === 'panel' ? 'xl:col-span-5 flex items-center gap-4 pt-1' : 'flex items-end'}>
              <button
                type="submit"
                disabled={panelOwnerRequired && (!form.createdBy || !activeInstructors.length)}
                className="evl-btn-primary disabled:opacity-40 w-full xl:w-auto"
              >
                Create Account
              </button>
            </div>
          </div>
          {error && <p className="text-danger text-sm font-medium mt-3">{error}</p>}
        </form>
      </div>

      {/* Account groups */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : (
        <div className="space-y-5">
          {usersByRole.map((group) => (
            <div key={group.role} className="evl-card overflow-hidden">
              <div className="px-5 py-4 border-b border-muted/30 flex items-center justify-between bg-bg/50">
                <div>
                  <h3 className="text-sm font-black text-text">{group.label}</h3>
                  <p className="text-[11px] text-text/45 mt-0.5">
                    {group.users.length} account{group.users.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-muted/20 text-text/35">
                  {group.users.filter((item) => item.isActive).length} Active
                </span>
              </div>

              {group.users.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-text/40">
                  No {group.label.toLowerCase()} accounts yet.
                </div>
              ) : (
                <div className="divide-y divide-muted/30">
                  {group.users.map((u) => (
                    <div key={u._id} className="grid grid-cols-1 lg:grid-cols-[1.4fr_1.6fr_120px_260px] gap-3 px-5 py-4 items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-text truncate">{u.name}</p>
                          <p className="text-[11px] text-text/35">{roleText(u.role)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-text/55 truncate">{u.email}</p>
                      <div>
                        <span className={u.isActive ? 'evl-badge-success' : 'evl-badge-danger'}>
                          {u.isActive ? 'Active' : 'Blocked'}
                        </span>
                      </div>
                      <div className="flex items-center justify-start lg:justify-end gap-2 whitespace-nowrap">
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
