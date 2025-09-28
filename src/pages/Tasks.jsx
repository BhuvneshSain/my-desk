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
    const cls = text === 'High' ? 'bg-destructive/20 text-destructive border border-destructive/40' : text === 'Medium' ? 'bg-primary/20 text-foreground border border-border/40' : 'bg-accent/15 text-foreground border border-accent/30';
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{text}</span>;
  };
  const statusBadge = (text) => {
    const cls = text === 'Done' ? 'bg-primary/20 text-foreground border border-primary/50' : text === 'In Progress' ? 'bg-accent/20 text-foreground border border-accent/40' : 'bg-muted/30 text-muted-foreground border border-border/40';
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
          <button aria-label="Create task" onClick={() => handleOpen()} className="px-3 py-2 rounded-md bg-primary text-primary-foreground border border-border shadow-retro hover:bg-primary-hover">New Task</button>
          <button onClick={exportToExcel} className="px-3 py-2 rounded-md border border-border/40 bg-card hover:bg-primary/15 transition">Export</button>
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
          <button key={p.k} onClick={()=>setFilter(p.k)} className={`px-3 py-1.5 rounded-full text-sm border ${filter===p.k ? 'bg-primary text-primary-foreground border-border shadow-retro' : 'bg-card text-muted-foreground border-border/40 hover:bg-primary/15 hover:text-foreground'}`}>{p.l}</button>
        ))}
      </div>

      <div className="bg-card rounded-xl border-2 border-border/40 shadow-retro overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-primary/15 text-muted-foreground select-none">
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
              <tr key={t.id} className="border-t hover:bg-primary/15">
                <td className="p-3 align-top">{t.title}</td>
                <td className="p-3 align-top text-muted-foreground">
                  {t.description}
                  {t.relatedDocId && (getFromLocalStorage(LOCAL_STORAGE_KEYS.INWARD, []).find(d => d.id === t.relatedDocId)) && (
                    <div className="mt-1 text-xs"><span className="px-2 py-0.5 rounded-full bg-primary/20 text-foreground border border-primary/50">Doc: {(getFromLocalStorage(LOCAL_STORAGE_KEYS.INWARD, []).find(d => d.id === t.relatedDocId)?.fileNo) || ''}</span></div>
                  )}
                </td>
                <td className="p-3 align-top">{priorityBadge(t.priority)}</td>
                <td className="p-3 align-top">{statusBadge(t.status)}</td>
                <td className="p-3 align-top">{format(new Date(t.dueDate), 'dd/MM/yyyy')}</td>
                <td className="p-3 align-top">
                  <div className="flex gap-2">
                    {t.status !== TASK_STATUS.DONE && (
                      <button className="px-2 py-1 text-xs rounded border border-border/40 bg-card hover:bg-primary/15 transition" onClick={() => markDone(t.id)}>Mark Done</button>
                    )}
                    <button className="px-2 py-1 text-xs rounded border border-border/40 bg-card hover:bg-primary/15 transition" onClick={() => handleOpen(t)}>Edit</button>
                    <button className="px-2 py-1 text-xs rounded border border-border/40 bg-card hover:bg-primary/15 transition" onClick={() => handleDelete(t.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {visibleTasks.length === 0 && (
              <tr><td className="p-4 text-center text-muted-foreground" colSpan={6}>No tasks</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
          <div className="relative bg-card rounded-xl w-full max-w-md p-4 border-2 border-border/40 shadow-retro text-foreground">
            <h2 className="text-lg font-semibold mb-2">{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Title</label>
                <input
                  className={`w-full px-3 py-2 rounded-md border bg-card text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 ${errors.title ? 'border-destructive focus:ring-destructive/60' : formData.title ? 'border-primary/60 focus:ring-primary/40' : 'border-border/40 focus:ring-primary/30'}`}
                  value={formData.title}
                  onChange={(e)=>{ setFormData({...formData, title: e.target.value}); if (errors.title) setErrors(prev=>({...prev, title: undefined})); }}
                />
                {errors.title ? (
                  <div className="mt-1 text-xs text-destructive">{errors.title}</div>
                ) : (formData.title ? <div className="mt-1 text-xs text-emerald-600">Looks good</div> : null)}
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Description</label>
                <textarea rows={3} className="w-full px-3 py-2 rounded-md border border-border/40 bg-card text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30" value={formData.description} onChange={(e)=>setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Priority</label>
                  <select className="w-full px-3 py-2 rounded-md border border-border/40 bg-card text-foreground" value={formData.priority} onChange={(e)=>setFormData({...formData, priority: e.target.value})}>
                    {Object.values(PRIORITY_LEVELS).map((p)=> (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Status</label>
                  <select className="w-full px-3 py-2 rounded-md border border-border/40 bg-card text-foreground" value={formData.status} onChange={(e)=>setFormData({...formData, status: e.target.value})}>
                    {Object.values(TASK_STATUS).map((s)=> (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Related Document (optional)</label>
                <select className="w-full px-3 py-2 rounded-md border border-border/40 bg-card text-foreground" value={formData.relatedDocId} onChange={(e)=>setFormData({...formData, relatedDocId: e.target.value})}>
                  <option value="">None</option>
                  {inwardDocs.map((doc) => (
                    <option key={doc.id} value={doc.id}>{(doc.fileNo || '-') + ' — ' + (doc.fromOffice || '-') + ' (' + format(new Date(doc.date), 'dd MMM yyyy') + ')'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Due Date</label>
                <input
                  type="date"
                  className={`w-full px-3 py-2 rounded-md border bg-card text-foreground focus:outline-none focus:ring-2 ${errors.dueDate ? 'border-destructive focus:ring-destructive/60' : formData.dueDate ? 'border-primary/60 focus:ring-primary/40' : 'border-border/40 focus:ring-primary/30'}`}
                  value={formData.dueDate}
                  onChange={(e)=>{ setFormData({...formData, dueDate: e.target.value}); if (errors.dueDate) setErrors(prev=>({...prev, dueDate: undefined})); }}
                />
                {errors.dueDate ? (
                  <div className="mt-1 text-xs text-destructive">{errors.dueDate}</div>
                ) : (formData.dueDate ? <div className="mt-1 text-xs text-emerald-600">Looks good</div> : null)}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-2 rounded-md border border-border/40 bg-card hover:bg-primary/15 transition" onClick={handleClose}>Cancel</button>
              <button className="px-3 py-2 rounded-md bg-primary text-primary-foreground border border-border shadow-retro hover:bg-primary-hover disabled:opacity-50" onClick={handleSubmit} disabled={!formData.title.trim() || !formData.dueDate}>{editingTask ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
