import { useMemo, useState } from 'react';
import { LOCAL_STORAGE_KEYS, getFromLocalStorage, saveToLocalStorage } from '../utils/localStorage';

const defaults = {
  photo: '',
  name: '',
  post: 'Programmer',
  department: '',
  postingPlace: '',
  joiningDate: '',
  phone: '',
  email: '',
  dob: '',
};

export default function Profile() {
  const [form, setForm] = useState(() => ({ ...defaults, ...(getFromLocalStorage(LOCAL_STORAGE_KEYS.PROFILE, {}) || {}) }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const todayStr = useMemo(() => new Date().toISOString().slice(0,10), []);
  const [toast, setToast] = useState('');

  const onPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, photo: reader.result }));
    reader.readAsDataURL(f);
  };

  const validate = () => {
    const err = {};
    if (!form.name.trim()) err.name = 'Name is required';
    if (!form.joiningDate) err.joiningDate = 'Joining date is required';
    if (!form.email.trim()) err.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) err.email = 'Enter a valid email';
    if (!form.phone.trim()) err.phone = 'Contact no is required';
    else if (!/^\+?[0-9\-\s]{7,15}$/.test(form.phone)) err.phone = 'Enter a valid phone number';
    if (form.dob && form.dob > todayStr) err.dob = 'DOB cannot be in future';
    if (form.joiningDate && form.joiningDate > todayStr) err.joiningDate = 'Joining cannot be in future';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const save = () => {
    if (!validate()) return;
    setSaving(true);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.PROFILE, { ...form, updatedAt: new Date().toISOString() });
    setTimeout(() => setSaving(false), 300);
    setToast('Profile updated');
    setTimeout(() => setToast(''), 1500);
    window.dispatchEvent(new Event('mydesk-profile-updated'));
  };

  const resetProfile = () => {
    const ok = window.confirm('Reset profile to defaults?');
    if (!ok) return;
    setForm({ ...defaults });
    localStorage.removeItem(LOCAL_STORAGE_KEYS.PROFILE);
    setErrors({});
    setToast('Profile reset');
    setTimeout(() => setToast(''), 1500);
    window.dispatchEvent(new Event('mydesk-profile-updated'));
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-card rounded-xl border-2 border-border/40 shadow-retro">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground">Manage your personal details</p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="flex flex-col items-center gap-3">
              <div className="w-32 h-32 rounded-full bg-muted/20 overflow-hidden border-2 border-border/40 flex items-center justify-center">
                {form.photo ? (
                  <img src={form.photo} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-muted-foreground">{form.name ? form.name[0].toUpperCase() : '?'}</span>
                )}
              </div>
              <label className="inline-flex items-center px-3 py-2 rounded-md border border-border/40 bg-card cursor-pointer hover:bg-primary/15 transition">
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                Upload Photo
              </label>
              {form.photo && (
                <button type="button" className="text-sm text-destructive" onClick={()=>setForm(prev=>({...prev, photo: ''}))}>Remove photo</button>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Name</label>
              <input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} className={`w-full px-3 py-2 rounded-md border ${errors.name ? 'border-destructive' : 'border-border/40'} bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40`} />
              {errors.name && (<div className="text-xs text-destructive mt-1">{errors.name}</div>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Post</label>
                <input value={form.post} onChange={(e)=>setForm({...form, post: e.target.value})} className="w-full px-3 py-2 rounded-md border border-border/40 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Department</label>
                <input value={form.department} onChange={(e)=>setForm({...form, department: e.target.value})} className="w-full px-3 py-2 rounded-md border border-border/40 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Posting Place</label>
                <input value={form.postingPlace} onChange={(e)=>setForm({...form, postingPlace: e.target.value})} className="w-full px-3 py-2 rounded-md border border-border/40 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Joining Date</label>
                <input type="date" max={todayStr} value={form.joiningDate} onChange={(e)=>setForm({...form, joiningDate: e.target.value})} className={`w-full px-3 py-2 rounded-md border ${errors.joiningDate ? 'border-destructive' : 'border-border/40'} bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40`} />
                {errors.joiningDate && (<div className="text-xs text-destructive mt-1">{errors.joiningDate}</div>)}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Contact No</label>
                <input value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} className={`w-full px-3 py-2 rounded-md border ${errors.phone ? 'border-destructive' : 'border-border/40'} bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40`} />
                {errors.phone && (<div className="text-xs text-destructive mt-1">{errors.phone}</div>)}
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} className={`w-full px-3 py-2 rounded-md border ${errors.email ? 'border-destructive' : 'border-border/40'} bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40`} />
                {errors.email && (<div className="text-xs text-destructive mt-1">{errors.email}</div>)}
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Date of Birth</label>
              <input type="date" max={todayStr} value={form.dob} onChange={(e)=>setForm({...form, dob: e.target.value})} className={`w-full px-3 py-2 rounded-md border ${errors.dob ? 'border-destructive' : 'border-border/40'} bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40`} />
              {errors.dob && (<div className="text-xs text-destructive mt-1">{errors.dob}</div>)}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <button className="px-4 py-2 rounded-md border border-border text-destructive hover:bg-destructive/15 transition" type="button" onClick={resetProfile}>Reset</button>
          <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground border border-border shadow-retro hover:bg-primary-hover disabled:opacity-50" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 bg-primary text-primary-foreground border border-border shadow-retro px-4 py-2 rounded-full shadow animate-slide-up">
          {toast}
        </div>
      )}
    </div>
  );
}
