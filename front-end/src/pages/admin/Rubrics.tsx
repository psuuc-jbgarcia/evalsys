import { useEffect, useState } from 'react';
import api from '../../services/api';

interface Level {
  label: string;
  minScore: number;
  maxScore: number;
  description: string;
}

interface Criteria {
  key: string;
  label: string;
  maxScore: number;
  levels: Level[];
}

interface Rubric {
  _id: string;
  title: string;
  criteria: Criteria[];
  isActive: boolean;
  createdAt: string;
}

const LEVEL_LABELS = ['Excellent', 'Good', 'Fair', 'Poor'];

const emptyCriteria = (): Criteria => ({
  key: '',
  label: '',
  maxScore: 0,
  levels: LEVEL_LABELS.map((l) => ({ label: l, minScore: 0, maxScore: 0, description: '' })),
});

const DEFAULT_CRITERIA: Criteria[] = [
  {
    key: 'systemFunctionality', label: '1. System Functionality', maxScore: 25,
    levels: [
      { label: 'Excellent', minScore: 21, maxScore: 25, description: 'System is complete, responsive, and works without errors.' },
      { label: 'Good',      minScore: 16, maxScore: 20, description: 'System works with minimal issues.' },
      { label: 'Fair',      minScore: 11, maxScore: 15, description: 'System is partially working with several issues.' },
      { label: 'Poor',      minScore: 0,  maxScore: 10, description: 'System has many missing or non-working features.' },
    ],
  },
  {
    key: 'apiIntegration', label: '2. API Integration and Database', maxScore: 25,
    levels: [
      { label: 'Excellent', minScore: 21, maxScore: 25, description: 'Advanced API integration and database are fully working, secure, and accurate.' },
      { label: 'Good',      minScore: 16, maxScore: 20, description: 'API and database work with minor issues.' },
      { label: 'Fair',      minScore: 11, maxScore: 15, description: 'API/database works partially with noticeable errors.' },
      { label: 'Poor',      minScore: 0,  maxScore: 10, description: 'API/database is incomplete or not working properly.' },
    ],
  },
  {
    key: 'presentation', label: '3. Presentation and System Demonstration', maxScore: 15,
    levels: [
      { label: 'Excellent', minScore: 13, maxScore: 15, description: 'Presentation is clear, organized, and confident.' },
      { label: 'Good',      minScore: 10, maxScore: 12, description: 'Presentation is good with minor issues.' },
      { label: 'Fair',      minScore: 6,  maxScore: 9,  description: 'Presentation lacks clarity or has demonstration issues.' },
      { label: 'Poor',      minScore: 0,  maxScore: 5,  description: 'Presentation and demonstration are weak.' },
    ],
  },
  {
    key: 'uiUx', label: '4. User Interface and User Experience', maxScore: 10,
    levels: [
      { label: 'Excellent', minScore: 9, maxScore: 10, description: 'Interface is clean, responsive, and easy to use.' },
      { label: 'Good',      minScore: 7, maxScore: 8,  description: 'Interface is good with minimal issues.' },
      { label: 'Fair',      minScore: 4, maxScore: 6,  description: 'Interface is usable but inconsistent.' },
      { label: 'Poor',      minScore: 0, maxScore: 3,  description: 'Interface is confusing or difficult to use.' },
    ],
  },
  {
    key: 'qa', label: '5. Question and Answer', maxScore: 25,
    levels: [
      { label: 'Excellent', minScore: 21, maxScore: 25, description: 'Answers questions correctly and confidently.' },
      { label: 'Good',      minScore: 16, maxScore: 20, description: 'Answers most questions with minor mistakes.' },
      { label: 'Fair',      minScore: 11, maxScore: 15, description: 'Answers some questions but lacks confidence.' },
      { label: 'Poor',      minScore: 0,  maxScore: 10, description: 'Unable to answer most questions properly.' },
    ],
  },
];

export default function Rubrics() {
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [criteria, setCriteria] = useState<Criteria[]>(DEFAULT_CRITERIA);
  const [error, setError] = useState('');
  const [expandedRubric, setExpandedRubric] = useState<string | null>(null);

  const load = () => api.get('/rubrics').then((r) => setRubrics(r.data));
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setTitle('');
    setCriteria(DEFAULT_CRITERIA);
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const startEdit = (rubric: Rubric) => {
    setTitle(rubric.title);
    setCriteria(rubric.criteria);
    setEditingId(rubric._id);
    setShowForm(true);
    setExpandedRubric(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const updateCriteria = (ci: number, field: keyof Criteria, value: any) => {
    setCriteria((prev) => prev.map((c, i) => i === ci ? { ...c, [field]: value } : c));
  };

  const updateLevel = (ci: number, li: number, field: keyof Level, value: any) => {
    setCriteria((prev) => prev.map((c, i) => {
      if (i !== ci) return c;
      return { ...c, levels: c.levels.map((l, j) => j === li ? { ...l, [field]: value } : l) };
    }));
  };

  const addCriteria = () => setCriteria((prev) => [...prev, emptyCriteria()]);
  const removeCriteria = (ci: number) => setCriteria((prev) => prev.filter((_, i) => i !== ci));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/rubrics/${editingId}`, { title, criteria });
      } else {
        await api.post('/rubrics', { title, criteria });
      }
      resetForm();
      load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving rubric');
    }
  };

  const handleActivate = async (id: string) => {
    await api.patch(`/rubrics/${id}/activate`);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rubric?')) return;
    try {
      await api.delete(`/rubrics/${id}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error');
    }
  };

  const levelColor = (label: string) => {
    if (label === 'Excellent') return 'evl-badge-success';
    if (label === 'Good') return 'evl-badge-primary';
    if (label === 'Fair') return 'evl-badge-warning';
    return 'evl-badge-danger';
  };

  const levelBg = (label: string) => {
    if (label === 'Excellent') return 'bg-success/5 border-success/20';
    if (label === 'Good') return 'bg-primary/5 border-primary/20';
    if (label === 'Fair') return 'bg-warning/5 border-warning/20';
    return 'bg-danger/5 border-danger/20';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="evl-page-title">Rubrics</h2>
          <p className="evl-page-subtitle">Define grading criteria with score levels.</p>
        </div>
        {!showForm ? (
          <button onClick={startCreate} className="evl-btn-primary">+ New Rubric</button>
        ) : (
          <button onClick={resetForm} className="evl-btn-secondary">Cancel</button>
        )}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="evl-card p-6 mb-6">
          <h3 className="text-text font-bold text-sm mb-4">
            {editingId ? 'Edit Rubric' : 'New Rubric'}
          </h3>

          <div className="mb-5">
            <label className="evl-label">Rubric Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required
              className="evl-input max-w-xl" placeholder="e.g. Capstone Defense Rubric" />
          </div>

          <div className="space-y-4">
            {criteria.map((c, ci) => (
              <div key={ci} className="border border-muted/40 rounded-xl p-5 bg-bg">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="evl-label">Key (no spaces)</label>
                    <input value={c.key} onChange={(e) => updateCriteria(ci, 'key', e.target.value)} required
                      className="evl-input" placeholder="systemFunctionality" />
                  </div>
                  <div>
                    <label className="evl-label">Label</label>
                    <input value={c.label} onChange={(e) => updateCriteria(ci, 'label', e.target.value)} required
                      className="evl-input" placeholder="1. System Functionality" />
                  </div>
                  <div>
                    <label className="evl-label">Max Score</label>
                    <input type="number" value={c.maxScore} onChange={(e) => updateCriteria(ci, 'maxScore', Number(e.target.value))} required min={1}
                      className="evl-input" />
                  </div>
                </div>

                <p className="evl-label mb-2">Score Levels</p>
                <div className="space-y-2">
                  {c.levels.map((l, li) => (
                    <div key={li} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                      <input value={l.label} onChange={(e) => updateLevel(ci, li, 'label', e.target.value)}
                        className="evl-input !py-2 !text-xs" placeholder="Label" />
                      <input type="number" value={l.minScore} onChange={(e) => updateLevel(ci, li, 'minScore', Number(e.target.value))} min={0}
                        className="evl-input !py-2 !text-xs" placeholder="Min" />
                      <input type="number" value={l.maxScore} onChange={(e) => updateLevel(ci, li, 'maxScore', Number(e.target.value))} min={0}
                        className="evl-input !py-2 !text-xs" placeholder="Max" />
                      <input value={l.description} onChange={(e) => updateLevel(ci, li, 'description', e.target.value)}
                        className="evl-input !py-2 !text-xs" placeholder="Description" />
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => removeCriteria(ci)}
                  className="evl-btn-ghost text-danger hover:bg-danger/5 mt-3 text-xs">
                  Remove criteria
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addCriteria}
            className="evl-btn-ghost text-primary mt-4">+ Add criteria</button>

          {error && <p className="text-danger text-sm mt-3 font-medium">{error}</p>}

          <div className="mt-5 pt-5 border-t border-muted/40">
            <button type="submit" className="evl-btn-primary">
              {editingId ? 'Update Rubric' : 'Save Rubric'}
            </button>
          </div>
        </form>
      )}

      {/* Rubric list */}
      <div className="space-y-4">
        {rubrics.map((r) => (
          <div key={r._id} className="evl-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  R
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <p className="font-bold text-text">{r.title}</p>
                    {r.isActive && <span className="evl-badge-success">Active</span>}
                  </div>
                  <p className="text-text/50 text-xs mt-0.5">
                    {r.criteria.length} criteria · Created {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => setExpandedRubric(expandedRubric === r._id ? null : r._id)}
                  className="evl-btn-ghost">
                  {expandedRubric === r._id ? 'Hide' : 'View'}
                </button>
                <button onClick={() => startEdit(r)}
                  className="evl-btn-ghost text-primary hover:bg-primary/5">
                  Edit
                </button>
                {!r.isActive && (
                  <button onClick={() => handleActivate(r._id)} className="evl-btn-ghost text-success hover:bg-success/5">
                    Set Active
                  </button>
                )}
                {!r.isActive && (
                  <button onClick={() => handleDelete(r._id)} className="evl-btn-ghost text-danger hover:bg-danger/5">
                    Delete
                  </button>
                )}
              </div>
            </div>

            {expandedRubric === r._id && (
              <div className="border-t border-muted/40 px-6 py-5">
                <div className="space-y-6">
                  {r.criteria.map((c) => (
                    <div key={c.key}>
                      <div className="flex justify-between items-center mb-3">
                        <p className="font-bold text-text">{c.label}</p>
                        <span className="text-text/50 text-xs font-semibold">{c.maxScore} pts</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        {c.levels.map((l) => (
                          <div key={l.label} className={`rounded-lg p-4 border ${levelBg(l.label)}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={levelColor(l.label)}>{l.label}</span>
                              <span className="text-text/40 text-[11px] font-semibold">{l.minScore}–{l.maxScore}</span>
                            </div>
                            <p className="text-text/60 text-xs leading-relaxed">{l.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {!rubrics.length && <p className="text-text/50 text-sm">No rubrics yet. Create one to get started.</p>}
      </div>
    </div>
  );
}
