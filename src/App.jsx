import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth.jsx';
import PublicOnly from './components/PublicOnly.jsx';
import LoginPage from './pages/Login.jsx';
import SignupPage from './pages/Signup.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const AttendancePage = lazy(() => import('./pages/Attendance'));
const Tasks = lazy(() => import('./pages/Tasks'));
const EmployeesPage = lazy(() => import('./pages/Employees'));
const InwardRegister = lazy(() => import('./pages/InwardRegister'));
const OutwardRegister = lazy(() => import('./pages/OutwardRegister'));
const Profile = lazy(() => import('./pages/Profile'));

function ComingSoon({ title }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">{title}</h1>
      <p className="text-muted-foreground">Coming soon</p>
    </div>
  );
}

const primaryRoutes = [
  { index: true, element: <Dashboard /> },
  { path: 'attendance', element: <AttendancePage /> },
  { path: 'tasks', element: <Tasks /> },
  { path: 'employees', element: <EmployeesPage /> },
  { path: 'inward', element: <InwardRegister /> },
  { path: 'outward', element: <OutwardRegister /> },
  { path: 'profile', element: <Profile /> },
];

const placeholderRoutes = [
  { path: 'journal', title: 'Daily Journal' },
  { path: 'expenses', title: 'Expenses' },
  { path: 'contacts', title: 'Contacts' },
  { path: 'shortcuts', title: 'Quick Links' },
  { path: 'reminders', title: 'Reminders' },
];

function renderRoutes(config) {
  return config.map(({ index, path, element, title }) => (
    <Route
      key={path ?? 'index'}
      index={index}
      path={index ? undefined : path}
      element={element ?? <ComingSoon title={title} />}
    />
  ));
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route path="/" element={<Layout />}>
              {renderRoutes(primaryRoutes)}
              {renderRoutes(placeholderRoutes)}
            </Route>
          </Route>

          <Route path="*" element={<ComingSoon title="Not Found" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

