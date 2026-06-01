import { useEffect, useState } from 'react';
import api from '../../services/api';

interface Settings {
  isGradingLocked: boolean;
  isCsvExportLocked: boolean;
  maxSubjectsPerInstructor: number;
}

interface Subject {
  _id: string;
  code: string;
  title: string;
}

interface Instructor {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  assignedSubjects: string[];
}

export default function Subscription() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [maxInput, setMaxInput] = useState('1');
  const [savingMax, setSavingMax] = useState(false);
  const [togglingCsv, setTogglingCsv] = useState(false);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editInstructor, setEditInstructor] = useState<Instructor | null>(null);
  const [editSubjectIds, setEditSubjectIds] = useState<string[]>([]);
  const [savingAssign, setSavingAssign] = useState(false);

  const fetchInstructors = async () => {
    try {
      const res = await api.get('/users');
      setInstructors((res.data as any[]).filter((u) => u.role === 'admin'));
    } catch { /* non-critical */ }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [setRes, subRes] = await Promise.all([
          api.get('/settings'),
          api.get('/subjects'),
        ]);
        setSettings(setRes.data);
        setMaxInput(String(setRes.data.maxSubjectsPerInstructor ?? 1));
        setSubjects(subRes.data);
      } catch { /* non-critical */ }
      await fetchInstructors();
      setLoading(false);
    };
    init();
  }, []);

  const handleSaveMax = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(maxInput, 10);
    if (!val || val < 1) return;
    setSavingMax(true);
    try {
      const res = await api.patch('/settings/max-subjects', { maxSubjectsPerInstructor: val });
      setSettings(res.data);
      setMaxInput(String(res.data.maxSubjectsPerInstructor));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update limit');
    } finally {
      setSavingMax(false);
    }
  };

  const handleToggleCsv = async () => {
    setTogglingCsv(true);
    try {
      const res = await api.patch('/settings/toggle-csv-lock');
      setSettings(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to toggle CSV lock');
    } finally {
      setTogglingCsv(false);
    }
  };

  const openEdit = (instructor: Instructor) => {
    setEditInstructor(instructor);
    setEditSubjectIds(instructor.assignedSubjects || []);
  };

  const toggleSubject = (id: string) =>
    setEditSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInstructor) return;
    const limit = settings?.maxSubjectsPerInstructor ?? 1;
    if (editSubjectIds.length > limit) {
      alert(`This instructor can only be assigned up to ${limit} subject${limit !== 1 ? 's' : ''}. Increase the limit first.`);
      return;
    }
    setSavingAssign(true);
    try {
      for (const subjectId of subjects.map((s) => s._id)) {
        const wasAssigned = (editInstructor.assignedSubjects || []).includes(subjectId);
        const isNowAssigned = editSubjectIds.includes(subjectId);
        if (wasAssigned === isNowAssigned) continue;

        const subjectAdmins = instructors
          .filter((i) => (i.assignedSubjects || []).includes(subjectId))
          .map((i) => i._id);

        const newAdminIds = isNowAssigned
          ? [...new Set([...subjectAdmins, editInstructor._id])]
          : subjectAdmins.filter((id) => id !== editInstructor._id);

        await api.put(`/subjects/${subjectId}/admins`, { adminIds: newAdminIds });
      }
      await fetchInstructors();
      setEditInstructor(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update subject assignments');
    } finally {
      setSavingAssign(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h2 className="evl-page-title mb-6">Manage Subscription</h2>
        <div className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-surface border border-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="evl-page-title">Manage Subscription</h2>
        <p className="evl-page-subtitle">
          Control instructor permissions and feature access across the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        {/* ── Max Subjects Per Instructor ── */}
        <div className="evl-card p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" /><path d="M4 19h16" /><path d="M9 7h6" /><path d="M9 11h6" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-text text-sm">Subject Limit per Instructor</h3>
              <p className="text-text/50 text-xs mt-1 leading-relaxed">
                Controls how many subjects a single instructor account can be assigned to. Default is <span className="font-bold text-text">1</span>.
              </p>
            </div>
          </div>
          <div className="bg-bg rounded-xl border border-muted/30 px-4 py-3 mb-5 flex items-center justify-between">
            <span className="text-xs text-text/50 font-medium">Current limit</span>
            <span className="text-2xl font-black text-primary font-mono">
              {settings?.maxSubjectsPerInstructor ?? 1}
              <span className="text-xs font-bold text-text/30 ml-1">subject{(settings?.maxSubjectsPerInstructor ?? 1) !== 1 ? 's' : ''}</span>
            </span>
          </div>
          <form onSubmit={handleSaveMax} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="evl-label">New Limit</label>
              <input
                type="number" min={1} max={20}
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                className="evl-input"
                placeholder="e.g. 3"
              />
            </div>
            <button
              type="submit"
              disabled={savingMax || parseInt(maxInput, 10) === settings?.maxSubjectsPerInstructor}
              className="evl-btn-primary !py-2.5 !text-xs shrink-0 disabled:opacity-40"
            >
              {savingMax ? 'Saving...' : 'Update Limit'}
            </button>
          </form>
          <p className="text-[11px] text-text/40 mt-3 leading-relaxed">
            Decreasing does not remove existing assignments — it only prevents new ones from exceeding the limit.
          </p>
        </div>

        {/* ── CSV Export Lock ── */}
        <div className={`evl-card p-6 transition-colors ${settings?.isCsvExportLocked ? 'border-danger/30 bg-danger/5' : 'border-success/20 bg-success/5'}`}>
          <div className="flex items-start gap-4 mb-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${settings?.isCsvExportLocked ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {settings?.isCsvExportLocked
                  ? <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>
                  : <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></>
                }
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-text text-sm">CSV Grade Export</h3>
              <p className="text-text/50 text-xs mt-1 leading-relaxed">
                When locked, instructors cannot download CSV exports from Results. Super Admin can always export.
              </p>
            </div>
          </div>
          <div className={`rounded-xl border px-4 py-3 mb-5 flex items-center justify-between ${settings?.isCsvExportLocked ? 'border-danger/20 bg-danger/5' : 'border-success/20 bg-success/5'}`}>
            <span className="text-xs text-text/50 font-medium">Current status</span>
            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${settings?.isCsvExportLocked ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
              {settings?.isCsvExportLocked ? '🔒 Export Locked' : '✓ Export Allowed'}
            </span>
          </div>
          <button
            onClick={handleToggleCsv}
            disabled={togglingCsv}
            className={`w-full py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-widest transition-all disabled:opacity-50 ${
              settings?.isCsvExportLocked
                ? 'bg-success text-white hover:bg-success/90'
                : 'bg-danger text-white hover:bg-danger/90'
            }`}
          >
            {togglingCsv ? 'Updating...' : settings?.isCsvExportLocked ? 'Unlock CSV Export' : 'Lock CSV Export'}
          </button>
          <p className="text-[11px] text-text/40 mt-3 leading-relaxed">
            Use this to prevent instructors from exporting results before the evaluation period is officially closed.
          </p>
        </div>
      </div>

      {/* ── Instructor Subject Assignments ── */}
      <div className="evl-card overflow-hidden">
        <div className="px-6 py-4 border-b border-muted/30 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-text text-sm">Instructor Subject Assignments</h3>
            <p className="text-text/50 text-xs mt-0.5">View and edit which subjects each instructor can manage.</p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-text/30 bg-muted/20 px-2 py-1 rounded-md">
            {instructors.length} Instructor{instructors.length !== 1 ? 's' : ''}
          </span>
        </div>

        {instructors.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-text/40 text-sm">No instructor accounts found.</p>
          </div>
        ) : (
          <table className="evl-table">
            <thead>
              <tr>
                <th>Instructor</th>
                <th>Email</th>
                <th>Status</th>
                <th>Assigned Subjects</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((inst) => {
                const assigned = subjects.filter((s) => (inst.assignedSubjects || []).includes(s._id));
                const atLimit = assigned.length >= (settings?.maxSubjectsPerInstructor ?? 1);
                return (
                  <tr key={inst._id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black shrink-0">
                          {inst.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-text text-sm">{inst.name}</span>
                      </div>
                    </td>
                    <td className="text-text/50 text-xs">{inst.email}</td>
                    <td>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${inst.isActive ? 'bg-success/10 text-success' : 'bg-muted/20 text-text/40'}`}>
                        {inst.isActive ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td>
                      {assigned.length === 0 ? (
                        <span className="text-text/30 text-xs italic">No subjects assigned</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {assigned.map((s) => (
                            <span key={s._id} className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md font-mono">
                              {s.code}
                            </span>
                          ))}
                          {atLimit && (
                            <span className="text-[10px] font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-md">
                              At limit
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="col-actions">
                      <button
                        onClick={() => openEdit(inst)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-primary/30 text-primary bg-primary/5 hover:bg-primary/15 transition-all whitespace-nowrap"
                      >
                        Edit Subjects
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Edit Instructor Subjects Modal ── */}
      {editInstructor && (
        <div className="fixed inset-0 bg-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-muted/30 flex justify-between items-center bg-bg">
              <div>
                <h3 className="font-bold text-text">Edit Subject Assignments</h3>
                <p className="text-text/50 text-xs mt-0.5">{editInstructor.name} · {editInstructor.email}</p>
              </div>
              <button onClick={() => setEditInstructor(null)} className="text-text/40 hover:text-text text-xl">×</button>
            </div>
            <form onSubmit={handleSaveAssign} className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="evl-label mb-0">Subjects</label>
                  <span className="text-[10px] text-text/40 font-medium">
                    {editSubjectIds.length} / {settings?.maxSubjectsPerInstructor ?? 1} limit
                  </span>
                </div>
                {subjects.length === 0 ? (
                  <p className="text-text/40 text-sm text-center py-4">No subjects created yet.</p>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto border border-muted rounded-xl p-2 bg-bg">
                    {subjects.map((s) => {
                      const checked = editSubjectIds.includes(s._id);
                      const wouldExceed = !checked && editSubjectIds.length >= (settings?.maxSubjectsPerInstructor ?? 1);
                      return (
                        <label
                          key={s._id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                            checked
                              ? 'bg-primary/10 border border-primary/20'
                              : wouldExceed
                                ? 'opacity-40 cursor-not-allowed bg-muted/10'
                                : 'hover:bg-surface border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={wouldExceed}
                            onChange={() => !wouldExceed && toggleSubject(s._id)}
                            className="accent-primary w-4 h-4 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-black text-primary font-mono">{s.code}</span>
                            <span className="text-xs text-text/60 ml-2">{s.title}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                {editSubjectIds.length >= (settings?.maxSubjectsPerInstructor ?? 1) && (
                  <p className="text-[11px] text-warning font-semibold mt-2">
                    Subject limit reached. Increase the limit above to assign more.
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditInstructor(null)} className="evl-btn-secondary flex-1 !py-2.5 !text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={savingAssign} className="evl-btn-primary flex-1 !py-2.5 !text-xs">
                  {savingAssign ? 'Saving...' : 'Save Assignments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
