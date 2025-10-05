import { getStoredToken } from './auth';

const rawBase = (import.meta.env.VITE_API_BASE ?? '').trim();
const API_BASE = rawBase ? rawBase.replace(/\/$/, '') : '';
const PROVIDER = (import.meta.env.VITE_DATA_PROVIDER || 'server').toLowerCase(); // 'server' | 'firebase'
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache',
};

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
    const token = getStoredToken();
    const headers = { ...DEFAULT_HEADERS, ...(options.headers || {}) };
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${urlPath}`, {
      method,
      cache: 'no-store',
      credentials: 'include',
      ...options,
      headers,
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
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  // employees
  getEmployees: () => request('/api/employees'),
  getEmployee: (id) => request(`/api/employees/${id}`),
  createEmployee: (payload) => request('/api/employees', { method: 'POST', body: JSON.stringify(payload) }),
  updateEmployee: (id, payload) => request(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteEmployee: (id) => request(`/api/employees/${id}`, { method: 'DELETE' }),
};

if (PROVIDER === 'firebase') {
  throw new Error('Firebase provider is not available in this build.');
}

export default api;


