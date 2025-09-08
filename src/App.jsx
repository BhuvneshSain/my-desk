import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AttendancePage = lazy(() => import('./pages/Attendance'));
const InwardRegister = lazy(() => import('./pages/InwardRegister'));
const OutwardRegister = lazy(() => import('./pages/OutwardRegister'));
const Profile = lazy(() => import('./pages/Profile'));
const Tasks = lazy(() => import('./pages/Tasks'));
// Optional stubs for not-yet-implemented pages
function ComingSoon({ title }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">{title}</h1>
      <p className="text-gray-500">Coming soon</p>
    </div>
  );
}
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-6 text-gray-500">Loading…</div>}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="inward" element={<InwardRegister />} />
            <Route path="outward" element={<OutwardRegister />} />
            <Route path="journal" element={<ComingSoon title="Daily Journal" />} />
            <Route path="expenses" element={<ComingSoon title="Expenses" />} />
            <Route path="contacts" element={<ComingSoon title="Contacts" />} />
            <Route path="shortcuts" element={<ComingSoon title="Quick Links" />} />
            <Route path="reminders" element={<ComingSoon title="Reminders" />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
