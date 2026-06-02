import { useEffect, useState } from 'react';
import api from '../../services/api';

interface Settings {
  isGradingLocked: boolean;
  isCsvExportLocked: boolean;
}

interface Instructor {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  subjectLimit?: number;
}

type UserRow = Instructor & { role: string };

const getErrorMessage = (err: unknown, fallback: string) => {
  const response = (err as { response?: { data?: { message?: string } } })?.response;
  return response?.data?.message || fallback;
};

export default function Subscription() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingCsv, setTogglingCsv] = useState(false);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [limitInputs, setLimitInputs] = useState<Record<string, string>>({});
  const [savingLimitId, setSavingLimitId] = useState<string | null>(null);

  const fetchInstructors = async () => {
    const res = await api.get('/users');
    const instructorRows = (res.data as UserRow[]).filter((u) => u.role === 'admin');
    setInstructors(instructorRows);
    setLimitInputs((prev) => {
      const next = { ...prev };
      instructorRows.forEach((instructor) => {
        if (next[instructor._id] === undefined) {
          next[instructor._id] = String(instructor.subjectLimit ?? 1);
        }
      });
      return next;
    });
  };

  useEffect(() => {
    const init = async () => {
      try {
        const setRes = await api.get('/settings');
        setSettings(setRes.data);
      } catch {
        // non-critical
      }

      try {
        await fetchInstructors();
      } catch {
        // non-critical
      }

      setLoading(false);
    };
    init();
  }, []);

  const handleSaveLimit = async (instructor: Instructor) => {
    const val = parseInt(limitInputs[instructor._id], 10);
    if (!val || val < 1) return;

    setSavingLimitId(instructor._id);
    try {
      const res = await api.patch(`/users/${instructor._id}/subject-limit`, { subjectLimit: val });
      setInstructors((prev) =>
        prev.map((item) => (item._id === instructor._id ? { ...item, subjectLimit: res.data.subjectLimit } : item))
      );
      setLimitInputs((prev) => ({ ...prev, [instructor._id]: String(res.data.subjectLimit) }));
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to update instructor limit'));
    } finally {
      setSavingLimitId(null);
    }
  };

  const handleToggleCsv = async () => {
    setTogglingCsv(true);
    try {
      const res = await api.patch('/settings/toggle-csv-lock');
      setSettings(res.data);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to toggle CSV lock'));
    } finally {
      setTogglingCsv(false);
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
          Control paid instructor limits and feature access across the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_520px] gap-6 mb-8">
        <div className="evl-card overflow-hidden">
          <div className="px-6 py-4 border-b border-muted/30 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-text text-sm">Instructor Subject Limits</h3>
              <p className="text-text/50 text-xs mt-0.5">Set each instructor's paid allowance individually.</p>
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
                  <th className="text-center">Paid Limit</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {instructors.map((instructor) => {
                  const currentLimit = instructor.subjectLimit ?? 1;
                  const inputValue = limitInputs[instructor._id] ?? String(currentLimit);
                  const parsedInput = parseInt(inputValue, 10);
                  const unchanged = parsedInput === currentLimit;
                  const invalid = !parsedInput || parsedInput < 1;

                  return (
                    <tr key={instructor._id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-black shrink-0">
                            {instructor.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-text text-sm">{instructor.name}</span>
                        </div>
                      </td>
                      <td className="text-text/50 text-xs">{instructor.email}</td>
                      <td>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${instructor.isActive ? 'bg-success/10 text-success' : 'bg-muted/20 text-text/40'}`}>
                          {instructor.isActive ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={inputValue}
                          onChange={(e) => setLimitInputs((prev) => ({ ...prev, [instructor._id]: e.target.value }))}
                          className="evl-input !py-2 text-center max-w-28 mx-auto"
                        />
                      </td>
                      <td className="col-actions">
                        <button
                          onClick={() => handleSaveLimit(instructor)}
                          disabled={savingLimitId === instructor._id || unchanged || invalid}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-primary/30 text-primary bg-primary/5 hover:bg-primary/15 transition-all disabled:opacity-40 whitespace-nowrap"
                        >
                          {savingLimitId === instructor._id ? 'Saving...' : 'Update Limit'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="px-6 py-3 border-t border-muted/30 bg-bg/60">
            <p className="text-[11px] text-text/40 leading-relaxed">
              Updating a limit changes how many paid subjects the instructor can manage.
            </p>
          </div>
        </div>

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
              {settings?.isCsvExportLocked ? 'Export Locked' : 'Export Allowed'}
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
    </div>
  );
}
