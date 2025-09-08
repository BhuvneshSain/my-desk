import { format, isWeekend } from 'date-fns';
import { Link } from 'react-router-dom';
import { LOCAL_STORAGE_KEYS, getFromLocalStorage } from '../utils/localStorage';

export default function Dashboard() {
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const attendance = getFromLocalStorage(LOCAL_STORAGE_KEYS.ATTENDANCE, {});
  let todayRecord = attendance?.[today];
  const START_DATE = new Date(2025, 7, 21);
  if (!todayRecord && now >= START_DATE && isWeekend(now)) {
    todayRecord = { type: 'official_leave', reason: format(now, 'EEE') };
  }
  const labelMap = {
    present: 'Present',
    official_leave: 'Official Leave',
    official_travel: 'Official Travel',
    on_duty_leave: 'On Duty Leave',
    casual_leave: 'Casual Leave',
    medical_leave: 'Medical Leave',
    privilege_leave: 'Privilege Leave',
    unpaid_leave: 'Without Pay',
  };
  const colorClass = {
    present: 'bg-emerald-100 text-emerald-700',
    official_leave: 'bg-red-100 text-red-700',
    official_travel: 'bg-blue-100 text-blue-700',
    on_duty_leave: 'bg-sky-100 text-sky-700',
    casual_leave: 'bg-amber-100 text-amber-700',
    medical_leave: 'bg-rose-100 text-rose-700',
    privilege_leave: 'bg-indigo-100 text-indigo-700',
    unpaid_leave: 'bg-gray-100 text-gray-700',
  };

  const tasks = getFromLocalStorage(LOCAL_STORAGE_KEYS.TASKS, []);
  const recentTasks = [...tasks].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);
  const inwardDocs = getFromLocalStorage(LOCAL_STORAGE_KEYS.INWARD, []) || [];
  const inwardMap = Object.fromEntries(inwardDocs.map(d => [d.id, d]));
  const outwardDocs = getFromLocalStorage(LOCAL_STORAGE_KEYS.OUTWARD, []) || [];
  const combinedDocs = [
    ...inwardDocs.map(d => ({ id: d.id, date: d.date, kind: 'Inward', fileNo: d.fileNo || d.docNo || '-', officeLabel: 'From', officeName: d.fromOffice || d.from || '-' })),
    ...outwardDocs.map(d => ({ id: d.id, date: d.date, kind: 'Outward', fileNo: d.fileNo || d.docNo || '-', officeLabel: 'To', officeName: d.toOffice || d.to || '-' })),
  ];
  const recentDocs = combinedDocs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Welcome to My Desk</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
          <h2 className="text-lg font-semibold">Today's Attendance</h2>
          <div className="mt-3">
            {!todayRecord ? (
              <p className="text-gray-500">Not marked</p>
            ) : (
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${colorClass[todayRecord.type] || 'bg-gray-100 text-gray-700'}`}>
                  {labelMap[todayRecord.type] || todayRecord.type}
                </span>
                {todayRecord.reason && (
                  <p className="text-sm text-gray-500 mt-2">Reason: {todayRecord.reason}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
          <h2 className="text-lg font-semibold">Recent Tasks</h2>
          <div className="mt-3 space-y-2">
            {recentTasks.length ? (
              recentTasks.map((task) => {
                const doc = task.relatedDocId ? inwardMap[task.relatedDocId] : null;
                return (
                  <div key={task.id} className="text-sm">
                    <div className="text-gray-800">{task.title} - {task.status}</div>
                    <div className="text-gray-500">Due: {format(new Date(task.dueDate), 'dd MMM yyyy')}</div>
                    {doc && (
                      <div className="mt-1 text-xs"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Doc: {doc.fileNo || '-'}</span></div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-sm">No tasks found</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
          <h2 className="text-lg font-semibold">Upcoming Reminders</h2>
          <p className="text-gray-500 text-sm mt-3">No reminders yet</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 md:col-span-2 shadow-card dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
          <h2 className="text-lg font-semibold">Recent Documents</h2>
          <div className="mt-3 space-y-2">
            {recentDocs.length ? (
              recentDocs.map((doc) => (
                <div key={doc.id} className="text-sm">
                  <div className="text-gray-800">{doc.fileNo} <span className="text-xs text-gray-500">({doc.kind})</span></div>
                  <div className="text-gray-500">{doc.officeLabel}: {doc.officeName} ({format(new Date(doc.date), 'dd MMM yyyy')})</div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No recent documents</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
          <h2 className="text-lg font-semibold">Quick Links</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Link to="/attendance" className="px-3 py-2 rounded border hover:bg-gray-50">Attendance</Link>
            <Link to="/tasks" className="px-3 py-2 rounded border hover:bg-gray-50">Tasks</Link>
            <Link to="/inward" className="px-3 py-2 rounded border hover:bg-gray-50">Inward Register</Link>
            <Link to="/outward" className="px-3 py-2 rounded border hover:bg-gray-50">Outward Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
