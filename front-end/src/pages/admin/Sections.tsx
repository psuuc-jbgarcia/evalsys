import { useEffect, useState } from 'react';
import api from '../../services/api';

interface Section { _id: string; name: string; block: string; }

export default function Sections() {
  const [sections, setSections] = useState<Section[]>([]);
  const [block, setBlock] = useState('');
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
                <td className="font-semibold text-text">{s.block}</td>
                <td className="text-right">
                  <button onClick={() => handleDelete(s._id)} className="evl-btn-ghost text-danger hover:text-danger hover:bg-danger/5">
                    Delete
                  </button>
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
