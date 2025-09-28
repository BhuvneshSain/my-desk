import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { LOCAL_STORAGE_KEYS, getFromLocalStorage } from '../utils/localStorage';
import GlobalLoader from './GlobalLoader';
import api from '../utils/api';

const menuItems = [
  { text: 'Dashboard', path: '/' , icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>
  )},
  { text: 'Attendance', path: '/attendance', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2h-3V3H8v2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
  )},
  { text: 'Tasks', path: '/tasks', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7 7h10M7 11h10M7 15h10"/></svg>
  )},
  { text: 'Inward Register', path: '/inward', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18"/></svg>
  )},
  { text: 'Outward Register', path: '/outward', icon: (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v16m0-8h16"/></svg>
  )},
  // Reports tab removed per request
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileVer, setProfileVer] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const requireAuth = ((import.meta.env.VITE_REQUIRE_AUTH ?? 'false') + '').toLowerCase() === 'true';
  // Dark mode removed

  // Notifications for tasks due today and not done
  const [dueToday, setDueToday] = useState([]);
  const refreshDue = () => {
    const tasks = getFromLocalStorage(LOCAL_STORAGE_KEYS.TASKS, []);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const list = tasks.filter(t => t && t.dueDate && (t.status !== 'Done') && new Date(t.dueDate).toISOString().slice(0,10) === todayStr);
    setDueToday(list);
  };
  useEffect(() => {
    refreshDue();
    const onStorage = (e) => {
      if (e.key === LOCAL_STORAGE_KEYS.TASKS) refreshDue();
      if (e.key === LOCAL_STORAGE_KEYS.PROFILE) setProfileVer((v) => v + 1);
    };
    window.addEventListener('storage', onStorage);
    const onProfileUpdated = () => setProfileVer((v) => v + 1);
    window.addEventListener('mydesk-profile-updated', onProfileUpdated);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('mydesk-profile-updated', onProfileUpdated);
    };
  }, []);

  // Close dropdowns when clicking outside
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  useEffect(() => {
    const onDocDown = (e) => {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    const onKey = (e) => { if (e.key === 'Escape') { setNotifOpen(false); setProfileOpen(false); } };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDocDown); document.removeEventListener('keydown', onKey); };
  }, [notifOpen, profileOpen]);

  useEffect(() => {
    if (!requireAuth) return undefined;
    let cancelled = false;
    (async () => {
      try {
        await api.me();
      } catch (error) {
        const message = String(error?.message || '');
        const unauthorized = /401|unauthor/i.test(message);
        if (!cancelled && unauthorized && location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [requireAuth, location.pathname, navigate]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <GlobalLoader />
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-20 bg-black/50 lg:hidden" />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-secondary text-secondary-foreground border-r-2 border-border overflow-y-auto shadow-retro lg:shadow-none transition-transform duration-300 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 px-6 py-6">
          <svg className="w-10 h-10 text-primary" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M364.61 390.213C304.625 450.196 207.37 450.196 147.386 390.213C117.394 360.22 102.398 320.911 102.398 281.6C102.398 242.291 117.394 202.981 147.386 172.989C147.386 230.4 153.6 281.6 230.4 307.2C230.4 256 256 102.4 294.4 76.7999C320 128 334.618 142.997 364.608 172.989C394.601 202.981 409.597 242.291 409.597 281.6C409.597 320.911 394.601 360.22 364.61 390.213Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M201.694 387.105C231.686 417.098 280.312 417.098 310.305 387.105C325.301 372.109 332.8 352.456 332.8 332.8C332.8 313.144 325.301 293.491 310.305 278.495C295.309 263.498 288 256 275.2 230.4C256 243.2 243.201 320 243.201 345.6C201.694 345.6 179.2 332.8 179.2 332.8C179.2 352.456 186.698 372.109 201.694 387.105Z" fill="white"/>
          </svg>
          <span className="text-2xl font-display text-primary">My Desk</span>
        </div>
        <nav className="mt-4">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.text}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-6 py-2 text-left uppercase tracking-widest font-display transition border-2 rounded-md ${active ? 'bg-primary text-primary-foreground border-border shadow-retro' : 'text-secondary-foreground/70 border-transparent hover:border-border hover:bg-primary/20 hover:text-secondary-foreground'}`}
              >
                <span className="text-current">{item.icon}</span>
                <span className="mx-1 font-display">{item.text}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background text-foreground">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-card border-b-4 border-border shadow-retro">
          <div className="flex items-center">
            <button aria-label="Open sidebar" onClick={() => setSidebarOpen(true)} className="text-foreground focus:outline-none lg:hidden">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6H20M4 12H20M4 18H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            <div className="relative mx-4 lg:mx-0">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none"><path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <input className="w-32 sm:w-64 pl-10 pr-4 py-2 rounded-md border-2 border-border/30 bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/40 focus:border-border transition" type="text" placeholder="Search" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button aria-label="Open notifications" onClick={() => setNotifOpen(!notifOpen)} className="relative text-foreground hover:text-primary transition">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 17H20L18.5951 15.5951C18.2141 15.2141 18 14.6973 18 14.1585V11C18 8.38757 16.3304 6.16509 14 5.34142V5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5V5.34142C7.66962 6.16509 6 8.38757 6 11V14.1585C6 14.6973 5.78595 15.2141 5.40493 15.5951L4 17H9M15 17V18C15 19.6569 13.6569 21 12 21C10.3431 21 9 19.6569 9 18V17M15 17H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {dueToday.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-destructive text-destructive-foreground border border-border">{dueToday.length}</span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-card text-foreground rounded-lg border-2 border-border shadow-retro z-10 animate-slide-down">
                  <div className="px-4 py-3 border-b border-border/30 font-display text-sm tracking-widest uppercase">Today</div>
                  <div className="max-h-72 overflow-auto">
                    {dueToday.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">No pending tasks for today</div>
                    ) : (
                      dueToday.map(t => (
                        <div key={t.id} className="px-4 py-2 text-sm border-b border-border/20 last:border-0">
                          <div className="text-foreground">{t.title}</div>
                          <div className="text-muted-foreground">Due: {format(new Date(t.dueDate), 'HH:mm, dd MMM')}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2"><Link to="/tasks" className="text-primary font-display tracking-wider hover:underline">Open Tasks</Link></div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(!profileOpen)} className="block w-8 h-8 overflow-hidden rounded-full border-2 border-border bg-card">
                {(() => {
                  const profile = getFromLocalStorage(LOCAL_STORAGE_KEYS.PROFILE, {}); // re-read on profileVer change
                  if (profile?.photo) {
                    return <img className="object-cover w-full h-full" src={profile.photo} alt="avatar" />
                  }
                  const initial = (profile?.name || 'User').charAt(0).toUpperCase();
                  return <div className="w-full h-full flex items-center justify-center text-sm font-display bg-primary text-primary-foreground border border-border">{initial}</div>;
                })()}
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-card rounded-md border-2 border-border shadow-retro z-10 animate-slide-down">
                  <Link to="/profile" className="block px-4 py-2 text-sm font-display tracking-wide text-foreground hover:bg-primary hover:text-primary-foreground transition">Profile</Link>
                  <Link to="/export" className="block px-4 py-2 text-sm font-display tracking-wide text-foreground hover:bg-primary hover:text-primary-foreground transition">Export Data</Link>
                  <button onClick={async()=>{ try{ await api.logout(); }catch{} navigate('/login'); }} className="w-full text-left px-4 py-2 text-sm font-display tracking-wide text-foreground hover:bg-destructive hover:text-destructive-foreground transition">Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

