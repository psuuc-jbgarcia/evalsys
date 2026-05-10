import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

interface Section { _id: string; name: string; block: string; }
interface Group { _id: string; name: string; section: Section; members: string[]; isGraded?: boolean; }

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

  if (user?.role === 'admin') return <AdminDashboard name={user.name} />;
  return <PanelDashboard name={user?.name ?? ''} />;
}

/* ── Admin view ── */
function AdminDashboard({ name }: { name: string }) {
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings').then(res => {
      setLocked(res.data.isGradingLocked);
      setLoading(false);
    });
  }, []);

  const toggleLock = async () => {
    try {
      const res = await api.patch('/settings/toggle-lock');
      setLocked(res.data.isGradingLocked);
    } catch (err) {
      alert('Failed to toggle lock');
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
                const csvContent = "data:text/csv;charset=utf-8," 
                  + ["Section,GroupName,Members,AverageScore,EvaluatedBy,Comments", 
                     ...res.data.map((r: any) => `${r.Section},${r.GroupName},"${r.Members}",${r.AverageScore},"${r.EvaluatedBy}","${r.Comments}"`)
                    ].join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `Master_Results_Backup_${new Date().toLocaleDateString()}.csv`);
                document.body.appendChild(link);
                link.click();
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
      </div>
    </div>
  );
}

/* ── Panel view — choose section, see groups ── */
function PanelDashboard({ name }: { name: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);


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
      setLocked(setRes.data.isGradingLocked);
    })
    .catch((err) => console.error(err))
    .finally(() => setLoading(false));
  }, []);

  const filteredGroups = selectedSection
    ? groups.filter((g) => {
        const sId = typeof g.section === 'string' ? g.section : g.section?._id;
        return sId === selectedSection;
      })
    : groups;

  return (
    <div>
      <div className="mb-8">
        <h2 className="evl-page-title">Welcome back, {name}</h2>
        <p className="evl-page-subtitle">
          Select a block below and grade the groups assigned to you.
        </p>
        {locked && (
          <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-center gap-2 text-danger text-sm font-bold">
            <span>🔒 GRADING IS CURRENTLY LOCKED</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : sections.length === 0 ? (
        <div className="evl-card p-12 text-center">
          <div className="text-text/20 text-4xl mb-3">⊞</div>
          <p className="text-text/50 text-sm">No groups have been assigned to you yet.</p>
        </div>
      ) : (
        <>
          {/* Section / Block tabs */}
          <div className="flex gap-2 flex-wrap mb-6">
            {sections.map((s) => (
              <button
                key={s._id}
                onClick={() => setSelectedSection(s._id)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150 ${
                  selectedSection === s._id
                    ? 'bg-primary text-white border-primary'
                    : 'border-muted text-text/50 bg-surface hover:text-text hover:border-text/20'
                }`}
              >
                {s.block}
              </button>
            ))}
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
