import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { LOCAL_STORAGE_KEYS, saveToLocalStorage, getFromLocalStorage } from '../utils/localStorage';
import * as XLSX from 'xlsx';

const PRIORITY_LEVELS = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };
const TASK_STATUS = { PENDING: 'Pending', IN_PROGRESS: 'In Progress', DONE: 'Done' };

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: PRIORITY_LEVELS.MEDIUM,
    status: TASK_STATUS.PENDING,
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    relatedDocId: '',
  });
  const [inwardDocs, setInwardDocs] = useState([]);
  const [errors, setErrors] = useState({});
  const [filter, setFilter] = useState('all'); // all | overdue | today | upcoming | done
  const [sortKey, setSortKey] = useState('due'); // due | priority | status | title
  const [sortDir, setSortDir] = useState('asc'); // asc | desc

  useEffect(() => {
    setTasks(getFromLocalStorage(LOCAL_STORAGE_KEYS.TASKS, []));
  }, []);

  // Load inward docs for optional linking in tasks
  useEffect(() => {
    const load = () => setInwardDocs(getFromLocalStorage(LOCAL_STORAGE_KEYS.INWARD, []) || []);
    load();
    const onStorage = (e) => { if (e.key === LOCAL_STORAGE_KEYS.INWARD) load(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleOpen = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: format(new Date(task.dueDate), 'yyyy-MM-dd'),
        relatedDocId: task.relatedDocId || '',
      });
    } else {
      setEditingTask(null);
      setFormData({ title: '', description: '', priority: PRIORITY_LEVELS.MEDIUM, status: TASK_STATUS.PENDING, dueDate: format(new Date(), 'yyyy-MM-dd'), relatedDocId: '' });
    }
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setEditingTask(null); };

  const handleSubmit = () => {
    const err = {};
    if (!formData.title.trim()) err.title = 'Title is required';
    if (!formData.dueDate) err.dueDate = 'Due date is required';
    setErrors(err);
    if (Object.keys(err).length) return;
    const newTask = {
      id: editingTask ? editingTask.id : Date.now(),
      ...formData,
      dueDate: new Date(formData.dueDate).toISOString(),
      createdAt: editingTask ? editingTask.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = editingTask ? tasks.map(t => t.id === editingTask.id ? newTask : t) : [...tasks, newTask];
    setTasks(updated);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.TASKS, updated);
    handleClose();
  };

  const handleDelete = (id) => {
    const ok = window.confirm('Delete this task?');
    if (!ok) return;
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.TASKS, updated);
  };

  const markDone = (id) => {
    const updated = tasks.map(t => t.id === id ? { ...t, status: TASK_STATUS.DONE, updatedAt: new Date().toISOString() } : t);
    setTasks(updated);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.TASKS, updated);
  };

  const exportToExcel = () => {
    const inwardMap = Object.fromEntries((inwardDocs || []).map(d => [d.id, d.fileNo || d.docNo || '']));
    const data = tasks.map((task) => ({
      Title: task.title,
      Description: task.description,
      Priority: task.priority,
      Status: task.status,
      'Due Date': format(new Date(task.dueDate), 'dd/MM/yyyy'),
      'Related Doc': inwardMap[task.relatedDocId] || '',
      'Created At': format(new Date(task.createdAt), 'dd/MM/yyyy HH:mm'),
      'Updated At': format(new Date(task.updatedAt), 'dd/MM/yyyy HH:mm'),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    XLSX.writeFile(wb, `tasks_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const priorityBadge = (text) => {
    const cls = text === 'High' ? 'bg-red-100 text-red-700' : text === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{text}</span>;
  };
  const statusBadge = (text) => {
    const cls = text === 'Done' ? 'bg-emerald-100 text-emerald-700' : text === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{text}</span>;
  };

  // Derived view: filtering + sorting
  const visibleTasks = (() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isOverdue = (t) => t.status !== TASK_STATUS.DONE && format(new Date(t.dueDate), 'yyyy-MM-dd') < todayStr;
    const isToday = (t) => format(new Date(t.dueDate), 'yyyy-MM-dd') === todayStr;
    const isUpcoming = (t) => format(new Date(t.dueDate), 'yyyy-MM-dd') > todayStr;
    let list = [...tasks];
    if (filter === 'overdue') list = list.filter(isOverdue);
    else if (filter === 'today') list = list.filter(isToday);
    else if (filter === 'upcoming') list = list.filter(isUpcoming);
    else if (filter === 'done') list = list.filter(t => t.status === TASK_STATUS.DONE);
    const keyFns = {
      due: (t) => new Date(t.dueDate).getTime(),
      priority: (t) => ({ High: 1, Medium: 2, Low: 3 })[t.priority] || 99,
      status: (t) => ({ 'Pending': 1, 'In Progress': 2, 'Done': 3 })[t.status] || 99,
      title: (t) => t.title?.toLowerCase() || '',
    };
    const kf = keyFns[sortKey] || keyFns.due;
    list.sort((a,b) => {
      const av = kf(a), bv = kf(b);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  })();

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Task Management</h1>
          <div className="flex items-center gap-2">
          <button aria-label="Create task" onClick={() => handleOpen()} className="px-3 py-2 rounded-md bg-brand text-white hover:bg-brand/90">New Task</button>
          <button onClick={exportToExcel} className="px-3 py-2 rounded-md border hover:bg-gray-50">Export</button>
          </div>
        </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          {k:'all',l:'All'},
          {k:'overdue',l:'Overdue'},
          {k:'today',l:'Today'},
          {k:'upcoming',l:'Upcoming'},
          {k:'done',l:'Done'},
        ].map(p => (
          <button key={p.k} onClick={()=>setFilter(p.k)} className={`px-3 py-1.5 rounded-full text-sm border ${filter===p.k?'bg-brand text-white border-brand':'bg-white hover:bg-gray-50'}`}>{p.l}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 select-none">
              <th className="p-3"><button className="font-medium" onClick={()=>toggleSort('title')}>Title{sortKey==='title' ? (sortDir==='asc'?' ▲':' ▼') : ''}</button></th>
              <th className="p-3">Description</th>
              <th className="p-3"><button className="font-medium" onClick={()=>toggleSort('priority')}>Priority{sortKey==='priority' ? (sortDir==='asc'?' ▲':' ▼') : ''}</button></th>
              <th className="p-3"><button className="font-medium" onClick={()=>toggleSort('status')}>Status{sortKey==='status' ? (sortDir==='asc'?' ▲':' ▼') : ''}</button></th>
              <th className="p-3"><button className="font-medium" onClick={()=>toggleSort('due')}>Due Date{sortKey==='due' ? (sortDir==='asc'?' ▲':' ▼') : ''}</button></th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleTasks.map((t) => (
              <tr key={t.id} className="border-t hover:bg-gray-50">
                <td className="p-3 align-top">{t.title}</td>
                <td className="p-3 align-top text-gray-600">
                  {t.description}
                  {t.relatedDocId && (getFromLocalStorage(LOCAL_STORAGE_KEYS.INWARD, []).find(d => d.id === t.relatedDocId)) && (
                    <div className="mt-1 text-xs"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Doc: {(getFromLocalStorage(LOCAL_STORAGE_KEYS.INWARD, []).find(d => d.id === t.relatedDocId)?.fileNo) || ''}</span></div>
                  )}
                </td>
                <td className="p-3 align-top">{priorityBadge(t.priority)}</td>
                <td className="p-3 align-top">{statusBadge(t.status)}</td>
                <td className="p-3 align-top">{format(new Date(t.dueDate), 'dd/MM/yyyy')}</td>
                <td className="p-3 align-top">
                  <div className="flex gap-2">
                    {t.status !== TASK_STATUS.DONE && (
                      <button className="px-2 py-1 text-xs rounded border hover:bg-gray-100" onClick={() => markDone(t.id)}>Mark Done</button>
                    )}
                    <button className="px-2 py-1 text-xs rounded border hover:bg-gray-100" onClick={() => handleOpen(t)}>Edit</button>
                    <button className="px-2 py-1 text-xs rounded border hover:bg-gray-100" onClick={() => handleDelete(t.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {visibleTasks.length === 0 && (
              <tr><td className="p-4 text-center text-gray-500" colSpan={6}>No tasks</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-4 shadow-card text-gray-900 dark:text-gray-100">
            <h2 className="text-lg font-semibold mb-2">{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Title</label>
                <input
                  className={`w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 ${errors.title ? 'border-red-500 focus:ring-red-500' : formData.title ? 'border-emerald-400 focus:ring-emerald-500' : 'border-gray-300 focus:ring-brand'}`}
                  value={formData.title}
                  onChange={(e)=>{ setFormData({...formData, title: e.target.value}); if (errors.title) setErrors(prev=>({...prev, title: undefined})); }}
                />
                {errors.title ? (
                  <div className="mt-1 text-xs text-red-600">{errors.title}</div>
                ) : (formData.title ? <div className="mt-1 text-xs text-emerald-600">Looks good</div> : null)}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <textarea rows={3} className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand" value={formData.description} onChange={(e)=>setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Priority</label>
                  <select className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" value={formData.priority} onChange={(e)=>setFormData({...formData, priority: e.target.value})}>
                    {Object.values(PRIORITY_LEVELS).map((p)=> (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Status</label>
                  <select className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100" value={formData.status} onChange={(e)=>setFormData({...formData, status: e.target.value})}>
                    {Object.values(TASK_STATUS).map((s)=> (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Related Document (optional)</label>
                <select className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" value={formData.relatedDocId} onChange={(e)=>setFormData({...formData, relatedDocId: e.target.value})}>
                  <option value="">None</option>
                  {inwardDocs.map((doc) => (
                    <option key={doc.id} value={doc.id}>{(doc.fileNo || '-') + ' — ' + (doc.fromOffice || '-') + ' (' + format(new Date(doc.date), 'dd MMM yyyy') + ')'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Due Date</label>
                <input
                  type="date"
                  className={`w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${errors.dueDate ? 'border-red-500 focus:ring-red-500' : formData.dueDate ? 'border-emerald-400 focus:ring-emerald-500' : 'border-gray-300 focus:ring-brand'}`}
                  value={formData.dueDate}
                  onChange={(e)=>{ setFormData({...formData, dueDate: e.target.value}); if (errors.dueDate) setErrors(prev=>({...prev, dueDate: undefined})); }}
                />
                {errors.dueDate ? (
                  <div className="mt-1 text-xs text-red-600">{errors.dueDate}</div>
                ) : (formData.dueDate ? <div className="mt-1 text-xs text-emerald-600">Looks good</div> : null)}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-2 rounded-md border hover:bg-gray-50" onClick={handleClose}>Cancel</button>
              <button className="px-3 py-2 rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-50" onClick={handleSubmit} disabled={!formData.title.trim() || !formData.dueDate}>{editingTask ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
