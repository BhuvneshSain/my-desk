import { useState } from 'react';

export default function OfficesManager({ open, onClose, offices, setOffices }) {
  const [local, setLocal] = useState(offices || []);

  const update = (i, val) => {
    const copy = [...local];
    copy[i] = val;
    setLocal(copy);
  };
  const remove = (i) => {
    const copy = [...local];
    copy.splice(i, 1);
    setLocal(copy);
  };
  const add = () => setLocal([...
    (local || []),
    'New Office'
  ]);
  const save = () => {
    const normalized = (local || [])
      .map(v => (v || '').trim())
      .filter(Boolean)
      .filter((v, i, arr) => arr.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i)
      .sort((a,b)=> a.localeCompare(b));
    setOffices(normalized);
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-card border p-4 animate-slide-up">
        <div className="text-lg font-semibold mb-2">Manage Offices</div>
        <div className="space-y-2 max-h-72 overflow-auto">
          {local.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={name} onChange={(e)=>update(i,e.target.value)} className="flex-1 px-3 py-2 rounded-md border border-gray-300" placeholder="Office name"/>
              <button className="px-2 py-1 rounded border text-xs" onClick={()=>remove(i)}>Delete</button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between">
          <button className="px-3 py-2 rounded-md border" onClick={add}>Add Office</button>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded-md border" onClick={onClose}>Cancel</button>
            <button className="px-3 py-2 rounded-md bg-brand text-white" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
