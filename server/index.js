import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const app = express();
const PORT = process.env.PORT || 4000;

// Project-local data dir (resolve relative to this file to avoid cwd issues)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = path.join(__dirname, '..', 'profile');
fs.mkdirSync(PROFILE_DIR, { recursive: true });
// Set Base Dir to project-local profile dir
const BASE_DIR = PROFILE_DIR;
// Store inward/outward under project-local dir
const INWARD_DIR = process.env.INWARD_DIR || path.join(PROFILE_DIR, 'inward');
const OUTWARD_DIR = process.env.OUTWARD_DIR || path.join(PROFILE_DIR, 'outward');
// Legacy OneDrive locations (for migration)
const LEGACY_BASE_DIR = process.env.MYDESK_LEGACY_BASE_DIR || 'C:/Users/bhuvn/OneDrive/My Desk';
const LEGACY_INWARD_DIR = path.join(LEGACY_BASE_DIR, 'Inward');
const LEGACY_OUTWARD_DIR = path.join(LEGACY_BASE_DIR, 'Outward');
const CLEANUP_LEGACY = String(process.env.MYDESK_CLEANUP_LEGACY || '').trim() === '1';

// Where to keep JSON indexes (store alongside the folders)
const INWARD_DB = path.join(INWARD_DIR, 'inward.json');
const OUTWARD_DB = path.join(OUTWARD_DIR, 'outward.json');

// Ensure directories exist
fs.mkdirSync(INWARD_DIR, { recursive: true });
fs.mkdirSync(OUTWARD_DIR, { recursive: true });

// Migrate existing files from legacy OneDrive folders if present
try {
  const copyIfMissing = (src, dst) => {
    try { if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst); } catch {}
  };
  const copyDirFiles = (srcDir, dstDir, skipNames = new Set()) => {
    if (!fs.existsSync(srcDir)) return;
    try {
      const entries = fs.readdirSync(srcDir);
      for (const name of entries) {
        if (skipNames.has(name)) continue;
        const s = path.join(srcDir, name);
        const d = path.join(dstDir, name);
        try {
          const st = fs.statSync(s);
          if (st.isFile() && !fs.existsSync(d)) fs.copyFileSync(s, d);
        } catch {}
      }
    } catch {}
  };
  // Copy JSON indexes if missing
  copyIfMissing(path.join(LEGACY_INWARD_DIR, 'inward.json'), INWARD_DB);
  copyIfMissing(path.join(LEGACY_OUTWARD_DIR, 'outward.json'), OUTWARD_DB);
  // Copy attachments
  copyDirFiles(LEGACY_INWARD_DIR, INWARD_DIR, new Set(['inward.json']));
  copyDirFiles(LEGACY_OUTWARD_DIR, OUTWARD_DIR, new Set(['outward.json']));

  // Optional cleanup: remove legacy files that are now present in project-local
  if (CLEANUP_LEGACY) {
    const cleanupDir = (srcDir, dstDir, skip = new Set()) => {
      if (!fs.existsSync(srcDir)) return;
      try {
        const names = fs.readdirSync(srcDir);
        for (const name of names) {
          if (skip.has(name)) continue;
          const s = path.join(srcDir, name);
          const d = path.join(dstDir, name);
          try {
            const st = fs.statSync(s);
            if (st.isFile() && fs.existsSync(d)) {
              try { fs.unlinkSync(s); } catch {}
            }
          } catch {}
        }
        // Remove JSON if destination JSON exists too
        for (const j of skip) {
          const s = path.join(srcDir, j);
          const d = path.join(dstDir, j);
          try { if (fs.existsSync(s) && fs.existsSync(d)) fs.unlinkSync(s); } catch {}
        }
        // Attempt to remove legacy dir if empty
        try { if (fs.existsSync(srcDir) && fs.readdirSync(srcDir).length === 0) fs.rmdirSync(srcDir); } catch {}
      } catch {}
    };
    cleanupDir(LEGACY_INWARD_DIR, INWARD_DIR, new Set(['inward.json']));
    cleanupDir(LEGACY_OUTWARD_DIR, OUTWARD_DIR, new Set(['outward.json']));
  }
} catch (e) {
  console.warn('Migration check failed:', e?.message || e);
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(cookieParser());

// Utility to load/save JSON index
const loadDb = (file) => {
  try {
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    console.error('Failed to load DB', file, e);
    return [];
  }
};
const saveDb = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save DB', file, e);
  }
};

// Sanitize filename; keep extension
function safeFilename(name) {
  const base = path.parse(name || `attachment_${Date.now()}`).name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const ext = path.extname(name || '') || '';
  return `${base}${ext}`;
}

// Decode base64 data URL
function decodeDataUrl(dataUrl) {
  if (!dataUrl) return null;
  const idx = dataUrl.indexOf('base64,');
  if (idx === -1) return null;
  const b64 = dataUrl.slice(idx + 7);
  return Buffer.from(b64, 'base64');
}

// Serve static files (files folder)
app.use('/files/inward', express.static(INWARD_DIR));
app.use('/files/outward', express.static(OUTWARD_DIR));

// ---- Auth and Users ----
const ATTENDANCE_DB = path.join(PROFILE_DIR, 'attendance.json'); // object map by date
const TASKS_DB = path.join(PROFILE_DIR, 'tasks.json'); // array
const PROFILE_DB = path.join(PROFILE_DIR, 'profile.json'); // object
const OFFICES_DB = path.join(PROFILE_DIR, 'offices.json'); // array
const USERS_DB = path.join(PROFILE_DIR, 'users.json'); // array of users

// Ensure files exist
for (const f of [ATTENDANCE_DB, TASKS_DB, PROFILE_DB, OFFICES_DB, USERS_DB]) {
  try {
    if (!fs.existsSync(f)) {
      let initial = {};
      if (f === TASKS_DB) initial = [];
      else if (f === ATTENDANCE_DB) initial = {};
      else if (f === OFFICES_DB) initial = [
        'General Administration',
        'Accounts Section',
        'HR Department',
      ];
      else if (f === USERS_DB) {
        const hash = bcrypt.hashSync('admin', 10);
        initial = [{ id: '1', username: 'admin', passwordHash: hash, role: 'admin' }];
      }
      fs.writeFileSync(f, JSON.stringify(initial, null, 2), 'utf8');
    }
  } catch {}
}

const JWT_SECRET = process.env.MYDESK_JWT_SECRET || 'dev-secret-change-me';
function signToken(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }); }
function verifyToken(token) { try { return jwt.verify(token, JWT_SECRET); } catch { return null; } }
function getUsers() { try { return JSON.parse(fs.readFileSync(USERS_DB, 'utf8') || '[]'); } catch { return []; } }

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing username/password' });
  const user = getUsers().find(u => u.username.toLowerCase() === String(username).toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken({ id: user.id, username: user.username, role: user.role });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*60*60*1000 });
  res.json({ user: { id: user.id, username: user.username, role: user.role } });
});
app.post('/api/auth/logout', (req, res) => { res.clearCookie('token'); res.json({ ok: true }); });
app.get('/api/me', (req, res) => {
  const token = req.cookies?.token;
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ id: payload.id, username: payload.username, role: payload.role });
});

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  req.user = payload; next();
}

// Protect API except auth/me and static file serving
app.use((req, res, next) => {
  if (req.path.startsWith('/api/auth') || req.path === '/api/me') return next();
  if (req.path.startsWith('/files/')) return next();
  if (req.path.startsWith('/api/')) return requireAuth(req, res, next);
  next();
});

// GET lists
app.get('/api/inward', (req, res) => {
  const list = loadDb(INWARD_DB);
  res.json(list);
});
app.get('/api/outward', (req, res) => {
  const list = loadDb(OUTWARD_DB);
  res.json(list);
});

// POST new Inward
app.post('/api/inward', (req, res) => {
  try {
    const { fileNo, fromOffice, subject = '', note = '', document } = req.body || {};
    if (!fileNo || !fromOffice || !document?.data || !document?.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const list = loadDb(INWARD_DB);
    if (list.some((it) => (it.fileNo || '').toLowerCase() === String(fileNo).toLowerCase())) {
      return res.status(409).json({ error: 'Duplicate file number' });
    }
    const buf = decodeDataUrl(document.data);
    if (!buf) return res.status(400).json({ error: 'Invalid document data' });
    let filename = safeFilename(document.name);
    let filePath = path.join(INWARD_DIR, filename);
    if (fs.existsSync(filePath)) {
      const stamp = Date.now();
      const p = path.parse(filename);
      filename = `${p.name}_${stamp}${p.ext}`;
      filePath = path.join(INWARD_DIR, filename);
    }
    fs.writeFileSync(filePath, buf);
    const item = {
      id: randomUUID?.() || String(Date.now()),
      date: new Date().toISOString(),
      fileNo: String(fileNo).trim(),
      fromOffice: String(fromOffice).trim(),
      subject: String(subject || '').trim(),
      note: String(note || '').trim(),
      document: { name: filename, type: document.type || '', size: buf.length },
      fileUrl: `/files/inward/${encodeURIComponent(filename)}`,
    };
    list.unshift(item);
    saveDb(INWARD_DB, list);
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save inward' });
  }
});

// UPDATE Inward
app.put('/api/inward/:id', (req, res) => {
  try {
    const id = req.params.id;
    const patch = req.body || {};
    const list = loadDb(INWARD_DB);
    const idx = list.findIndex((x) => x.id == id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    // If fileNo changes, check duplicates
    const nextFileNo = patch.fileNo != null ? String(patch.fileNo).trim() : list[idx].fileNo;
    if (!nextFileNo) return res.status(400).json({ error: 'fileNo required' });
    if (list.some((it, i) => i !== idx && (it.fileNo || '').toLowerCase() === nextFileNo.toLowerCase())) {
      return res.status(409).json({ error: 'Duplicate file number' });
    }
    let updated = { ...list[idx], fileNo: nextFileNo };
    if (patch.fromOffice != null) updated.fromOffice = String(patch.fromOffice).trim();
    if (patch.subject != null) updated.subject = String(patch.subject || '').trim();
    if (patch.note != null) updated.note = String(patch.note || '').trim();
    // Optional new document
    if (patch.document?.data && patch.document?.name) {
      const prevName = list[idx]?.document?.name;
      const buf = decodeDataUrl(patch.document.data);
      if (!buf) return res.status(400).json({ error: 'Invalid document data' });
      let filename = safeFilename(patch.document.name);
      let filePath = path.join(INWARD_DIR, filename);
      if (fs.existsSync(filePath)) {
        const stamp = Date.now();
        const p = path.parse(filename);
        filename = `${p.name}_${stamp}${p.ext}`;
        filePath = path.join(INWARD_DIR, filename);
      }
      fs.writeFileSync(filePath, buf);
      updated.document = { name: filename, type: patch.document.type || '', size: buf.length };
      updated.fileUrl = `/files/inward/${encodeURIComponent(filename)}`;
      if (prevName && prevName !== filename) {
        try { const old = path.join(INWARD_DIR, prevName); if (fs.existsSync(old)) fs.unlinkSync(old); } catch {}
      }
    }
    updated.date = updated.date || new Date().toISOString();
    list[idx] = updated;
    saveDb(INWARD_DB, list);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update inward' });
  }
});

// DELETE Inward
app.delete('/api/inward/:id', (req, res) => {
  try {
    const id = req.params.id;
    const list = loadDb(INWARD_DB);
    const idx = list.findIndex((x) => x.id == id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const item = list[idx];
    const next = list.filter((x) => x.id != id);
    saveDb(INWARD_DB, next);
    // Best-effort delete file
    try {
      const name = item?.document?.name;
      if (name) {
        const p = path.join(INWARD_DIR, name);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    } catch {}
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete inward' });
  }
});

// POST new Outward
app.post('/api/outward', (req, res) => {
  try {
    const { fileNo, toOffice, subject = '', note = '', document } = req.body || {};
    if (!fileNo || !toOffice || !document?.data || !document?.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const list = loadDb(OUTWARD_DB);
    if (list.some((it) => (it.fileNo || '').toLowerCase() === String(fileNo).toLowerCase())) {
      return res.status(409).json({ error: 'Duplicate file number' });
    }
    const buf = decodeDataUrl(document.data);
    if (!buf) return res.status(400).json({ error: 'Invalid document data' });
    let filename = safeFilename(document.name);
    let filePath = path.join(OUTWARD_DIR, filename);
    if (fs.existsSync(filePath)) {
      const stamp = Date.now();
      const p = path.parse(filename);
      filename = `${p.name}_${stamp}${p.ext}`;
      filePath = path.join(OUTWARD_DIR, filename);
    }
    fs.writeFileSync(filePath, buf);
    const item = {
      id: randomUUID?.() || String(Date.now()),
      date: new Date().toISOString(),
      fileNo: String(fileNo).trim(),
      toOffice: String(toOffice).trim(),
      subject: String(subject || '').trim(),
      note: String(note || '').trim(),
      document: { name: filename, type: document.type || '', size: buf.length },
      fileUrl: `/files/outward/${encodeURIComponent(filename)}`,
    };
    list.unshift(item);
    saveDb(OUTWARD_DB, list);
    res.json(item);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save outward' });
  }
});

// UPDATE Outward
app.put('/api/outward/:id', (req, res) => {
  try {
    const id = req.params.id;
    const patch = req.body || {};
    const list = loadDb(OUTWARD_DB);
    const idx = list.findIndex((x) => x.id == id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const nextFileNo = patch.fileNo != null ? String(patch.fileNo).trim() : list[idx].fileNo;
    if (!nextFileNo) return res.status(400).json({ error: 'fileNo required' });
    if (list.some((it, i) => i !== idx && (it.fileNo || '').toLowerCase() === nextFileNo.toLowerCase())) {
      return res.status(409).json({ error: 'Duplicate file number' });
    }
    let updated = { ...list[idx], fileNo: nextFileNo };
    if (patch.toOffice != null) updated.toOffice = String(patch.toOffice).trim();
    if (patch.subject != null) updated.subject = String(patch.subject || '').trim();
    if (patch.note != null) updated.note = String(patch.note || '').trim();
    if (patch.document?.data && patch.document?.name) {
      const prevName = list[idx]?.document?.name;
      const buf = decodeDataUrl(patch.document.data);
      if (!buf) return res.status(400).json({ error: 'Invalid document data' });
      let filename = safeFilename(patch.document.name);
      let filePath = path.join(OUTWARD_DIR, filename);
      if (fs.existsSync(filePath)) {
        const stamp = Date.now();
        const p = path.parse(filename);
        filename = `${p.name}_${stamp}${p.ext}`;
        filePath = path.join(OUTWARD_DIR, filename);
      }
      fs.writeFileSync(filePath, buf);
      updated.document = { name: filename, type: patch.document.type || '', size: buf.length };
      updated.fileUrl = `/files/outward/${encodeURIComponent(filename)}`;
      if (prevName && prevName !== filename) {
        try { const old = path.join(OUTWARD_DIR, prevName); if (fs.existsSync(old)) fs.unlinkSync(old); } catch {}
      }
    }
    updated.date = updated.date || new Date().toISOString();
    list[idx] = updated;
    saveDb(OUTWARD_DB, list);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update outward' });
  }
});

// DELETE Outward
app.delete('/api/outward/:id', (req, res) => {
  try {
    const id = req.params.id;
    const list = loadDb(OUTWARD_DB);
    const idx = list.findIndex((x) => x.id == id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const item = list[idx];
    const next = list.filter((x) => x.id != id);
    saveDb(OUTWARD_DB, next);
    // Best-effort delete file
    try {
      const name = item?.document?.name;
      if (name) {
        const p = path.join(OUTWARD_DIR, name);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    } catch {}
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete outward' });
  }
});

// -------- Additional persistent data: attendance, tasks, profile -------- //

// Attendance
app.get('/api/attendance', (req, res) => {
  try {
    const raw = fs.readFileSync(ATTENDANCE_DB, 'utf8');
    res.json(JSON.parse(raw || '{}'));
  } catch (e) {
    res.json({});
  }
});
// Upsert a single date record { date: 'YYYY-MM-DD', record: {..} }
app.post('/api/attendance', (req, res) => {
  const { date, record } = req.body || {};
  if (!date || !record) return res.status(400).json({ error: 'Missing date/record' });
  try {
    const obj = JSON.parse(fs.readFileSync(ATTENDANCE_DB, 'utf8') || '{}');
    obj[date] = record;
    fs.writeFileSync(ATTENDANCE_DB, JSON.stringify(obj, null, 2), 'utf8');
    res.json(obj);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save attendance' });
  }
});

// Tasks
app.get('/api/tasks', (req, res) => {
  const list = loadDb(TASKS_DB);
  res.json(list);
});
app.post('/api/tasks', (req, res) => {
  const t = req.body || {};
  if (!t.title || !t.dueDate) return res.status(400).json({ error: 'Missing title/dueDate' });
  const list = loadDb(TASKS_DB);
  const item = {
    id: randomUUID?.() || String(Date.now()),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    priority: t.priority || 'Medium',
    status: t.status || 'Pending',
    description: t.description || '',
    relatedDocId: t.relatedDocId || '',
    title: String(t.title),
    dueDate: String(t.dueDate),
  };
  list.push(item);
  saveDb(TASKS_DB, list);
  res.json(item);
});
app.put('/api/tasks/:id', (req, res) => {
  const id = req.params.id;
  const patch = req.body || {};
  const list = loadDb(TASKS_DB);
  const idx = list.findIndex((x) => x.id == id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const updated = { ...list[idx], ...patch, id, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  saveDb(TASKS_DB, list);
  res.json(updated);
});
app.delete('/api/tasks/:id', (req, res) => {
  const id = req.params.id;
  const list = loadDb(TASKS_DB);
  const next = list.filter((x) => x.id != id);
  if (next.length === list.length) return res.status(404).json({ error: 'Not found' });
  saveDb(TASKS_DB, next);
  res.json({ ok: true });
});

// Profile
app.get('/api/profile', (req, res) => {
  try {
    const raw = fs.readFileSync(PROFILE_DB, 'utf8');
    res.json(JSON.parse(raw || '{}'));
  } catch (e) {
    res.json({});
  }
});

// Offices
app.get('/api/offices', (req, res) => {
  const list = loadDb(OFFICES_DB);
  res.json(list);
});
app.put('/api/offices', (req, res) => {
  let list = req.body;
  if (!Array.isArray(list)) return res.status(400).json({ error: 'Expected array' });
  list = list
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i)
    .sort((a, b) => a.localeCompare(b));
  saveDb(OFFICES_DB, list);
  res.json(list);
});
app.put('/api/profile', (req, res) => {
  try {
    const obj = req.body || {};
    fs.writeFileSync(PROFILE_DB, JSON.stringify(obj, null, 2), 'utf8');
    res.json(obj);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

app.listen(PORT, () => {
  console.log(`MyDesk server running on http://localhost:${PORT}`);
  console.log('Base dir:', BASE_DIR);
  console.log('Inward dir:', INWARD_DIR);
  console.log('Outward dir:', OUTWARD_DIR);
  console.log('Profile file:', PROFILE_DB);
  if (CLEANUP_LEGACY) console.log('Legacy cleanup: enabled (MYDESK_CLEANUP_LEGACY=1)');
});
