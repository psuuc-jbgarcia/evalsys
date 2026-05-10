import { useEffect, useState } from 'react';
import api from '../../services/api';

interface Section { _id: string; name: string; block: string; }

export default function Sections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [block, setBlock] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get('/sections').then((r) => setSections(r.data));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/sections', { name: block, block });
      setBlock('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error');
    }
  };

  const handleUpdate = async (id: string) => {
    setError('');
    try {
      await api.put(`/sections/${id}`, { name: editValue, block: editValue });
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error updating');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this block?')) return;
    await api.delete(`/sections/${id}`);
    load();
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="evl-page-title">Blocks</h2>
        <p className="evl-page-subtitle">Create and manage blocks.</p>
      </div>

      {/* Add form */}
      <div className="evl-card p-6 mb-6">
        <h3 className="text-text font-bold text-sm mb-4">Add New Block</h3>
        <form onSubmit={handleAdd} className="flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[220px]">
            <label className="evl-label">Block Name</label>
            <input value={block} onChange={(e) => setBlock(e.target.value)} required
              className="evl-input" placeholder="e.g. 21-ITE-04" />
          </div>
          <button type="submit" className="evl-btn-primary">Add Block</button>
        </form>
        {error && <p className="text-danger text-sm mt-3 font-medium">{error}</p>}
      </div>

      {/* Table */}
      <div className="evl-card overflow-hidden">
        <table className="evl-table">
          <thead>
            <tr>
              <th>Block</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <tr key={s._id}>
                <td className="font-semibold text-text">
                  {editingId === s._id ? (
                    <input 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)}
                      className="evl-input py-1 h-9"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate(s._id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                  ) : (
                    s.block
                  )}
                </td>
                <td className="text-right">
                  {editingId === s._id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleUpdate(s._id)} className="evl-btn-primary py-1 px-3 text-xs h-9">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="evl-btn-ghost py-1 px-3 text-xs h-9">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditingId(s._id); setEditValue(s.block); }} className="evl-btn-ghost text-primary hover:text-primary hover:bg-primary/5">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(s._id)} className="evl-btn-ghost text-danger hover:text-danger hover:bg-danger/5">
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!sections.length && (
              <tr><td colSpan={2} className="text-center text-text/50 py-12">No blocks yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
