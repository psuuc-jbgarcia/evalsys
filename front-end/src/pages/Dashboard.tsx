import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { CardSkeleton } from '../components/LoadingSkeleton';

interface Section { _id: string; name: string; block: string; }
interface Group { _id: string; name: string; section: Section; members: string[]; isGraded?: boolean; }
interface SubjectStatus {
  subject: { code: string; title: string } | null;
  sectionsMissingSubject: number;
  rubricsMissingSubject: number;
  evaluationsMissingSubject: number;
  adminsMissingDefaultSubject?: number;
  superadminCount?: number;
  defaultSuperadminExists?: boolean;
  defaultInstructorReady?: boolean;
  isComplete: boolean;
}

const groupNameCacheKey = 'grading_group_names';
const groupStatusCacheKey = (panelId: string) => `grading_group_status_${panelId}`;
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const formatApiError = (err: any, fallback: string) => {
  const status = err.response?.status ? `HTTP ${err.response.status}` : 'Network/connection error';
  const message = err.response?.data?.message || err.message || fallback;
  const detail = err.response?.data?.error ? `\n\nDetails: ${err.response.data.error}` : '';
  return `${fallback}\n\n${status}\n${message}${detail}`;
};

const adminCards = [
  { to: '/sections', label: 'Blocks', desc: 'Create and manage blocks', icon: '☰' },
  { to: '/groups', label: 'Groups', desc: 'Create groups and add members', icon: '⊞' },
  { to: '/users', label: 'Panel Accounts', desc: 'Create and manage panel accounts', icon: '⊕' },
  { to: '/assign-panels', label: 'Assign Panels', desc: 'Assign panel judges to specific blocks', icon: '👥' },
  { to: '/rubrics', label: 'Rubrics', desc: 'Create and manage grading rubrics', icon: '✎' },
  { to: '/results', label: 'Results', desc: 'View computed scores per group', icon: '▦' },
];

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === 'admin' || user?.role === 'superadmin') {
    return <AdminDashboard name={user.name} role={user.role} />;
  }
  return <PanelDashboard name={user?.name ?? ''} panelId={user?.id || user?._id || ''} />;
}

/* ── Admin view ── */
function AdminDashboard({ name, role }: { name: string; role: 'admin' | 'superadmin' }) {
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [migratingSubject, setMigratingSubject] = useState(false);
  const [subjectStatus, setSubjectStatus] = useState<SubjectStatus | null>(null);

  useEffect(() => {
    api.get('/settings').then(res => {
      setLocked(res.data.isGradingLocked);
      setLoading(false);
    });
    api.get('/subjects/migration-status')
      .then((res) => setSubjectStatus(res.data))
      .catch(() => undefined);
  }, []);

  const toggleLock = async () => {
    try {
      const res = await api.patch('/settings/toggle-lock');
      setLocked(res.data.isGradingLocked);
    } catch (err) {
      alert('Failed to toggle lock');
    }
  };

  const runDefaultSubjectMigration = async () => {
    const proceed = confirm(
      'Run the default subject migration now?\n\n' +
      'This will create/reuse IPT - Integrative Programming Technologies and attach old sections, rubrics, and evaluations to it.'
    );
    if (!proceed) return;

    setMigratingSubject(true);
    try {
      const status = await api.get('/subjects/migration-status');
      if (status.data.isComplete) {
        setSubjectStatus(status.data);
        alert(
          'Default subject migration is already complete.\n\n' +
          `Subject: ${status.data.subject.code} - ${status.data.subject.title}`
        );
        return;
      }

      const res = await api.post('/subjects/migrate-default');
      const nextStatus = await api.get('/subjects/migration-status');
      setSubjectStatus(nextStatus.data);
      alert(
        `${res.data.message}\n\n` +
        `Subject: ${res.data.subject.code} - ${res.data.subject.title}\n` +
        `Sections updated: ${res.data.sectionsUpdated}\n` +
        `Rubrics updated: ${res.data.rubricsUpdated}\n` +
        `Admins assigned: ${res.data.adminsAssigned}\n` +
        `${res.data.defaultSuperadmin ? `Default superadmin: ${res.data.defaultSuperadmin.email}\n` : ''}` +
        `${res.data.defaultInstructor ? `Default instructor: ${res.data.defaultInstructor.email}\n` : ''}` +
        `Evaluations updated: ${res.data.evaluationsUpdated}\n` +
        `Evaluations defaulted: ${res.data.evaluationsDefaulted}`
      );
    } catch (err: any) {
      alert(formatApiError(err, 'Default subject migration failed.'));
    } finally {
      setMigratingSubject(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="evl-page-title">Welcome back, {name}</h2>
          <p className="evl-page-subtitle">
            Manage blocks, groups, panel accounts, and rubrics from here.
          </p>
        </div>

        {subjectStatus?.subject && (
          <div className="evl-card px-5 py-3 flex items-center gap-4 bg-primary/5 border-primary/20">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-black">
              {subjectStatus.subject.code}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text/40">Subject In Use</span>
              <span className="text-xs font-extrabold text-text">{subjectStatus.subject.title}</span>
              {!subjectStatus.isComplete && (
                <span className="text-[10px] text-warning font-semibold">
                  Missing links: {subjectStatus.sectionsMissingSubject + subjectStatus.rubricsMissingSubject + subjectStatus.evaluationsMissingSubject + (subjectStatus.adminsMissingDefaultSubject || 0)}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Global Lock Card */}
        <div className={`evl-card px-5 py-3 flex items-center gap-4 transition-colors ${locked ? 'bg-danger/5 border-danger/20' : 'bg-success/5 border-success/20'}`}>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text/40">System Status</span>
            <span className={`text-xs font-extrabold uppercase ${locked ? 'text-danger' : 'text-success'}`}>
              {locked ? '🔒 Grading Locked' : '🔓 Grading Active'}
            </span>
          </div>
          <button 
            disabled={loading}
            onClick={toggleLock}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all ${
              locked 
                ? 'bg-success text-white hover:bg-success/90' 
                : 'bg-danger text-white hover:bg-danger/90'
            }`}
          >
            {locked ? 'Unlock System' : 'Lock System'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {adminCards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="evl-card p-6 group hover:border-primary/50 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-lg">
                {card.icon}
              </div>
            </div>
            <h3 className="text-text font-bold text-base mb-1 group-hover:text-primary transition-colors">
              {card.label}
            </h3>
            <p className="text-text/50 text-sm leading-relaxed">{card.desc}</p>
            <div className="mt-4 text-primary text-xs font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              Open →
            </div>
          </Link>
        ))}
      </div>

      {/* System Maintenance Section */}
      <div className="mt-12 pt-8 border-t border-muted/30">
        <div className="mb-6">
          <h3 className="text-text font-black text-lg tracking-tight">System Maintenance</h3>
          <p className="text-text/50 text-sm italic">Archive data or reset the system for a new event.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Archive Card */}
          <div className="evl-card p-6 border-primary/20 bg-primary/5">
            <h4 className="text-primary font-bold text-sm mb-2 uppercase tracking-widest">1. Archive & Backup</h4>
            <p className="text-text/60 text-xs mb-6 leading-relaxed">
              Download a master report containing ALL group results, scores, and comments from ALL blocks. 
              Always do this before a Master Reset.
            </p>
            <button 
              onClick={async () => {
                const res = await api.get('/evaluations/export-all');
                const headers = ['Section', 'GroupName', 'Members', 'AverageScore', 'Status', 'EvaluatedBy', 'MissingPanels', 'Comments'];
                const rows = res.data.map((r: any) => [
                  r.Section,
                  r.GroupName,
                  r.Members,
                  r.AverageScore,
                  r.Status,
                  r.EvaluatedBy,
                  r.MissingPanels,
                  r.Comments,
                ]);
                const csvContent = [
                  headers.map(csvCell).join(','),
                  ...rows.map((row: unknown[]) => row.map(csvCell).join(',')),
                ].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `Master_Results_Backup_${new Date().toLocaleDateString()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }}
              className="evl-btn-primary w-full py-3"
            >
              Download Master Results (CSV)
            </button>
          </div>

          {/* Reset Card */}
          <div className="evl-card p-6 border-danger/20 bg-danger/5">
            <h4 className="text-danger font-bold text-sm mb-2 uppercase tracking-widest">2. Master Reset System</h4>
            <p className="text-text/60 text-xs mb-6 leading-relaxed">
              Wipe all Evaluations, Groups, and Blocks. 
              <span className="font-bold text-danger"> This action cannot be undone.</span> Admin and Panel accounts will be preserved.
            </p>
            <button 
              onClick={async () => {
                const confirmText = window.prompt("To proceed, type 'RESET' in all caps:");
                if (confirmText === 'RESET') {
                  try {
                    await api.post('/evaluations/master-reset', { confirmText });
                    alert('System reset successful. All event data has been cleared.');
                    window.location.reload();
                  } catch (err: any) {
                    alert(err.response?.data?.message || 'Reset failed');
                  }
                } else if (confirmText !== null) {
                  alert('Invalid confirmation. Reset cancelled.');
                }
              }}
              className="evl-btn-secondary !bg-danger !text-white !border-danger w-full py-3 hover:opacity-90"
            >
              Wipe All Event Data
            </button>
          </div>
        </div>

        {role === 'superadmin' && (
          <div className="evl-card p-6 mt-5 border-primary/20 bg-surface">
            <h4 className="text-primary font-bold text-sm mb-2 uppercase tracking-widest">3. Subject Migration</h4>
            <p className="text-text/60 text-xs mb-6 leading-relaxed">
              Create or reuse IPT - Integrative Programming Technologies, then attach existing sections, rubrics, evaluations, and default accounts to that subject.
            </p>
            <button
              onClick={runDefaultSubjectMigration}
              disabled={migratingSubject}
              className={`evl-btn-secondary w-full py-3 ${migratingSubject ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {migratingSubject ? 'Running Migration...' : 'Run Default Subject Migration'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Panel view — choose section, see groups ── */
function PanelDashboard({ name, panelId }: { name: string; panelId: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [search, setSearch] = useState('');


  useEffect(() => {
    Promise.all([
      api.get('/sections'),
      api.get('/groups'),
      api.get('/settings')
    ]).then(([secRes, grpRes, setRes]) => {
      const fetchedSections = secRes.data;
      setSections(fetchedSections);
      if (fetchedSections.length > 0) {
        setSelectedSection(fetchedSections[0]._id);
      }
      setGroups(grpRes.data);
      if (panelId) {
        const groupNames = grpRes.data.reduce((acc: Record<string, string>, group: Group) => {
          acc[group._id] = group.name;
          return acc;
        }, {});
        const groupStatus = grpRes.data.reduce((acc: Record<string, { name: string; isGraded: boolean }>, group: Group) => {
          acc[group._id] = { name: group.name, isGraded: Boolean(group.isGraded) };
          return acc;
        }, {});
        localStorage.setItem(groupNameCacheKey, JSON.stringify(groupNames));
        localStorage.setItem(groupStatusCacheKey(panelId), JSON.stringify(groupStatus));
      }
      setLocked(setRes.data.isGradingLocked);
    })
    .catch((err) => console.error(err))
    .finally(() => setLoading(false));
  }, [panelId]);

  const filteredGroups = groups
    .filter((g) => {
      const sId = typeof g.section === 'string' ? g.section : g.section?._id;
      const matchesSection = !selectedSection || sId === selectedSection;
      const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase()) || 
                            g.members.some(m => m.toLowerCase().includes(search.toLowerCase()));
      return matchesSection && matchesSearch;
    })
    .sort((a, b) => {
      if (a.isGraded === b.isGraded) return 0;
      return a.isGraded ? 1 : -1;
    });

  const gradedCount = groups.filter(g => g.isGraded).length;
  const totalCount = groups.length;
  const progressPct = totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0;

  return (
    <div>
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="evl-page-title">Welcome back, {name}</h2>
          <p className="evl-page-subtitle">
            Select a block below and grade the groups assigned to you.
          </p>
          {locked && (
            <div className="mt-3 p-2.5 bg-danger/5 border border-danger/20 rounded-lg flex items-center gap-2 text-danger text-[11px] font-bold uppercase tracking-wider">
              <span>🔒 Grading is currently locked by Admin</span>
            </div>
          )}
        </div>

        {/* Progress Card */}
        {!loading && totalCount > 0 && (
          <div className="evl-card px-6 py-4 flex items-center gap-6 min-w-[280px] bg-surface/50 border-primary/20">
            <div className="flex-1">
              <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] font-bold text-text/40 uppercase tracking-widest">Your Progress</span>
                <span className="text-xs font-black text-primary">{gradedCount}/{totalCount} <span className="text-[10px] text-text/40 font-medium">Graded</span></span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full bg-primary transition-all duration-700" 
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-primary/10 flex items-center justify-center relative">
              <span className="text-[10px] font-black text-primary">{progressPct}%</span>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array(6).fill(0).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : sections.length === 0 ? (
        <div className="evl-card p-12 text-center">
          <div className="text-text/20 text-4xl mb-3">⊞</div>
          <p className="text-text/50 text-sm">No groups have been assigned to you yet.</p>
        </div>
      ) : (
        <>

      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center">
        {/* Section / Block tabs */}
        <div className="flex gap-2 flex-wrap flex-1">
          <button
            onClick={() => setSelectedSection(null)}
            className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all duration-150 ${
              !selectedSection
                ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                : 'border-muted/40 text-text/50 bg-surface hover:text-text'
            }`}
          >
            All Blocks
          </button>
          {sections.map((s) => (
            <button
              key={s._id}
              onClick={() => setSelectedSection(s._id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all duration-150 ${
                selectedSection === s._id
                  ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                  : 'border-muted/40 text-text/50 bg-surface hover:text-text'
              }`}
            >
              {s.block}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-64 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text/30 text-sm">🔍</span>
          <input 
            type="text"
            placeholder="Search group or student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="evl-input !py-2 !pl-9 !text-xs !bg-surface/50"
          />
        </div>
      </div>

          {/* Groups grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGroups.map((g) => (
              <Link
                key={g._id}
                to={`/grade?groupId=${g._id}`}
                className={`evl-card p-6 group transition-all duration-200 border-2 ${
                  g.isGraded 
                    ? 'border-success/20 bg-success/5 hover:border-success/40' 
                    : 'border-muted/60 hover:border-primary/50 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                    g.isGraded ? 'bg-success text-white' : 'bg-primary/10 text-primary'
                  }`}>
                    {g.isGraded ? '✓' : g.name.charAt(0)}
                  </div>
                  {g.isGraded ? (
                    <span className="evl-badge-success">Graded</span>
                  ) : (
                    <span className="evl-badge-primary opacity-50">Pending</span>
                  )}
                </div>
                <h3 className={`text-text font-bold text-base mb-1 transition-colors ${
                  !g.isGraded && 'group-hover:text-primary'
                }`}>
                  {g.name}
                </h3>
                <p className="text-text/50 text-sm leading-relaxed">
                  {g.members.length ? g.members.join(', ') : 'No members listed'}
                </p>
                <div className={`mt-4 text-xs font-semibold flex items-center gap-1 transition-all ${
                  g.isGraded ? 'text-success' : 'text-primary opacity-0 group-hover:opacity-100'
                }`}>
                  {g.isGraded ? 'Update Evaluation →' : 'Grade now →'}
                </div>
              </Link>
            ))}
            {filteredGroups.length === 0 && (
              <div className="col-span-full evl-card p-12 text-center">
                <p className="text-text/40 text-sm">No groups in this block.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
