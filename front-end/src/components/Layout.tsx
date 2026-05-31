import { type ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '◫' },
  { to: '/sections', label: 'Blocks', icon: '☰' },
  { to: '/groups', label: 'Groups', icon: '⊞' },
  { to: '/users', label: 'Accounts', icon: '⊕' },
  { to: '/assign-panels', label: 'Assign Panels', icon: '👥' },
  { to: '/rubrics', label: 'Rubrics', icon: '✎' },
  { to: '/results', label: 'Results', icon: '▦' },
];

const panelLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '◫' },
  { to: '/grade', label: 'Grade Groups', icon: '✎' },
];

const getPanelId = (user?: any) => user?.id || user?._id || '';
const groupNameCacheKey = 'grading_group_names';
const groupStatusCacheKey = (panelId: string) => `grading_group_status_${panelId}`;
const selectedRubricCacheKey = (panelId: string) => `grading_selected_rubric_${panelId}`;
const currentSubjectKey = 'evalsys_current_subject_id';
const roleLabel = (role?: string) => {
  if (role === 'admin') return 'instructor';
  if (role === 'superadmin') return 'superadmin';
  return role || '';
};

interface Subject {
  _id: string;
  code: string;
  title: string;
}

const hasDraftContent = (draft: any) => {
  const scores = draft?.scores || {};
  const hasScores = Object.values(scores).some((value) => value !== '' && value !== null && value !== undefined);
  return hasScores || Boolean(draft?.comments?.trim());
};

const getPanelDraftGroups = (panelId?: string) => {
  if (!panelId) return [];
  const prefix = `grading_draft_${panelId}_`;
  const selectedRubricId = localStorage.getItem(selectedRubricCacheKey(panelId));
  let cachedNames: Record<string, string> = {};
  let cachedStatus: Record<string, { name?: string; isGraded?: boolean }> = {};
  try {
    cachedNames = JSON.parse(localStorage.getItem(groupNameCacheKey) || '{}');
  } catch {
    localStorage.removeItem(groupNameCacheKey);
  }
  try {
    cachedStatus = JSON.parse(localStorage.getItem(groupStatusCacheKey(panelId)) || '{}');
  } catch {
    localStorage.removeItem(groupStatusCacheKey(panelId));
  }
  return Object.keys(localStorage).filter((key) => {
    return key.startsWith(prefix);
  }).map((key) => {
    try {
      const draft = JSON.parse(localStorage.getItem(key) || 'null');
      if (!hasDraftContent(draft)) return null;
      if (selectedRubricId && draft?.rubricId !== selectedRubricId) return null;
      const groupId = draft?.groupId || key.replace(prefix, '');
      if (cachedStatus[groupId]?.isGraded) {
        localStorage.removeItem(key);
        return null;
      }
      return draft?.groupName || cachedStatus[groupId]?.name || cachedNames[groupId] || `Group ${groupId}`;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }).filter(Boolean) as string[];
};

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const links = user?.role === 'admin' || user?.role === 'superadmin' ? adminLinks : panelLinks;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentSubjectId, setCurrentSubjectId] = useState(() => localStorage.getItem(currentSubjectKey) || '');

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'superadmin') return;
    api.get('/subjects')
      .then((res) => {
        setSubjects(res.data);
        const saved = localStorage.getItem(currentSubjectKey);
        const savedExists = res.data.some((subject: Subject) => subject._id === saved);
        if (!savedExists && res.data.length > 0) {
          localStorage.setItem(currentSubjectKey, res.data[0]._id);
          setCurrentSubjectId(res.data[0]._id);
        }
      })
      .catch(() => undefined);
  }, [user?.role]);

  const handleSubjectChange = (subjectId: string) => {
    localStorage.setItem(currentSubjectKey, subjectId);
    setCurrentSubjectId(subjectId);
    window.location.reload();
  };

  const handleCreateSubject = async () => {
    const code = prompt('Subject code (example: IPT)');
    if (!code) return;
    const title = prompt('Subject title (example: Integrative Programming Technologies)');
    if (!title) return;
    try {
      const res = await api.post('/subjects', { code, title });
      localStorage.setItem(currentSubjectKey, res.data._id);
      setCurrentSubjectId(res.data._id);
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create subject');
    }
  };

  const handleLogout = () => {
    const draftGroups = user?.role === 'panel' ? getPanelDraftGroups(getPanelId(user)) : [];
    const draftCount = draftGroups.length;
    if (draftCount > 0) {
      const shownGroups = draftGroups.slice(0, 8).map((name) => `- ${name}`).join('\n');
      const extraGroups = draftCount > 8 ? `\n...and ${draftCount - 8} more` : '';
      const proceed = confirm(
        `You still have ${draftCount} unsubmitted grading draft${draftCount === 1 ? '' : 's'} saved only on this browser.\n\n` +
        `Groups:\n${shownGroups}${extraGroups}\n\n` +
        'If you sign out, those scores are NOT submitted yet. They can only be restored by logging back in on this same device/browser.\n\n' +
        'Do you still want to sign out?'
      );
      if (!proceed) return;
    }
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-bg relative">
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-dark flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-extrabold">
            E
          </div>
          <h1 className="text-white font-bold text-sm">EvalSys</h1>
        </div>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-10 h-10 flex items-center justify-center text-white text-2xl"
        >
          {mobileOpen ? '×' : '☰'}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-dark/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${collapsed ? 'lg:w-[68px]' : 'lg:w-60'} 
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          lg:translate-x-0 lg:flex
          fixed lg:sticky top-0 h-screen left-0
          bg-dark flex flex-col shrink-0 transition-all duration-200 z-50
        `}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-extrabold">
              E
            </div>
            {(!collapsed || mobileOpen) && (
              <div>
                <h1 className="text-white font-bold text-sm leading-none">EvalSys</h1>
                <p className="text-white/40 text-[10px] mt-0.5 uppercase tracking-widest font-semibold">
                  {roleLabel(user?.role)}
                </p>
              </div>
            )}
          </div>
          {/* Collapse toggle (only desktop) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-6 h-6 items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xs"
          >
            {collapsed ? '▸' : '◂'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 flex-1 px-3 py-4 overflow-y-auto">
          {(user?.role === 'admin' || user?.role === 'superadmin') && (!collapsed || mobileOpen) && (
            <div className="mb-4 px-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-1.5">
                Current Subject
              </label>
              <select
                value={currentSubjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-white/10 text-white text-xs px-2 py-2 outline-none"
              >
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.code} - {subject.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleCreateSubject}
                className="mt-2 w-full text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg py-1.5 transition-colors"
              >
                + Add Subject
              </button>
            </div>
          )}
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${isActive
                    ? 'bg-primary text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
              >
                <span className="text-base leading-none w-5 text-center shrink-0">{link.icon}</span>
                {(!collapsed || mobileOpen) && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-white/10 p-3 shrink-0">
          {(!collapsed || mobileOpen) ? (
            <>
              <div className="flex items-center gap-2.5 mb-3 px-1">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-xs font-bold uppercase shrink-0">
                  {user?.name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
                  <p className="text-white/40 text-[10px] truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-xs text-white/40 hover:text-danger hover:bg-danger/10 py-2 rounded-lg transition-colors font-medium"
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full text-white/40 hover:text-danger py-2 flex items-center justify-center text-sm transition-colors"
            >
              ⏻
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8 2xl:px-14">{children}</div>
      </main>
    </div>
  );
}
