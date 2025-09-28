// Node script: import a mydesk localStorage export JSON into disk storage
// Usage: node scripts/import-local.js path/to/export.json
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const BASE_DIR = process.env.MYDESK_BASE_DIR || 'C:/Users/bhuvn/OneDrive/My Desk';
const INWARD_DIR = path.join(BASE_DIR, 'Inward');
const OUTWARD_DIR = path.join(BASE_DIR, 'Outward');
const INWARD_DB = path.join(INWARD_DIR, 'inward.json');
const OUTWARD_DB = path.join(OUTWARD_DIR, 'outward.json');
const ATTENDANCE_DB = path.join(BASE_DIR, 'attendance.json');
const TASKS_DB = path.join(BASE_DIR, 'tasks.json');
const PROFILE_DB = path.join(BASE_DIR, 'profile.json');
const OFFICES_DB = path.join(BASE_DIR, 'offices.json');

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function loadJson(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } }
function saveJson(p, data) { fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8'); }
function safeFilename(name) {
  const base = path.parse(name || `attachment_${Date.now()}`).name.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const ext = path.extname(name || '') || '';
  return `${base}${ext}`;
}
function decodeDataUrl(dataUrl) {
  if (!dataUrl) return null;
  const idx = dataUrl.indexOf('base64,');
  if (idx === -1) return null;
  const b64 = dataUrl.slice(idx + 7);
  return Buffer.from(b64, 'base64');
}

async function main() {
  let file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    // Try to auto-discover from Downloads
    try {
      const downloads = path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Downloads');
      const entries = fs.readdirSync(downloads, { withFileTypes: true });
      const matches = entries
        .filter((d) => d.isFile() && /^mydesk-local-export_.*\.json$/i.test(d.name))
        .map((d) => {
          const full = path.join(downloads, d.name);
          const stat = fs.statSync(full);
          return { full, mtime: stat.mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime);
      if (matches.length) {
        file = matches[0].full;
        console.log('Using most recent export JSON:', file);
      }
    } catch {}
  }
  if (!file || !fs.existsSync(file)) {
    console.error('Provide path to export JSON. Example:');
    console.error('  npm run import:local "C:\\Users\\<you>\\Downloads\\mydesk-local-export_YYYYMMDD_HHmm.json"');
    process.exit(1);
  }
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));

  ensureDir(BASE_DIR); ensureDir(INWARD_DIR); ensureDir(OUTWARD_DIR);

  // Load current on-disk
  let inward = loadJson(INWARD_DB, []);
  let outward = loadJson(OUTWARD_DB, []);
  let attendance = loadJson(ATTENDANCE_DB, {});
  let tasks = loadJson(TASKS_DB, []);
  let profile = loadJson(PROFILE_DB, {});
  let offices = loadJson(OFFICES_DB, [ 'General Administration', 'Accounts Section', 'HR Department' ]);

  const rep = { inwardAdded: 0, outwardAdded: 0, tasksAdded: 0, attendanceKeys: 0, profileUpdated: false, officesAdded: 0 };

  // Inward
  for (const it of Array.isArray(exported.inward) ? exported.inward : []) {
    const fileNo = String(it.fileNo || '').trim();
    const fromOffice = it.fromOffice || it.from || '';
    if (!fileNo || !fromOffice) continue;
    if (inward.some(x => (x.fileNo||'').toLowerCase() === fileNo.toLowerCase())) continue;
    let filename = safeFilename(it.document?.name || `${fileNo}.bin`);
    let filePath = path.join(INWARD_DIR, filename);
    const buf = decodeDataUrl(it.document?.data || '');
    if (buf) {
      if (fs.existsSync(filePath)) {
        const p = path.parse(filename); filename = `${p.name}_${Date.now()}${p.ext}`; filePath = path.join(INWARD_DIR, filename);
      }
      fs.writeFileSync(filePath, buf);
    }
    const item = {
      id: it.id || randomUUID(),
      date: it.date || new Date().toISOString(),
      fileNo,
      fromOffice,
      subject: it.subject || '',
      note: it.note || '',
      document: { name: filename, type: it.document?.type || '', size: buf ? buf.length : (it.document?.size||0) },
      fileUrl: `/files/inward/${encodeURIComponent(filename)}`,
    };
    inward.unshift(item);
    rep.inwardAdded++;
  }

  // Outward
  for (const it of Array.isArray(exported.outward) ? exported.outward : []) {
    const fileNo = String(it.fileNo || '').trim();
    const toOffice = it.toOffice || it.to || '';
    if (!fileNo || !toOffice) continue;
    if (outward.some(x => (x.fileNo||'').toLowerCase() === fileNo.toLowerCase())) continue;
    let filename = safeFilename(it.document?.name || `${fileNo}.bin`);
    let filePath = path.join(OUTWARD_DIR, filename);
    const buf = decodeDataUrl(it.document?.data || '');
    if (buf) {
      if (fs.existsSync(filePath)) {
        const p = path.parse(filename); filename = `${p.name}_${Date.now()}${p.ext}`; filePath = path.join(OUTWARD_DIR, filename);
      }
      fs.writeFileSync(filePath, buf);
    }
    const item = {
      id: it.id || randomUUID(),
      date: it.date || new Date().toISOString(),
      fileNo,
      toOffice,
      subject: it.subject || '',
      note: it.note || '',
      document: { name: filename, type: it.document?.type || '', size: buf ? buf.length : (it.document?.size||0) },
      fileUrl: `/files/outward/${encodeURIComponent(filename)}`,
    };
    outward.unshift(item);
    rep.outwardAdded++;
  }

  // Attendance
  const attObj = exported.attendance && typeof exported.attendance === 'object' ? exported.attendance : {};
  for (const [k, v] of Object.entries(attObj)) {
    attendance[k] = v;
  }
  rep.attendanceKeys = Object.keys(attObj).length;

  // Tasks
  for (const t of Array.isArray(exported.tasks) ? exported.tasks : []) {
    const exists = tasks.some(x => x.id === t.id) || tasks.some(x => x.title === t.title && x.dueDate === t.dueDate);
    if (exists) continue;
    tasks.push({
      id: t.id || randomUUID(),
      title: t.title,
      description: t.description || '',
      priority: t.priority || 'Medium',
      status: t.status || 'Pending',
      dueDate: t.dueDate,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString(),
      relatedDocId: t.relatedDocId || '',
    });
    rep.tasksAdded++;
  }

  // Profile
  if (exported.profile && typeof exported.profile === 'object' && Object.keys(exported.profile).length) {
    profile = { ...exported.profile };
    rep.profileUpdated = true;
  }

  // Offices
  const expOffices = Array.isArray(exported.offices) ? exported.offices : [];
  const merged = [...offices, ...expOffices]
    .map(v => String(v||'').trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i)
    .sort((a,b)=>a.localeCompare(b));
  rep.officesAdded = Math.max(0, merged.length - offices.length);
  offices = merged;

  // Save all
  saveJson(INWARD_DB, inward);
  saveJson(OUTWARD_DB, outward);
  saveJson(ATTENDANCE_DB, attendance);
  saveJson(TASKS_DB, tasks);
  saveJson(PROFILE_DB, profile);
  saveJson(OFFICES_DB, offices);

  console.log('Imported into:', BASE_DIR);
  console.table(rep);
  console.log('Files written:');
  console.log(' ', INWARD_DB);
  console.log(' ', OUTWARD_DB);
  console.log(' ', ATTENDANCE_DB);
  console.log(' ', TASKS_DB);
  console.log(' ', PROFILE_DB);
  console.log(' ', OFFICES_DB);
}

main().catch(e => { console.error(e); process.exit(1); });
