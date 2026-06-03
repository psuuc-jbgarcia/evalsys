import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '◫' },
  { to: '/subjects', label: 'Subjects', icon: '📚' },
  { to: '/sections', label: 'Sections', icon: '☰' },
  { to: '/groups', label: 'Groups', icon: '⊞' },
  { to: '/users', label: 'Panel Accounts', superadminLabel: 'Accounts', icon: '⊕' },
  { to: '/assign-panels', label: 'Assign Panels', icon: '👥' },
  { to: '/rubrics', label: 'Rubrics', icon: '✎' },
  { to: '/results', label: 'Results', icon: '▦' },
  { to: '/registration-links', label: 'Registration Links', icon: 'RL' },
];

const panelLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '◫' },
  { to: '/grade', label: 'Grade Groups', icon: '✎' },
];

type NavIconName = 'dashboard' | 'sections' | 'groups' | 'users' | 'assign' | 'rubrics' | 'results' | 'link' | 'grade' | 'subjects' | 'subscription';

const getNavIconName = (to: string): NavIconName => {
  if (to === '/subjects') return 'subjects';
  if (to === '/sections') return 'sections';
  if (to === '/groups') return 'groups';
  if (to === '/users') return 'users';
  if (to === '/assign-panels') return 'assign';
  if (to === '/rubrics') return 'rubrics';
  if (to === '/results') return 'results';
  if (to === '/registration-links') return 'link';
  if (to === '/grade') return 'grade';
  if (to === '/subscription') return 'subscription';
  return 'dashboard';
};

const NavIcon = ({ name }: { name: NavIconName }) => {
  const common = {
    className: 'w-[18px] h-[18px]',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'dashboard') {
    return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
  }
  if (name === 'subjects') {
    return <svg {...common}><path d="M4 19V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14" /><path d="M4 19h16" /><path d="M9 7h6" /><path d="M9 11h6" /></svg>;
  }
  if (name === 'sections') {
    return <svg {...common}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>;
  }
  if (name === 'groups') {
    return <svg {...common}><rect x="3" y="4" width="7" height="7" rx="1.5" /><rect x="14" y="4" width="7" height="7" rx="1.5" /><rect x="3" y="15" width="7" height="5" rx="1.5" /><rect x="14" y="15" width="7" height="5" rx="1.5" /></svg>;
  }
  if (name === 'users') {
    return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.8-3.2 2.7-5 5.5-5s4.7 1.8 5.5 5" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 14.5c2.4.3 4 1.8 4.8 4.5" /></svg>;
  }
  if (name === 'assign') {
    return <svg {...common}><circle cx="7" cy="8" r="3" /><path d="M2.8 19c.8-3.1 2.2-5 4.2-5s3.4 1.9 4.2 5" /><path d="M15 7h6" /><path d="M18 4v6" /><path d="M15 17h6" /></svg>;
  }
  if (name === 'rubrics') {
    return <svg {...common}><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m13.5 8.5 2 2" /></svg>;
  }
  if (name === 'results') {
    return <svg {...common}><path d="M4 19V5" /><path d="M4 19h16" /><rect x="7" y="11" width="3" height="5" rx="1" /><rect x="12" y="8" width="3" height="8" rx="1" /><rect x="17" y="4" width="3" height="12" rx="1" /></svg>;
  }
  if (name === 'link') {
    return <svg {...common}><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" /></svg>;
  }
  if (name === 'subscription') {
    return <svg {...common}><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" /><path d="M12 8v4l3 3" /></svg>;
  }
  return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>;
};

interface UserRef {
  id?: string;
  _id?: string;
}

interface GradingDraft {
  scores?: Record<string, unknown>;
  comments?: string;
  rubricId?: string;
  groupId?: string;
  groupName?: string;
}

const getPanelId = (user?: UserRef) => user?.id || user?._id || '';
const groupNameCacheKey = 'grading_group_names';
const groupStatusCacheKey = (panelId: string) => `grading_group_status_${panelId}`;
const selectedRubricCacheKey = (panelId: string) => `grading_selected_rubric_${panelId}`;
const currentSubjectKey = 'evalsys_current_subject_id';
const roleLabel = (role?: string) => {
  if (role === 'admin') return 'Instructor';
  if (role === 'superadmin') return 'Super Admin';
  if (role === 'panel') return 'Panel';
  return role || '';
};

interface Subject {
  _id: string;
  code: string;
  title: string;
}

const hasDraftContent = (draft?: GradingDraft | null) => {
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
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);

  const currentSubject = useMemo(
    () => subjects.find((subject) => subject._id === currentSubjectId) || null,
    [subjects, currentSubjectId]
  );

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
    if (!subjectId || subjectId === currentSubjectId) {
      setSubjectMenuOpen(false);
      return;
    }
    localStorage.setItem(currentSubjectKey, subjectId);
    setCurrentSubjectId(subjectId);
    setSubjectMenuOpen(false);
    window.location.reload();
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSubjectMenuOpen((open) => !open)}
                  className="w-full min-h-10 rounded-lg bg-white/10 border border-white/10 text-white text-left px-3 py-2 outline-none hover:bg-white/15 focus:ring-2 focus:ring-primary/40 transition-colors"
                  title={currentSubject ? `${currentSubject.code} - ${currentSubject.title}` : 'Select subject'}
                >
                  <span className="block text-xs font-bold truncate pr-5">
                    {currentSubject ? `${currentSubject.code} - ${currentSubject.title}` : 'Select subject'}
                  </span>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-[10px]">
                    {subjectMenuOpen ? '^' : 'v'}
                  </span>
                </button>

                {subjectMenuOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-white/10 bg-dark shadow-xl z-50 overflow-hidden">
                    <div className="max-h-48 overflow-y-auto py-1">
                      {subjects.map((subject) => {
                        const active = subject._id === currentSubjectId;
                        return (
                          <button
                            key={subject._id}
                            type="button"
                            onClick={() => handleSubjectChange(subject._id)}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                              active
                                ? 'bg-primary text-white font-bold'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                            title={`${subject.code} - ${subject.title}`}
                          >
                            <span className="block truncate">{subject.code} - {subject.title}</span>
                          </button>
                        );
                      })}
                      {!subjects.length && (
                        <div className="px-3 py-2 text-xs text-white/40">No subjects yet</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Link
                to="/subjects"
                onClick={() => setMobileOpen(false)}
                className="mt-2 w-full text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg py-1.5 transition-colors flex items-center justify-center gap-1"
              >
                ⚙ Manage Subjects
              </Link>
            </div>
          )}
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            const linkLabel = user?.role === 'superadmin' && link.to === '/users' ? 'Accounts' : link.label;
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
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  <NavIcon name={getNavIconName(link.to)} />
                </span>
                {(!collapsed || mobileOpen) && <span>{linkLabel}</span>}
              </Link>
            );
          })}
          {(user?.role === 'superadmin') && (
            <>
              {(!collapsed || mobileOpen) && (
                <div className="mt-3 mb-1 px-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Super Admin</span>
                </div>
              )}
              <Link
                to="/subscription"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  location.pathname === '/subscription'
                    ? 'bg-primary text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center shrink-0">
                  <NavIcon name="subscription" />
                </span>
                {(!collapsed || mobileOpen) && <span>Manage Subscription</span>}
              </Link>
            </>
          )}
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
