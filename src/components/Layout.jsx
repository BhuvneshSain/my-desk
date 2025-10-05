import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { LOCAL_STORAGE_KEYS, getFromLocalStorage } from '../utils/localStorage';
import GlobalLoader from './GlobalLoader';
import { useAuth } from '../context/AuthContext.jsx';

const menuItems = [
  {
    text: 'Dashboard',
    path: '/',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
  },
  {
    text: 'Attendance',
    path: '/attendance',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2h-3V3H8v2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    text: 'Tasks',
    path: '/tasks',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7 7h10M7 11h10M7 15h10" />
      </svg>
    ),
  },
  {
    text: 'Employees',
    path: '/employees',
    role: 'MANAGE',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M23 20v-2a4 4 0 00-3-3.87" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    text: 'Inward Register',
    path: '/inward',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M3 12h18M3 17h18" />
      </svg>
    ),
  },
  {
    text: 'Outward Register',
    path: '/outward',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v16m0-8h16" />
      </svg>
    ),
  },
  // Reports tab removed per request
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [, setProfileRefreshTick] = useState(0);
  const [dueToday, setDueToday] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const { user, logout: logoutUser } = useAuth();
  const userDisplayName = user?.fullName || user?.email || 'User';

  const visibleMenuItems = useMemo(() => {
    if (!user) return menuItems.filter((item) => item.role !== 'MANAGE');
    const role = user.role?.toUpperCase();
    const canManage = role === 'ADMIN' || role === 'INCHARGE';
    return menuItems.filter((item) => item.role !== 'MANAGE' || canManage);
  }, [user]);

  useEffect(() => {
    const refreshDue = () => {
      const tasks = getFromLocalStorage(LOCAL_STORAGE_KEYS.TASKS, []);
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const list = tasks.filter((task) => {
        if (!task || !task.dueDate) return false;
        const status = String(task.status || '').toLowerCase();
        if (status === 'done') return false;
        return new Date(task.dueDate).toISOString().slice(0, 10) === todayStr;
      });
      setDueToday(list);
    };

    refreshDue();

    const onStorage = (event) => {
      if (event.key === LOCAL_STORAGE_KEYS.TASKS) {
        refreshDue();
      }
      if (event.key === LOCAL_STORAGE_KEYS.PROFILE) {
        setProfileRefreshTick((value) => value + 1);
      }
    };

    const onProfileUpdated = () => setProfileRefreshTick((value) => value + 1);

    window.addEventListener('storage', onStorage);
    window.addEventListener('mydesk-profile-updated', onProfileUpdated);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('mydesk-profile-updated', onProfileUpdated);
    };
  }, []);

  useEffect(() => {
    const onDocDown = (event) => {
      if (notifOpen && notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
      if (profileOpen && profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    const onKey = (event) => {
      if (event.key === 'Escape') {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [notifOpen, profileOpen]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <GlobalLoader />

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-20 bg-black/50 lg:hidden" />}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-secondary text-secondary-foreground shadow-retro transition duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
          <div className="font-display text-lg tracking-[0.4em] uppercase">My Desk</div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-secondary-foreground hover:text-primary transition"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>
        <nav className="px-4 py-4 space-y-1">
          {visibleMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                location.pathname === item.path
                  ? 'bg-primary text-primary-foreground'
                  : 'text-secondary-foreground hover:bg-primary/20'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="text-secondary-foreground/80">{item.icon}</span>
              <span className="font-display tracking-[0.3em] uppercase">{item.text}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/30 bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="lg:hidden rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary"
            >
              Menu
            </button>
            <div className="font-display text-sm tracking-[0.4em] uppercase text-muted-foreground">Welcome</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button
                aria-label="Open notifications"
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative text-foreground hover:text-primary transition"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M15 17H20L18.5951 15.5951C18.2141 15.2141 18 14.6973 18 14.1585V11C18 8.38757 16.3304 6.16509 14 5.34142V5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5V5.34142C7.66962 6.16509 6 8.38757 6 11V14.1585C6 14.6973 5.78595 15.2141 5.40493 15.5951L4 17H9M15 17V18C15 19.6569 13.6569 21 12 21C10.3431 21 9 19.6569 9 18V17M15 17H9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {dueToday.length > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-destructive text-xs text-destructive-foreground">
                    {dueToday.length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 space-y-2 rounded-lg border-2 border-border bg-card text-foreground shadow-retro">
                  <div className="border-b border-border/30 px-4 py-2 font-display text-xs uppercase tracking-[0.4em] text-muted-foreground">
                    Today
                  </div>
                  <div className="max-h-72 overflow-auto">
                    {dueToday.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">No pending tasks for today</div>
                    ) : (
                      dueToday.map((task) => (
                        <div key={task.id} className="px-4 py-2 text-sm border-b border-border/20 last:border-0">
                          <div className="text-foreground">{task.title}</div>
                          <div className="text-muted-foreground">Due: {format(new Date(task.dueDate), 'HH:mm, dd MMM')}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 pb-3">
                    <Link to="/tasks" className="font-display text-sm uppercase tracking-[0.3em] text-primary hover:underline" onClick={() => setNotifOpen(false)}>
                      Open Tasks
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((prev) => !prev)}
                className="block h-8 w-8 overflow-hidden rounded-full border-2 border-border bg-card"
                aria-label="Open profile menu"
              >
                {(() => {
                  const profile = getFromLocalStorage(LOCAL_STORAGE_KEYS.PROFILE, {});
                  if (profile?.photo) {
                    return <img className="h-full w-full object-cover" src={profile.photo} alt="avatar" />;
                  }
                  const initial = (profile?.name || userDisplayName).charAt(0).toUpperCase();
                  return (
                    <div className="flex h-full w-full items-center justify-center border border-border bg-primary text-sm font-display text-primary-foreground">
                      {initial}
                    </div>
                  );
                })()}
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border-2 border-border bg-card text-foreground shadow-retro">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm font-display tracking-wide hover:bg-primary hover:text-primary-foreground"
                    onClick={() => setProfileOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/export"
                    className="block px-4 py-2 text-sm font-display tracking-wide hover:bg-primary hover:text-primary-foreground"
                    onClick={() => setProfileOpen(false)}
                  >
                    Export Data
                  </Link>
                  <button
                    onClick={async () => {
                      await logoutUser();
                      setProfileOpen(false);
                      navigate('/login');
                    }}
                    className="w-full px-4 py-2 text-left text-sm font-display tracking-wide text-destructive hover:bg-destructive/10"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
          <div className="mx-auto max-w-7xl px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
