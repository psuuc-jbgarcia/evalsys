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
    </div>
  );
}

/* ── Panel view — choose section, see groups ── */
function PanelDashboard({ name }: { name: string }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/sections'),
      api.get('/groups')
    ]).then(([secRes, grpRes]) => {
      const fetchedSections = secRes.data;
      setSections(fetchedSections);
      if (fetchedSections.length > 0) {
        setSelectedSection(fetchedSections[0]._id);
      }
      setGroups(grpRes.data);
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
