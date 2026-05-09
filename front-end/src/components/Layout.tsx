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
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
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
          fixed lg:static top-0 bottom-0 left-0
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
                  {user?.role}
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
