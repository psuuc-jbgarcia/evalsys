import { useEffect, useState } from 'react';
import api from '../../services/api';

interface Section { _id: string; name: string; block: string; }
interface GroupResult {
  group: { _id: string; name: string; members: string[] };
  averaged: Record<string, number> | null;
  finalTotal: number | null;
  evaluatedBy?: string[];
  missingPanels?: string[];
  isIncomplete?: boolean;
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

  useEffect(() => { api.get('/sections').then((r) => setSections(r.data)); }, []);

  const loadResults = async (section: Section) => {
    setSelected(section);
    const res = await api.get(`/evaluations/section/${section._id}/results`);
    setResults(res.data);
  };

  const downloadCSV = () => {
    if (!selected || !results.length) return;

    const headers = ['Group', 'Members', ...Object.values(LABELS), 'Final Total', 'Evaluated By', 'Missing Panels'];
    const rows = results.map((r) => [
      r.group.name,
      r.group.members.join('; '),
      ...Object.keys(LABELS).map((k) => 
        r.averaged ? (r.averaged[k] || 0).toFixed(2) : '0.00'
      ),
      r.finalTotal !== null ? r.finalTotal.toFixed(2) : 'Pending',
      r.evaluatedBy?.join('; ') ?? '',
      r.missingPanels?.join('; ') ?? '',
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
        {sections.map((s) => (
          <button key={s._id} onClick={() => loadResults(s)}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150 ${
              selected?._id === s._id
                ? 'bg-primary text-white border-primary'
                : 'border-muted text-text/50 bg-surface hover:text-text hover:border-text/20'
            }`}>
            {s.name} — {s.block}
          </button>
        ))}
        {!sections.length && <p className="text-text/50 text-sm">No sections available.</p>}
      </div>

      {/* Results table */}
      {selected && (
        <div className="evl-card overflow-hidden">
          <div className="px-6 py-4 border-b border-muted/40 flex justify-between items-center">
            <h3 className="text-text font-bold text-sm">{selected.name} — {selected.block}</h3>
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
                {results.map(({ group, averaged, finalTotal, evaluatedBy, missingPanels, isIncomplete }) => (
                  <tr key={group._id}>
                    <td className="whitespace-nowrap">
                      <p className="font-semibold text-text">{group.name}</p>
                      {evaluatedBy && evaluatedBy.length > 0 && (
                        <p className="text-[10px] text-success/80 font-semibold tracking-wide uppercase mt-1">
                          Eval by: {evaluatedBy.join(', ')}
                        </p>
                      )}
                      {isIncomplete && missingPanels && missingPanels.length > 0 && (
                        <p className="text-[10px] text-danger font-bold tracking-wide uppercase mt-0.5">
                          Missing: {missingPanels.join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="text-text/50 text-xs max-w-[200px]">{group.members.join(', ') || '—'}</td>
                    {Object.keys(LABELS).map((k) => (
                      <td key={k} className={`text-center ${averaged ? scoreColor(averaged[k], MAX[k]) : 'text-text/40'}`}>
                        {averaged ? averaged[k] : '—'}
                      </td>
                    ))}
                    <td className="text-center">
                      {finalTotal !== null
                        ? <span className={`text-lg ${scoreBadge(finalTotal)} !text-base`}>{finalTotal}</span>
                        : <span className="text-text/40 text-xs">Pending</span>}
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
    </div>
  );
}
