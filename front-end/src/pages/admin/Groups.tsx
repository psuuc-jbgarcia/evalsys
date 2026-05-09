import { useEffect, useState } from 'react';
import api from '../../services/api';

interface Section { _id: string; name: string; block: string; }
interface Group {
  _id: string; name: string;
  section: Section;
  members: string[];
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [form, setForm] = useState({ name: '', section: '', members: '' });
  const [error, setError] = useState('');

  const load = () => api.get('/groups').then((r) => setGroups(r.data));

  useEffect(() => {
    load();
    api.get('/sections').then((r) => setSections(r.data));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const members = form.members.split(',').map((m) => m.trim()).filter(Boolean);
      await api.post('/groups', { ...form, members });
      setForm({ name: '', section: '', members: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this group?')) return;
    await api.delete(`/groups/${id}`);
    load();
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="evl-page-title">Groups</h2>
        <p className="evl-page-subtitle">Create groups and add members. Panel judges are managed per block via the Sections page.</p>
      </div>

      {/* Add form */}
      <div className="evl-card p-6 mb-6">
        <h3 className="text-text font-bold text-sm mb-4">Add New Group</h3>
        <form onSubmit={handleAdd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="evl-label">Group Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                className="evl-input" placeholder="e.g. Group Alpha" />
            </div>
            <div>
              <label className="evl-label">Section / Block</label>
              <select value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} required
                className="evl-select">
                <option value="">Select block</option>
                {sections.map((s) => <option key={s._id} value={s._id}>{s.block}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="evl-label">Members (comma-separated)</label>
            <input value={form.members} onChange={(e) => setForm({ ...form, members: e.target.value })}
              className="evl-input"
              placeholder="Juan Dela Cruz, Maria Santos" />
          </div>

          <div className="flex items-center gap-4 mt-5">
            <button type="submit" className="evl-btn-primary">Add Group</button>
            {error && <p className="text-danger text-sm font-medium">{error}</p>}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="evl-card overflow-hidden">
        <table className="evl-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Block</th>
              <th>Members</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g._id}>
                <td className="font-semibold text-text">{g.name}</td>
                <td className="text-text/50">{g.section?.block}</td>
                <td className="text-text/50 text-xs max-w-[200px] truncate">{g.members.join(', ') || '—'}</td>
                <td className="text-right">
                  <button onClick={() => handleDelete(g._id)} className="evl-btn-ghost text-danger hover:text-danger hover:bg-danger/5">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!groups.length && (
              <tr><td colSpan={4} className="text-center text-text/50 py-12">No groups yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
