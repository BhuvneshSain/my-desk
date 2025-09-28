const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const PROVIDER = (import.meta.env.VITE_DATA_PROVIDER || 'server').toLowerCase(); // 'server' | 'firebase'

function emit(name, detail){ try{ if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(name,{ detail })); }catch{} }

async function request(path, options = {}) {
  emit('mydesk-net', { delta: 1 });
  try {
    const method = (options.method || 'GET').toUpperCase();
    let urlPath = path;
    if (method === 'GET') {
      const ts = Date.now();
      urlPath = path + (path.includes('?') ? '&' : '?') + `_ts=${ts}`;
    }
    const res = await fetch(`${API_BASE}${urlPath}`, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', ...(options.headers || {}) },
      cache: 'no-store',
      credentials: 'include',
      ...options,
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = j.error || msg; } catch {}
      throw new Error(msg);
    }
    return await res.json();
  } finally {
    emit('mydesk-net', { delta: -1 });
  }
}

export const api = {
  base: API_BASE,
  provider: PROVIDER,
  getInward: () => request('/api/inward'),
  addInward: (payload) => request('/api/inward', { method: 'POST', body: JSON.stringify(payload) }),
  updateInward: (id, patch) => request(`/api/inward/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteInward: (id) => request(`/api/inward/${id}`, { method: 'DELETE' }),
  getOutward: () => request('/api/outward'),
  addOutward: (payload) => request('/api/outward', { method: 'POST', body: JSON.stringify(payload) }),
  updateOutward: (id, patch) => request(`/api/outward/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteOutward: (id) => request(`/api/outward/${id}`, { method: 'DELETE' }),
  // attendance
  getAttendance: () => request('/api/attendance'),
  upsertAttendance: (date, record) => request('/api/attendance', { method: 'POST', body: JSON.stringify({ date, record }) }),
  // tasks
  getTasks: () => request('/api/tasks'),
  addTask: (task) => request('/api/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id, patch) => request(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteTask: (id) => request(`/api/tasks/${id}`, { method: 'DELETE' }),
  // profile
  getProfile: () => request('/api/profile'),
  saveProfile: (obj) => request('/api/profile', { method: 'PUT', body: JSON.stringify(obj) }),
  // offices
  getOffices: () => request('/api/offices'),
  saveOffices: (arr) => request('/api/offices', { method: 'PUT', body: JSON.stringify(arr) }),
  // auth
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/me'),
};

// --- Firebase provider implementation (optional) ---
// Only loaded if VITE_DATA_PROVIDER=firebase
async function fbImpl() {
  const { getFb } = await import('./firebase');
  const { auth, db, storage } = getFb();
  const { signInWithEmailAndPassword, signOut, onAuthStateChanged } = await import('firebase/auth');
  const { collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc } = await import('firebase/firestore');
  const { ref, uploadString, getDownloadURL } = await import('firebase/storage');

  const inwardCol = collection(db, 'inward');
  const outwardCol = collection(db, 'outward');
  const tasksCol = collection(db, 'tasks');
  const settingsDoc = doc(db, 'settings', 'globals');
  const attendanceDoc = doc(db, 'attendance', 'records');
  const profileDoc = doc(db, 'profiles', 'default');

  async function uploadDataUrl(dataUrl, destPath) {
    const r = ref(storage, destPath);
    await uploadString(r, dataUrl, 'data_url');
    const url = await getDownloadURL(r);
    return url;
  }

  const toList = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));

  return {
    base: 'firebase',
    provider: 'firebase',
    // inward
    async getInward() { const snap = await getDocs(inwardCol); return toList(snap).sort((a,b)=>new Date(b.date)-new Date(a.date)); },
    async addInward(payload) {
      const name = payload?.document?.name || `file_${Date.now()}`;
      const path = `inward/${Date.now()}_${name}`;
      const url = await uploadDataUrl(payload.document.data, path);
      const docData = {
        date: new Date().toISOString(),
        fileNo: String(payload.fileNo).trim(),
        fromOffice: String(payload.fromOffice).trim(),
        subject: payload.subject || '',
        note: payload.note || '',
        document: { name, type: payload.document.type || '', size: payload.document.size || 0 },
        fileUrl: url,
      };
      // Duplicate check
      const existing = await getDocs(inwardCol);
      if (toList(existing).some(it => (it.fileNo||'').toLowerCase() === docData.fileNo.toLowerCase())) throw new Error('Duplicate file number');
      const created = await addDoc(inwardCol, docData);
      return { id: created.id, ...docData };
    },
    async updateInward(id, patch) {
      const d = doc(db, 'inward', id);
      const cur = (await getDoc(d)).data();
      if (!cur) throw new Error('Not found');
      let updates = { ...patch };
      if (patch.document?.data && patch.document?.name) {
        const name = patch.document.name;
        const path = `inward/${Date.now()}_${name}`;
        const url = await uploadDataUrl(patch.document.data, path);
        updates.document = { name, type: patch.document.type || '', size: patch.document.size || 0 };
        updates.fileUrl = url;
      }
      await updateDoc(d, updates);
      return { id, ...cur, ...updates };
    },
    async deleteInward(id) { await deleteDoc(doc(db, 'inward', id)); return { ok: true }; },
    // outward
    async getOutward() { const snap = await getDocs(outwardCol); return toList(snap).sort((a,b)=>new Date(b.date)-new Date(a.date)); },
    async addOutward(payload) {
      const name = payload?.document?.name || `file_${Date.now()}`;
      const path = `outward/${Date.now()}_${name}`;
      const url = await uploadDataUrl(payload.document.data, path);
      const docData = {
        date: new Date().toISOString(),
        fileNo: String(payload.fileNo).trim(),
        toOffice: String(payload.toOffice).trim(),
        subject: payload.subject || '',
        note: payload.note || '',
        document: { name, type: payload.document.type || '', size: payload.document.size || 0 },
        fileUrl: url,
      };
      const existing = await getDocs(outwardCol);
      if (toList(existing).some(it => (it.fileNo||'').toLowerCase() === docData.fileNo.toLowerCase())) throw new Error('Duplicate file number');
      const created = await addDoc(outwardCol, docData);
      return { id: created.id, ...docData };
    },
    async updateOutward(id, patch) {
      const d = doc(db, 'outward', id);
      const cur = (await getDoc(d)).data();
      if (!cur) throw new Error('Not found');
      let updates = { ...patch };
      if (patch.document?.data && patch.document?.name) {
        const name = patch.document.name;
        const path = `outward/${Date.now()}_${name}`;
        const url = await uploadDataUrl(patch.document.data, path);
        updates.document = { name, type: patch.document.type || '', size: patch.document.size || 0 };
        updates.fileUrl = url;
      }
      await updateDoc(d, updates);
      return { id, ...cur, ...updates };
    },
    async deleteOutward(id) { await deleteDoc(doc(db, 'outward', id)); return { ok: true }; },
    // attendance
    async getAttendance() { const s = await getDoc(attendanceDoc); return s.exists() ? (s.data()||{}) : {}; },
    async upsertAttendance(date, record) {
      const s = await getDoc(attendanceDoc);
      const cur = s.exists() ? (s.data() || {}) : {};
      const next = { ...cur, [date]: record };
      await setDoc(attendanceDoc, next);
      return next;
    },
    // tasks
    async getTasks() { const snap = await getDocs(tasksCol); return toList(snap); },
    async addTask(task) { const created = await addDoc(tasksCol, { ...task, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); return { id: created.id, ...task }; },
    async updateTask(id, patch) { await updateDoc(doc(db, 'tasks', id), { ...patch, updatedAt: new Date().toISOString() }); const s = await getDoc(doc(db,'tasks',id)); return { id, ...(s.data()||{}) }; },
    async deleteTask(id) { await deleteDoc(doc(db,'tasks',id)); return { ok:true }; },
    // profile
    async getProfile() { const s = await getDoc(profileDoc); return s.exists() ? (s.data()||{}) : {}; },
    async saveProfile(obj) { await setDoc(profileDoc, obj); return obj; },
    // offices
    async getOffices() { const s = await getDoc(settingsDoc); return s.exists() ? (s.data()?.offices || []) : []; },
    async saveOffices(arr) { await setDoc(settingsDoc, { offices: arr }, { merge: true }); return arr; },
    // auth
    async login(username, password) { const res = await signInWithEmailAndPassword(auth, username, password); return { user: { id: res.user.uid, username: res.user.email || '', role: 'user' } }; },
    async logout() { await signOut(auth); return { ok: true }; },
    async me() { return new Promise((resolve, reject) => { const unsub = onAuthStateChanged(auth, (u)=>{ unsub(); if (u) resolve({ id: u.uid, username: u.email || '', role: 'user' }); else reject(new Error('Unauthorized')); }); }); },
  };
}

let exported = api;
if (PROVIDER === 'firebase') {
  // Wrap lazily; expose same API surface
  const proxy = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'provider') return 'firebase';
      if (prop === 'base') return 'firebase';
      return async (...args) => {
        const impl = await fbImpl();
        const fn = impl[prop];
        if (typeof fn !== 'function') throw new Error(`API method not available: ${String(prop)}`);
        return fn(...args);
      };
    }
  });
  exported = proxy;
}

export default exported;
