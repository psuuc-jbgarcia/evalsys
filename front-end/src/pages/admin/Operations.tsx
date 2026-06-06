import { useEffect, useState } from 'react';
import api from '../../services/api';
import { notify } from '../../utils/notify';

interface AuditLog {
  _id: string;
  action: string;
  status: string;
  createdAt: string;
  actor?: { name?: string; email?: string; role?: string };
  entity?: { type?: string; name?: string };
  metadata?: { reason?: string; failedLoginAttempts?: number; lockUntil?: string };
}

interface ActivityStatus {
  latestLogins: AuditLog[];
  failedLogins: AuditLog[];
  recentActions: AuditLog[];
  latestSubmissions: Array<{
    _id: string;
    updatedAt: string;
    group?: { name?: string };
    panel?: { name?: string; email?: string };
    total?: number;
  }>;
}

interface InstructorSummary {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  subjectLimit: number;
  subjectsUsed: number;
  groups: number;
  panels: number;
  evaluationsCompleted: number;
  csvExportLocked: boolean;
  gradingLockedSubjects: string[];
  proposalStorageMb: number;
}

interface ProposalCleanup {
  totalFiles: number;
  linkedFiles: number;
  orphanFiles: number;
  orphans: Array<{ path: string; size: number; updatedAt?: string; mimeType?: string }>;
}

const backupTypes = ['users', 'subjects', 'groups', 'results', 'archive', 'rubrics', 'registrationLinks'];

const formatAction = (action = '') => action
  .split('.')
  .map((part) => part.replace(/_/g, ' '))
  .join(' / ');

const formatDate = (value?: string) => value ? new Date(value).toLocaleString() : 'Unknown';

const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export default function Operations() {
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<InstructorSummary[]>([]);
  const [cleanup, setCleanup] = useState<ProposalCleanup | null>(null);
  const [backupAction, setBackupAction] = useState('');

  const load = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const [activityRes, auditRes, summaryRes, cleanupRes] = await Promise.all([
        api.get('/operations/activity'),
        api.get('/operations/audit-logs', { params: { limit: 40 } }),
        api.get('/operations/instructor-summary'),
        api.get('/operations/proposal-orphans'),
      ]);
      setActivity(activityRes.data);
      setAuditLogs(auditRes.data);
      setSummary(summaryRes.data);
      setCleanup(cleanupRes.data);
    } catch (err: any) {
      notify(err.response?.data?.message || 'Failed to load operations data', { type: 'error' });
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(false), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const handleBackup = async (type: string) => {
    setBackupAction(type);
    try {
      const res = await api.get(`/operations/backup/${type}`);
      downloadJson(`evalsys_${type}_backup.json`, res.data);
      notify(`${type} backup downloaded`, { type: 'success' });
    } catch (err: any) {
      notify(err.response?.data?.message || 'Backup export failed', { type: 'error' });
    } finally {
      setBackupAction('');
    }
  };

  if (loading) {
    return (
      <div>
        <h2 className="evl-page-title mb-6">Operations</h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-surface border border-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div>
          <h2 className="evl-page-title">Operations</h2>
          <p className="evl-page-subtitle">Monitor system activity, instructor usage, proposal storage, and backups.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <ActivityMonitor activity={activity} />

        <div className="evl-card p-5">
          <h3 className="font-bold text-text text-sm mb-4">Proposal Cleanup</h3>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Files" value={cleanup?.totalFiles ?? 0} />
            <Metric label="Linked" value={cleanup?.linkedFiles ?? 0} />
            <Metric label="Orphan" value={cleanup?.orphanFiles ?? 0} danger={Boolean(cleanup?.orphanFiles)} />
          </div>
          <p className="text-[11px] text-text/65 mt-4 leading-relaxed">
            Orphan files are in Supabase Storage but not linked to any group record.
          </p>
        </div>

        <div className="evl-card p-5">
          <h3 className="font-bold text-text text-sm mb-4">Backup Center</h3>
          <div className="flex flex-wrap gap-2">
            {backupTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleBackup(type)}
                disabled={Boolean(backupAction)}
                className="evl-btn-secondary !py-2 !px-3 !text-xs capitalize"
              >
                {backupAction === type ? 'Exporting...' : type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="evl-card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-muted/30">
          <h3 className="font-bold text-text text-sm">Per-Instructor Summary</h3>
        </div>
        <table className="evl-table">
          <thead>
            <tr>
              <th>Instructor</th>
              <th>Subjects</th>
              <th>Groups</th>
              <th>Panels</th>
              <th>Evaluations</th>
              <th>CSV</th>
              <th>Locked Subjects</th>
              <th>Proposal MB</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => (
              <tr key={row._id}>
                <td>
                  <p className="font-bold text-text text-sm">{row.name}</p>
                  <p className="text-xs text-text/65">{row.email}</p>
                </td>
                <td className="font-bold text-text/80">{row.subjectsUsed}/{row.subjectLimit}</td>
                <td>{row.groups}</td>
                <td>{row.panels}</td>
                <td>{row.evaluationsCompleted}</td>
                <td>
                  <span className={row.csvExportLocked ? 'evl-badge-danger' : 'evl-badge-success'}>
                    {row.csvExportLocked ? 'Locked' : 'Allowed'}
                  </span>
                </td>
                <td>{row.gradingLockedSubjects?.length || 0}</td>
                <td>{row.proposalStorageMb}</td>
              </tr>
            ))}
            {!summary.length && (
              <tr><td colSpan={8} className="text-center text-text/70 py-10">No instructors found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <LogPanel title="Recent Actions" logs={auditLogs} />
        <LogPanel title="Failed Login Details" logs={activity?.failedLogins || []} showFailureMeta />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-6">
        <div className="evl-card overflow-hidden">
          <div className="px-5 py-4 border-b border-muted/30">
            <h3 className="font-bold text-text text-sm">Latest Panel Submissions</h3>
          </div>
          <div className="divide-y divide-muted/30">
            {(activity?.latestSubmissions || []).map((item) => (
              <div key={item._id} className="p-4">
                <p className="text-sm font-bold text-text">{item.group?.name || 'Deleted group'}</p>
                <p className="text-xs text-text/70 mt-1">
                  {item.panel?.name || 'Panel'} submitted {item.total ?? 0} pts · {formatDate(item.updatedAt)}
                </p>
              </div>
            ))}
            {!activity?.latestSubmissions?.length && (
              <p className="p-5 text-sm text-text/70">No submissions yet.</p>
            )}
          </div>
        </div>
      </div>

      {cleanup?.orphans?.length ? (
        <div className="evl-card overflow-hidden mt-6">
          <div className="px-5 py-4 border-b border-muted/30">
            <h3 className="font-bold text-text text-sm">Orphan Proposal Files</h3>
          </div>
          <table className="evl-table">
            <thead>
              <tr>
                <th>Path</th>
                <th>Size</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {cleanup.orphans.map((file) => (
                <tr key={file.path}>
                  <td className="text-xs text-text/70 max-w-[520px] truncate">{file.path}</td>
                  <td>{Math.round((file.size / 1024 / 1024) * 100) / 100} MB</td>
                  <td>{formatDate(file.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function ActivityMonitor({ activity }: { activity: ActivityStatus | null }) {
  const latestLogin = activity?.latestLogins?.[0];
  const latestSubmission = activity?.latestSubmissions?.[0];
  const latestFailed = activity?.failedLogins?.[0];

  return (
    <div className="evl-card p-5 xl:col-span-1">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-text text-sm">Activity Monitor</h3>
          <p className="text-xs text-text/65 mt-0.5">Recent login and grading activity.</p>
        </div>
        <span className={activity?.failedLogins?.length ? 'evl-badge-warning' : 'evl-badge-success'}>
          Live
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <Metric label="Logins" value={activity?.latestLogins.length ?? 0} />
        <Metric label="Submits" value={activity?.latestSubmissions.length ?? 0} />
        <Metric label="Failed" value={activity?.failedLogins.length ?? 0} danger={Boolean(activity?.failedLogins.length)} />
      </div>

      <div className="space-y-3">
        <ActivityLine
          label="Latest login"
          title={latestLogin?.actor?.name || latestLogin?.actor?.email || 'No login yet'}
          detail={latestLogin ? `${latestLogin.actor?.role || 'account'} · ${formatDate(latestLogin.createdAt)}` : 'No successful login recorded.'}
        />
        <ActivityLine
          label="Latest submission"
          title={latestSubmission?.group?.name || 'No submission yet'}
          detail={latestSubmission ? `${latestSubmission.panel?.name || 'Panel'} · ${latestSubmission.total ?? 0} pts · ${formatDate(latestSubmission.updatedAt)}` : 'No panel submission recorded.'}
        />
        <ActivityLine
          label="Latest failed login"
          title={latestFailed?.actor?.email || latestFailed?.actor?.name || 'No failed login'}
          detail={latestFailed ? `${latestFailed.metadata?.reason || 'failed'} · ${formatDate(latestFailed.createdAt)}` : 'No failed login recorded.'}
          danger={Boolean(latestFailed)}
        />
      </div>
    </div>
  );
}

function ActivityLine({
  label,
  title,
  detail,
  danger = false,
}: {
  label: string;
  title: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-muted/40 bg-bg/60 px-3 py-2.5">
      <p className="text-[10px] font-black uppercase tracking-widest text-text/60">{label}</p>
      <p className={`text-sm font-black mt-0.5 truncate ${danger ? 'text-danger' : 'text-text'}`}>{title}</p>
      <p className="text-xs text-text/70 mt-0.5 truncate">{detail}</p>
    </div>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-text/60">{label}</p>
      <p className={`text-2xl font-black ${danger ? 'text-danger' : 'text-text'}`}>{value}</p>
    </div>
  );
}

function LogPanel({ title, logs, showFailureMeta = false }: { title: string; logs: AuditLog[]; showFailureMeta?: boolean }) {
  return (
    <div className="evl-card overflow-hidden">
      <div className="px-5 py-4 border-b border-muted/30">
        <h3 className="font-bold text-text text-sm">{title}</h3>
      </div>
      <div className="divide-y divide-muted/30">
        {logs.map((log) => (
          <div key={log._id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-text capitalize">{formatAction(log.action)}</p>
              <span className={log.status === 'failed' ? 'evl-badge-danger' : 'evl-badge-success'}>
                {log.status}
              </span>
            </div>
            <p className="text-xs text-text/70 mt-1">
              {log.actor?.name || log.actor?.email || 'System'} · {formatDate(log.createdAt)}
            </p>
            {showFailureMeta && (
              <p className="text-xs text-text/70 mt-1">
                Reason: {log.metadata?.reason || 'unknown'}
                {log.metadata?.failedLoginAttempts ? ` - Attempts: ${log.metadata.failedLoginAttempts}` : ''}
                {log.metadata?.lockUntil ? ` - Locked until ${formatDate(log.metadata.lockUntil)}` : ''}
              </p>
            )}
          </div>
        ))}
        {!logs.length && <p className="p-5 text-sm text-text/70">No activity logged yet.</p>}
      </div>
    </div>
  );
}
