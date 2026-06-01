import { useEffect, useState } from 'react';
import api from '../../services/api';
import { TableSkeleton } from '../../components/LoadingSkeleton';
import { formatMemberList, type Member } from '../../utils/members';

interface Section { _id: string; name: string; block: string; }
interface Group {
  _id: string; name: string;
  section: Section;
  members: Member[];
}

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [form, setForm] = useState({ name: '', section: '', members: '' });
  const [error, setError] = useState('');
  const [filterBlock, setFilterBlock] = useState('');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editForm, setEditForm] = useState({ name: '', section: '', members: '' });
  const [loading, setLoading] = useState(true);



  const load = () => {
    setLoading(true);
    api.get('/groups')
      .then((r) => setGroups(r.data))
      .finally(() => setLoading(false));
  };

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

  const startEdit = (g: Group) => {
    setEditingGroup(g);
    setEditForm({
      name: g.name,
      section: typeof g.section === 'string' ? g.section : g.section?._id || '',
      members: formatMemberList(g.members)
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    try {
      const members = editForm.members.split(',').map((m) => m.trim()).filter(Boolean);
      await api.put(`/groups/${editingGroup._id}`, { ...editForm, members });
      setEditingGroup(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this group?')) return;
    await api.delete(`/groups/${id}`);
    load();
  };

  const downloadTemplate = () => {
    const csvContent = "name,block,members\nGroup Omega,21-ITE-04,Juan Dela Cruz; Maria Clara\nGroup Delta,21-ITE-05,Simoun Ibarra; Basilio";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "group_import_template.csv";
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
        const [name, block, members] = line.split(',').map(s => s.trim());
        return { name, block, members };
      });

      try {
        const res = await api.post('/groups/bulk', { groups: data });
        alert(`Import Complete!\nCreated: ${res.data.created}\nSkipped: ${res.data.skipped}`);
        load();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error during bulk import');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const filteredGroups = filterBlock
    ? groups.filter((g) => {
        const sId = typeof g.section === 'string' ? g.section : g.section?._id;
        return sId === filterBlock;
      })
    : groups;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="evl-page-title">Groups</h2>
          <p className="evl-page-subtitle">Create groups and add members. Panel judges are managed per block via the Sections page.</p>
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
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center gap-3">
          <h3 className="text-text font-bold text-sm">Group List</h3>
          <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
            {filterBlock ? `${filteredGroups.length} of ${groups.length}` : groups.length} Groups
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-text/40 uppercase tracking-widest">Filter by Block:</span>
          <select 
            value={filterBlock} 
            onChange={(e) => setFilterBlock(e.target.value)}
            className="evl-select !py-1 !px-3 !text-xs !w-auto bg-surface"
          >
            <option value="">All Blocks</option>
            {sections.map((s) => <option key={s._id} value={s._id}>{s.block}</option>)}
          </select>
        </div>
      </div>
      {loading ? (
        <TableSkeleton rows={8} cols={4} />
      ) : (
        <div className="evl-card overflow-hidden">
          <table className="evl-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Block</th>
                <th>Members</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((g) => (
                <tr key={g._id}>
                  <td className="font-semibold text-text">{g.name}</td>
                  <td className="text-text/50">{g.section?.block}</td>
                  <td className="text-text/50 text-xs max-w-[200px] truncate">{formatMemberList(g.members) || '—'}</td>
                  <td className="col-actions">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => startEdit(g)} className="evl-btn-ghost text-primary hover:bg-primary/5">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(g._id)} className="evl-btn-ghost text-danger hover:text-danger hover:bg-danger/5">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredGroups.length && (
                <tr><td colSpan={4} className="text-center text-text/50 py-12">No groups found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingGroup && (
        <EditModal 
          group={editingGroup} 
          form={editForm} 
          setForm={setEditForm} 
          sections={sections} 
          onSave={handleEditSubmit} 
          onCancel={() => setEditingGroup(null)} 
        />
      )}
    </div>
  );
}

function EditModal({ group, form, setForm, sections, onSave, onCancel }: { 
  group: Group, 
  form: any, 
  setForm: any, 
  sections: Section[], 
  onSave: (e: React.FormEvent) => void, 
  onCancel: () => void 
}) {
  return (
    <div className="fixed inset-0 bg-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-muted/30 flex justify-between items-center bg-bg">
          <h3 className="font-bold text-text">Edit Group: {group.name}</h3>
          <button onClick={onCancel} className="text-text/40 hover:text-text text-xl">×</button>
        </div>
        <form onSubmit={onSave} className="p-6 space-y-4">
          <div>
            <label className="evl-label">Group Name</label>
            <input 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              required
              className="evl-input" 
            />
          </div>
          <div>
            <label className="evl-label">Section / Block</label>
            <select 
              value={form.section} 
              onChange={(e) => setForm({ ...form, section: e.target.value })} 
              required
              className="evl-select"
            >
              <option value="">Select block</option>
              {sections.map((s) => <option key={s._id} value={s._id}>{s.block}</option>)}
            </select>
          </div>
          <div>
            <label className="evl-label">Members (comma-separated)</label>
            <textarea 
              value={form.members} 
              onChange={(e) => setForm({ ...form, members: e.target.value })}
              rows={3}
              className="evl-input resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="evl-btn-primary flex-1 py-2.5">Save Changes</button>
            <button type="button" onClick={onCancel} className="evl-btn-secondary px-6 py-2.5">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
