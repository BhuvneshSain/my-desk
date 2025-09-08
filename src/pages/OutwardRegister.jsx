import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { LOCAL_STORAGE_KEYS, getFromLocalStorage, saveToLocalStorage } from '../utils/localStorage';
import OfficesManager from '../components/OfficesManager';
import * as XLSX from 'xlsx';

export default function OutwardRegister() {
  const [fileNo, setFileNo] = useState('');
  const [office, setOffice] = useState('');
  const [offices, setOffices] = useState(() => getFromLocalStorage(LOCAL_STORAGE_KEYS.OFFICES, [
    'General Administration',
    'Accounts Section',
    'HR Department',
  ]));
  const [newOffice, setNewOffice] = useState('');
  const [doc, setDoc] = useState(null);
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [errors, setErrors] = useState({});
  const [manageOpen, setManageOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState(() => getFromLocalStorage(LOCAL_STORAGE_KEYS.OUTWARD, []));

  useEffect(() => { saveToLocalStorage(LOCAL_STORAGE_KEYS.OFFICES, offices); }, [offices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items || [];
    if (!q) return list;
    return list.filter(it => `${it.fileNo} ${it.toOffice} ${(it.subject||'')} ${(it.note||'')}`.toLowerCase().includes(q));
  }, [items, query]);

  const addOffice = () => {
    const name = newOffice.trim();
    if (!name) return;
    const exists = offices.some(o => (o||'').toLowerCase() === name.toLowerCase());
    if (!exists) {
      setOffices([...offices, name]);
      setOffice(name);
      setNewOffice('');
    }
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setDoc(null);
    const max = 20 * 1024 * 1024; // 20MB
    const okType = /^(application\/pdf|image\/)\w*/i.test(f.type);
    if (!okType) { setErrors(prev=>({...prev, doc: 'Only PDF or image files allowed'})); return; }
    if (f.size > max) { setErrors(prev=>({...prev, doc: 'File too large (max 20 MB)'})); return; }
    const reader = new FileReader();
    reader.onload = () => setDoc({ name: f.name, type: f.type, size: f.size, data: reader.result });
    reader.readAsDataURL(f);
  };

  const validate = () => {
    const err = {};
    if (!fileNo.trim()) err.fileNo = 'File number is required';
    if (!office || office === '__add_new') err.office = 'Please select an office';
    if (!doc) err.doc = 'Please upload a document';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    const list = getFromLocalStorage(LOCAL_STORAGE_KEYS.OUTWARD, []);
    const exists = list.some(it => (it.fileNo || '').toLowerCase() === fileNo.trim().toLowerCase());
    if (exists) { setSaving(false); setErrors(prev=>({...prev, fileNo: 'This file number already exists'})); setToast('Duplicate file number'); setTimeout(()=>setToast(''),1200); return; }
    const item = {
      id: crypto.randomUUID?.() || String(Date.now()),
      date: new Date().toISOString(),
      fileNo: fileNo.trim(),
      toOffice: office,
      subject: subject.trim(),
      note: note.trim(),
      document: doc,
    };
    list.unshift(item);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.OUTWARD, list);
    setItems(list);
    setSaving(false);
    setToast('Saved');
    setFileNo(''); setOffice(''); setDoc(null); setSubject(''); setNote('');
    setTimeout(() => setToast(''), 1200);
  };

  const exportExcel = () => {
    const data = (filtered || []).map(it => ({
      Date: format(new Date(it.date), 'dd/MM/yyyy'),
      'File No': it.fileNo,
      'To Office': it.toOffice,
      Subject: it.subject || '',
      Note: it.note || '',
      Attachment: it.document?.name || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Outward');
    XLSX.writeFile(wb, `outward_${format(new Date(),'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-card">
        <h1 className="text-2xl font-semibold mb-1">Outward Register</h1>
        <p className="text-gray-500">Record outgoing files and attachments</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">File No</label>
            <input value={fileNo} onChange={(e)=>setFileNo(e.target.value)} className={`w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 bg-white text-gray-900 transition ${errors.fileNo ? 'border-red-500 focus:ring-red-500' : fileNo ? 'border-emerald-400 focus:ring-emerald-500' : 'border-gray-300 focus:ring-brand'}`} placeholder="e.g. 456/GA/2025" />
            {errors.fileNo ? (
              <div className="mt-1 text-xs text-red-600">{errors.fileNo}</div>
            ) : fileNo ? (
              <div className="mt-1 text-xs text-emerald-600">Looks good</div>
            ) : null}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Subject (optional)</label>
            <input value={subject} onChange={(e)=>setSubject(e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-300" placeholder="Subject" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Note (optional)</label>
            <input value={note} onChange={(e)=>setNote(e.target.value)} className="w-full px-3 py-2 rounded-md border border-gray-300" placeholder="Note" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To Office</label>
            <select value={office} onChange={(e)=>setOffice(e.target.value)} className={`w-full px-3 py-2 rounded-md border bg-white text-gray-900 transition ${errors.office ? 'border-red-500' : office ? 'border-emerald-400' : 'border-gray-300'}`}>
              <option value="">Select office…</option>
              {offices.map((o)=> (<option key={o} value={o}>{o}</option>))}
              <option value="__add_new">+ Add new office…</option>
            </select>
            {errors.office ? (
              <div className="mt-1 text-xs text-red-600">{errors.office}</div>
            ) : (office && office !== '__add_new') ? (
              <div className="mt-1 text-xs text-emerald-600">Looks good</div>
            ) : null}
            {office === '__add_new' && (
              <div className="mt-2 flex gap-2">
                <input value={newOffice} onChange={(e)=>setNewOffice(e.target.value)} className="flex-1 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900" placeholder="New office name" />
                <button type="button" onClick={addOffice} className="px-3 py-2 rounded-md bg-brand text-white">Add</button>
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Upload Document</label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center px-4 py-2 rounded-md border bg-white cursor-pointer hover:bg-gray-50 transition">
                <input type="file" accept="application/pdf,image/*" onChange={onFileChange} className="hidden" />
                <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 00-2 2v6a2 2 0 002 2h3l2 2 2-2h3a2 2 0 002-2V5a2 2 0 00-2-2H4z"/></svg>
                Upload
              </label>
              <span className={`text-sm ${errors.doc ? 'text-red-600' : 'text-gray-600'}`}>{doc ? `${doc.name} (${Math.round(doc.size/1024)} KB)` : 'No file chosen'}</span>
            </div>
            {errors.doc ? (
              <div className="mt-1 text-xs text-red-600">{errors.doc}</div>
            ) : doc ? (
              <div className="mt-1 text-xs text-emerald-600">Ready to upload</div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-md bg-brand text-white disabled:opacity-50 transition transform active:scale-95 hover:bg-brand/90">{saving ? 'Saving…' : 'Save'}</button>
          <button type="button" className="px-3 py-2 rounded-md border" onClick={()=>setManageOpen(true)}>Manage Offices</button>
          <div className="ml-auto flex items-center gap-2">
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search…" className="px-3 py-2 rounded-md border border-gray-300"/>
            <button className="px-3 py-2 rounded-md border" onClick={exportExcel}>Export</button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-card">
        <h2 className="font-semibold">Recent Outward</h2>
        <div className="mt-3 space-y-2 text-sm">
          {filtered?.length ? (
            filtered.slice(0,20).map((it)=>(
              <div key={it.id} className="flex items-center justify-between border rounded-md p-2">
                <div>
                  <div className="text-gray-800">{it.fileNo}</div>
                  <div className="text-gray-500">To: {it.toOffice} • {format(new Date(it.date),'dd MMM yyyy')}</div>
                  {(it.subject || it.note) && (
                    <div className="text-xs text-gray-500">{it.subject} {it.subject && it.note ? '—' : ''} {it.note}</div>
                  )}
                </div>
                {it.document?.data && (
                  <a className="px-3 py-1 rounded border text-xs" href={it.document.data} download={it.document.name}>Download</a>
                )}
              </div>
            ))
          ) : (
            <div className="text-gray-500">No records yet</div>
          )}
        </div>
      </div>

      {toast && (<div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full shadow animate-slide-up">{toast}</div>)}
      <OfficesManager open={manageOpen} onClose={()=>setManageOpen(false)} offices={offices} setOffices={(list)=>{ setOffices(list); saveToLocalStorage(LOCAL_STORAGE_KEYS.OFFICES, list); }} />
    </div>
  );
}
