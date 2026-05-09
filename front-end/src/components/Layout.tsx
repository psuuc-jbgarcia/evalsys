import { type ReactNode, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '◫' },
  { to: '/sections', label: 'Sections', icon: '☰' },
  { to: '/groups', label: 'Groups', icon: '⊞' },
  { to: '/users', label: 'Panel Accounts', icon: '⊕' },
  { to: '/assign-panels', label: 'Assign Panels', icon: '👥' },
  { to: '/rubrics', label: 'Rubrics', icon: '✎' },
  { to: '/results', label: 'Results', icon: '▦' },
];

const panelLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: '◫' },
  { to: '/grade', label: 'Grade Groups', icon: '✎' },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const links = user?.role === 'admin' ? adminLinks : panelLinks;
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Sidebar — stays dark for contrast */}
      <aside
        className={`${collapsed ? 'w-[68px]' : 'w-60'
          } bg-dark flex flex-col shrink-0 transition-all duration-200`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-extrabold">
                E
              </div>
              <div>
                <h1 className="text-white font-bold text-sm leading-none">EvalSys</h1>
                <p className="text-white/40 text-[10px] mt-0.5 uppercase tracking-widest font-semibold">
                  {user?.role}
                </p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-extrabold mx-auto">
              E
            </div>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-auto mt-3 mb-1 w-8 h-6 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors text-xs"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '▸' : '◂'}
        </button>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 flex-1 px-3 pb-4">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                title={collapsed ? link.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${isActive
                    ? 'bg-primary text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
              >
                <span className="text-base leading-none w-5 text-center shrink-0">{link.icon}</span>
                {!collapsed && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="border-t border-white/10 p-3">
          {!collapsed ? (
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
              title="Sign out"
              className="w-full text-white/40 hover:text-danger py-2 flex items-center justify-center text-sm transition-colors"
            >
              ⏻
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-6 lg:px-10 lg:py-8 2xl:px-14">{children}</div>
      </main>
    </div>
  );
}
