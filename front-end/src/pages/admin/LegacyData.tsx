import { useEffect, useState } from 'react';
import api from '../../services/api';
import { notify } from '../../utils/notify';
import { formatMemberList, type Member } from '../../utils/members';

interface SubjectRef { code?: string; title?: string; }
interface OwnerRef { name?: string; email?: string; }
interface Section {
  _id: string;
  block: string;
  name: string;
  subject?: SubjectRef | null;
  createdBy?: OwnerRef | null;
  createdAt: string;
}
interface Group {
  _id: string;
  name: string;
  members: Member[];
  section?: {
    block?: string;
    subject?: SubjectRef | null;
  } | null;
  createdBy?: OwnerRef | null;
  createdAt: string;
}
interface Panel {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}
interface Result {
  _id: string;
  total?: number;
  comments?: string;
  scores?: Record<string, number>;
  legacyArchivedAt?: string;
  updatedAt: string;
  legacySnapshot?: {
    groupName?: string;
    block?: string;
    subject?: string;
    panelName?: string;
    panelEmail?: string;
    instructorName?: string;
    instructorEmail?: string;
    members?: Member[];
  };
}
interface LegacyDataResponse {
  sections: Section[];
  groups: Group[];
  panels: Panel[];
  results: Result[];
  legacyBefore?: string | null;
}
type DeleteTarget = {
  type: 'section' | 'group' | 'panel' | 'result' | 'all-results';
  id: string;
  name: string;
} | null;

const formatDate = (value: string) => new Date(value).toLocaleDateString([], {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

const subjectLabel = (subject?: SubjectRef | null) =>
  [subject?.code, subject?.title].filter(Boolean).join(' - ') || 'Unknown subject';
const ownerLabel = (owner?: OwnerRef | null) => owner?.name || owner?.email || 'No instructor owner';
const getErrorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
const normalizeLegacyData = (value: Partial<LegacyDataResponse>): LegacyDataResponse => ({
  sections: value.sections || [],
  groups: value.groups || [],
  panels: value.panels || [],
  results: value.results || [],
  legacyBefore: value.legacyBefore || null,
});
const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function LegacyData() {
  const [activeTab, setActiveTab] = useState<'sections' | 'groups' | 'panels' | 'results'>('sections');
  const [data, setData] = useState<LegacyDataResponse>({ sections: [], groups: [], panels: [], results: [] });
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/legacy-data');
      setData(normalizeLegacyData(res.data));
    } catch (err: unknown) {
      notify(getErrorMessage(err, 'Failed to load old data'), { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/legacy-data')
      .then((res) => setData(normalizeLegacyData(res.data)))
      .catch((err: unknown) => notify(getErrorMessage(err, 'Failed to load old data'), { type: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const path = deleteTarget.type === 'all-results'
        ? '/legacy-data/results'
        : `/legacy-data/${
          deleteTarget.type === 'section'
            ? 'sections'
            : deleteTarget.type === 'group'
              ? 'groups'
              : deleteTarget.type === 'panel'
                ? 'panels'
                : 'results'
        }/${deleteTarget.id}`;
      const res = await api.delete(path);
      notify(res.data.message, { type: 'success' });
      setDeleteTarget(null);
      await load();
    } catch (err: unknown) {
      notify(getErrorMessage(err, 'Failed to delete old data'), { type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const downloadOldResults = () => {
    const headers = ['Subject', 'Instructor', 'Block', 'Group', 'Members', 'Panel', 'Panel Email', 'Scores', 'Total', 'Comments', 'Archived'];
    const rows = data.results.map((result) => [
      result.legacySnapshot?.subject || '',
      result.legacySnapshot?.instructorName || '',
      result.legacySnapshot?.block || '',
      result.legacySnapshot?.groupName || '',
      formatMemberList(result.legacySnapshot?.members || [], '; '),
      result.legacySnapshot?.panelName || '',
      result.legacySnapshot?.panelEmail || '',
      JSON.stringify(result.scores || {}),
      result.total ?? '',
      result.comments || '',
      result.legacyArchivedAt || result.updatedAt,
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `evalsys_old_results_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="evl-page-title">Legacy Data</h2>
        <p className="evl-page-subtitle">
          Review unowned records, old panel accounts, and previous Admin-era data.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-muted/40 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab('sections')}
          className={`px-4 py-3 text-sm font-bold border-b-2 ${
            activeTab === 'sections' ? 'border-primary text-primary' : 'border-transparent text-text/50'
          }`}
        >
          Old Blocks ({data.sections.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-3 text-sm font-bold border-b-2 ${
            activeTab === 'groups' ? 'border-primary text-primary' : 'border-transparent text-text/50'
          }`}
        >
          Old Groups ({data.groups.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('panels')}
          className={`px-4 py-3 text-sm font-bold border-b-2 ${
            activeTab === 'panels' ? 'border-primary text-primary' : 'border-transparent text-text/50'
          }`}
        >
          Old Panel Accounts ({data.panels.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('results')}
          className={`px-4 py-3 text-sm font-bold border-b-2 ${
            activeTab === 'results' ? 'border-primary text-primary' : 'border-transparent text-text/50'
          }`}
        >
          Old Results ({data.results.length})
        </button>
      </div>

      {activeTab === 'results' && data.results.length > 0 && (
        <div className="flex justify-end gap-2 mb-3">
          <button type="button" onClick={downloadOldResults} className="evl-btn-secondary">
            Download Results CSV
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget({ type: 'all-results', id: '', name: 'all old results' })}
            className="evl-btn-danger"
          >
            Delete All Results
          </button>
        </div>
      )}

      <div className="overflow-x-auto border border-muted/40 rounded-lg bg-surface">
        <table className="evl-table min-w-[760px]">
          <thead>
            {activeTab === 'sections' ? (
              <tr><th>Block</th><th>Subject</th><th>Previous Owner</th><th>Created</th><th className="text-right">Actions</th></tr>
            ) : activeTab === 'groups' ? (
              <tr><th>Group</th><th>Block</th><th>Subject</th><th>Previous Owner</th><th>Members</th><th>Created</th><th className="text-right">Actions</th></tr>
            ) : activeTab === 'panels' ? (
              <tr><th>Panel</th><th>Email</th><th>Status</th><th>Owner</th><th>Created</th><th className="text-right">Actions</th></tr>
            ) : (
              <tr><th>Group</th><th>Block</th><th>Panel</th><th>Members</th><th>Score</th><th>Archived</th><th className="text-right">Actions</th></tr>
            )}
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={activeTab === 'sections' ? 5 : activeTab === 'panels' ? 6 : 7} className="text-center py-12 text-text/40">Loading old data...</td></tr>
            ) : activeTab === 'sections' ? data.sections.map((section) => (
              <tr key={section._id}>
                <td className="font-bold text-text">{section.block || section.name}</td>
                <td>{subjectLabel(section.subject)}</td>
                <td>{ownerLabel(section.createdBy)}</td>
                <td>{formatDate(section.createdAt)}</td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ type: 'section', id: section._id, name: section.block || section.name })}
                    className="evl-btn-danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )) : activeTab === 'groups' ? data.groups.map((group) => (
              <tr key={group._id}>
                <td className="font-bold text-text">{group.name}</td>
                <td>{group.section?.block || 'Unknown block'}</td>
                <td>{subjectLabel(group.section?.subject)}</td>
                <td>{ownerLabel(group.createdBy)}</td>
                <td className="max-w-[300px] truncate">{formatMemberList(group.members) || 'No members'}</td>
                <td>{formatDate(group.createdAt)}</td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ type: 'group', id: group._id, name: group.name })}
                    className="evl-btn-danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )) : activeTab === 'panels' ? data.panels.map((panel) => (
              <tr key={panel._id}>
                <td className="font-bold text-text">{panel.name}</td>
                <td>{panel.email}</td>
                <td>
                  <span className={panel.isActive ? 'evl-badge-success' : 'evl-badge-danger'}>
                    {panel.isActive ? 'Active' : 'Blocked'}
                  </span>
                </td>
                <td>No instructor owner</td>
                <td>{formatDate(panel.createdAt)}</td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ type: 'panel', id: panel._id, name: panel.name })}
                    className="evl-btn-danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            )) : data.results.map((result) => (
              <tr key={result._id}>
                <td>
                  <p className="font-bold text-text">{result.legacySnapshot?.groupName || 'Deleted old group'}</p>
                  <p className="text-[11px] text-text/45 mt-0.5">{result.legacySnapshot?.subject || 'Unknown subject'}</p>
                </td>
                <td>{result.legacySnapshot?.block || 'Deleted old block'}</td>
                <td>
                  <p>{result.legacySnapshot?.panelName || 'Deleted old panel'}</p>
                  <p className="text-[11px] text-text/45 mt-0.5">{result.legacySnapshot?.panelEmail}</p>
                  {result.legacySnapshot?.instructorName && (
                    <p className="text-[11px] text-primary/70 mt-1">
                      Instructor: {result.legacySnapshot.instructorName}
                    </p>
                  )}
                </td>
                <td className="max-w-[280px] truncate">
                  {formatMemberList(result.legacySnapshot?.members || []) || 'No member snapshot'}
                </td>
                <td className="font-black text-primary">{typeof result.total === 'number' ? result.total : 'Pending'}</td>
                <td>{formatDate(result.legacyArchivedAt || result.updatedAt)}</td>
                <td className="text-right">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({
                      type: 'result',
                      id: result._id,
                      name: `${result.legacySnapshot?.groupName || 'old group'} result`,
                    })}
                    className="evl-btn-danger"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && activeTab === 'sections' && !data.sections.length && (
              <tr><td colSpan={5} className="text-center py-12 text-text/40">No old blocks found.</td></tr>
            )}
            {!loading && activeTab === 'groups' && !data.groups.length && (
              <tr><td colSpan={7} className="text-center py-12 text-text/40">No old groups found.</td></tr>
            )}
            {!loading && activeTab === 'panels' && !data.panels.length && (
              <tr><td colSpan={6} className="text-center py-12 text-text/40">No old panel accounts found.</td></tr>
            )}
            {!loading && activeTab === 'results' && !data.results.length && (
              <tr><td colSpan={7} className="text-center py-12 text-text/40">No archived old results found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] bg-dark/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-muted/40 rounded-lg shadow-xl p-6">
            <h3 className="font-extrabold text-text text-lg">
              {deleteTarget.type === 'all-results'
                ? 'Delete all old results?'
                : `Delete old ${
                  deleteTarget.type === 'section'
                    ? 'block'
                    : deleteTarget.type === 'group'
                      ? 'group'
                      : deleteTarget.type === 'panel'
                        ? 'panel account'
                        : 'result'
                }?`}
            </h3>
            <p className="text-text/60 text-sm mt-2">
              <strong>{deleteTarget.name}</strong> will be permanently deleted.
              {deleteTarget.type === 'section' && ' Its groups will also be deleted, but their results will remain under Old Results.'}
              {deleteTarget.type === 'group' && ' Its results will remain under Old Results.'}
              {deleteTarget.type === 'panel' && ' Its assignments will also be removed, but its results will remain under Old Results.'}
              {deleteTarget.type === 'all-results' && ' This will not affect current instructor results.'}
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="evl-btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="evl-btn-danger">
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
