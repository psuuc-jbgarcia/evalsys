import { useEffect, useState } from 'react';
import api from '../../services/api';
import { TableSkeleton } from '../../components/LoadingSkeleton';

interface Section { _id: string; name: string; block: string; }
interface GroupResult {
  group: { _id: string; name: string; members: string[] };
  averaged: Record<string, number> | null;
  finalTotal: number | null;
  evaluatedBy?: string[];
  missingPanels?: string[];
  isIncomplete?: boolean;
  comments?: { panel: string; text: string }[];
}

const LABELS: Record<string, string> = {
  systemFunctionality: 'System',
  apiIntegration: 'API/DB',
  presentation: 'Presentation',
  uiUx: 'UI/UX',
  qa: 'Q&A',
};

const MAX: Record<string, number> = {
  systemFunctionality: 25, apiIntegration: 25,
  presentation: 15, uiUx: 10, qa: 25,
};

const scoreColor = (score: number, max: number) => {
  const pct = score / max;
  if (pct >= 0.84) return 'text-success font-bold';
  if (pct >= 0.64) return 'text-primary font-bold';
  if (pct >= 0.44) return 'text-warning font-bold';
  return 'text-danger font-bold';
};

const scoreBadge = (total: number) => {
  if (total >= 84) return 'evl-badge-success';
  if (total >= 64) return 'evl-badge-primary';
  if (total >= 44) return 'evl-badge-warning';
  return 'evl-badge-danger';
};

export default function Results() {
  const [sections, setSections] = useState<Section[]>([]);
  const [selected, setSelected] = useState<Section | null>(null);
  const [results, setResults] = useState<GroupResult[]>([]);
  const [viewFeedback, setViewFeedback] = useState<{ group: string, items: { panel: string, text: string }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSections, setLoadingSections] = useState(true);

  useEffect(() => { 
    setLoadingSections(true);
    api.get('/sections')
      .then((r) => setSections(r.data))
      .finally(() => setLoadingSections(false)); 
  }, []);

  const loadResults = async (section: Section) => {
    setSelected(section);
    setLoading(true);
    try {
      const res = await api.get(`/evaluations/section/${section._id}/results`);
      setResults(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!selected || !results.length) return;

    const headers = ['Group', 'Members', ...Object.values(LABELS), 'Final Total', 'Evaluated By', 'Did Not Evaluate Yet', 'Comments'];
    const rows = results.map((r) => [
      r.group.name,
      r.group.members.join('; '),
      ...Object.keys(LABELS).map((k) => 
        !r.isIncomplete && r.averaged ? (r.averaged[k] || 0).toFixed(2) : '—'
      ),
      (r.isIncomplete || r.finalTotal === null) ? 'Pending Complete Evaluation' : (r.finalTotal?.toFixed(2) ?? 'Pending'),
      r.evaluatedBy?.join('; ') ?? '',
      r.missingPanels?.join('; ') ?? '',
      r.comments?.map(c => `[${c.panel}]: ${c.text}`).join(' | ') ?? '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selected.block}_Results.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="evl-page-title">Results</h2>
        <p className="evl-page-subtitle">View averaged evaluation scores per group by section.</p>
      </div>

      {/* Section selector */}
      <div className="flex gap-2 flex-wrap mb-6">
        {loadingSections ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="w-24 h-10 rounded-lg bg-surface border border-muted/40 animate-pulse" />
          ))
        ) : (
          sections.map((s) => (
            <button key={s._id} onClick={() => loadResults(s)}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150 ${
                selected?._id === s._id
                  ? 'bg-primary text-white border-primary'
                  : 'border-muted text-text/50 bg-surface hover:text-text hover:border-text/20'
              }`}>
              {s.name === s.block ? s.block : `${s.name} — ${s.block}`}
            </button>
          ))
        )}
        {!loadingSections && !sections.length && <p className="text-text/50 text-sm">No sections available.</p>}
      </div>

      {/* Results table */}
      {loading ? (
        <TableSkeleton rows={6} cols={8} />
      ) : selected && (
        <div className="evl-card overflow-hidden">
          <div className="px-6 py-4 border-b border-muted/40 flex justify-between items-center">
            <h3 className="text-text font-bold text-sm">
              {selected.name === selected.block ? selected.block : `${selected.name} — ${selected.block}`}
            </h3>
            <button
              onClick={downloadCSV}
              className="evl-btn-primary !py-1.5 !text-xs flex items-center gap-2"
            >
              <span>⬇</span> Download CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="evl-table">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Members</th>
                  {Object.keys(LABELS).map((k) => (
                    <th key={k} className="text-center">{LABELS[k]}</th>
                  ))}
                  <th className="text-center">Final</th>
                </tr>
              </thead>
              <tbody>
                {results.map(({ group, averaged, finalTotal, evaluatedBy, missingPanels, isIncomplete, comments }) => (
                  <tr key={group._id}>
                    <td className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <p className="font-semibold text-text">{group.name}</p>
                        {evaluatedBy && evaluatedBy.length > 0 && (
                          <p className="text-[10px] text-success/80 font-semibold tracking-wide uppercase mt-1">
                            Eval by: {evaluatedBy.join(', ')}
                          </p>
                        )}
                        {isIncomplete && missingPanels && missingPanels.length > 0 && (
                          <p className="text-[10px] text-danger font-bold tracking-wide uppercase mt-0.5">
                            Did not evaluate yet: {missingPanels.join(', ')}
                          </p>
                        )}
                        {comments && comments.length > 0 && (
                          <button 
                            onClick={() => setViewFeedback({ group: group.name, items: comments })}
                            className="text-[9px] font-bold text-primary uppercase text-left mt-2 hover:underline"
                          >
                            👁 View {comments.length} Comments
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="text-text/50 text-xs max-w-[200px]">{group.members.join(', ') || '—'}</td>
                    {Object.keys(LABELS).map((k) => (
                      <td key={k} className={`text-center ${!isIncomplete && averaged ? scoreColor(averaged[k], MAX[k]) : 'text-text/40'}`}>
                        {!isIncomplete && averaged ? averaged[k] : '—'}
                      </td>
                    ))}
                    <td className="text-center">
                      {isIncomplete || finalTotal === null ? (
                        <span className="text-danger font-bold text-[10px] uppercase tracking-tight">
                          Pending Complete Evaluation
                        </span>
                      ) : (
                        <span className={`text-lg ${scoreBadge(finalTotal)} !text-base`}>
                          {finalTotal}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {!results.length && (
                  <tr><td colSpan={8} className="text-center text-text/40 py-12">No results for this section yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Feedback modal */}
      {viewFeedback && (
        <div className="fixed inset-0 bg-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-muted/30 flex justify-between items-center bg-bg">
              <h3 className="font-bold text-text">Feedback for {viewFeedback.group}</h3>
              <button onClick={() => setViewFeedback(null)} className="text-text/40 hover:text-text text-xl">×</button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {viewFeedback.items.map((item, i) => (
                <div key={i} className="bg-bg p-4 rounded-xl border border-muted/20">
                  <p className="text-[10px] font-extrabold text-primary uppercase tracking-widest mb-1">
                    Panel: {item.panel}
                  </p>
                  <p className="text-text/80 text-sm italic leading-relaxed">
                    "{item.text}"
                  </p>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-bg border-t border-muted/30 flex justify-end">
              <button onClick={() => setViewFeedback(null)} className="evl-btn-secondary !py-1.5 !text-xs">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
