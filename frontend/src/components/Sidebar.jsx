import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, UploadCloud, CheckCircle2, GitCompare, 
  MessageSquare, HelpCircle, Sparkles, Briefcase, User, Settings, 
  LogOut, Sun, Moon, Menu, X, Wand2
} from 'lucide-react';
import { useAuth, useTheme } from '../App';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navGroups = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Resume & Career',
      items: [
        { name: 'Resume Analysis', path: '/resume-analysis', icon: FileText },
        { name: 'My Resumes', path: '/resumes', icon: UploadCloud },
        { name: 'ATS Scanner', path: '/ats-analysis', icon: CheckCircle2 },
        { name: 'Job Matching', path: '/job-matching', icon: GitCompare },
        { name: 'AI Career Assistant', path: '/chat', icon: MessageSquare, badge: 'AI' },
        { name: 'Interview Prep', path: '/interview-prep', icon: HelpCircle },
        { name: 'Resume Optimizer', path: '/resume-optimizer', icon: Wand2 },
      ]
    },
    {
      title: 'Jobs & Screening',
      items: [
        { name: 'Job Listings & Screening', path: '/jobs', icon: Briefcase },
      ]
    },
    {
      title: 'Account',
      items: [
        { name: 'Profile & Settings', path: '/profile', icon: Settings },
      ]
    }
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
        <NavLink to="/dashboard" className="flex items-center gap-2.5">
          <div className="bg-primary p-2 rounded-xl text-white shadow-md shadow-primary/30 flex items-center justify-center">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div>
            <span className="font-heading text-lg font-extrabold tracking-wider text-white">
              Talent<span className="text-primary">AI</span>
            </span>
            <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-widest -mt-1">
              Career & ATS Suite
            </span>
          </div>
        </NavLink>
        {mobileOpen && (
          <button 
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3.5 py-4 space-y-6 overflow-y-auto scrollbar-thin">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {group.title}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/25 font-bold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Card & Controls */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-900/60 space-y-2">
        <NavLink 
          to="/profile" 
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'TA'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block px-1.5 py-0.2 text-[9px] font-bold bg-slate-700 text-slate-300 rounded capitalize">
                {user?.role || 'candidate'}
              </span>
            </div>
          </div>
        </NavLink>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-slate-800 transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={14} className="text-amber-400" />
                <span className="text-[11px]">Light</span>
              </>
            ) : (
              <>
                <Moon size={14} className="text-indigo-300" />
                <span className="text-[11px]">Dark</span>
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-slate-800 transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut size={14} />
            <span className="text-[11px]">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between h-14 px-4 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <Menu size={20} />
          </button>
          <span className="font-heading font-extrabold text-sm tracking-wide">
            Talent<span className="text-primary">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="p-1.5 text-slate-300 hover:text-white">
            {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-300" />}
          </button>
        </div>
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 h-full shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
