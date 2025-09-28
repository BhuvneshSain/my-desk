import api from './api';
import { LOCAL_STORAGE_KEYS, getFromLocalStorage, saveToLocalStorage } from './localStorage';

function safeArray(x) { return Array.isArray(x) ? x : []; }
function isEmptyObject(x) { return !x || (typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length === 0); }

export async function runMigration() {
  try {
    // Skip if migration already completed (to prevent resurrecting deleted items)
    try {
      if (typeof window !== 'undefined') {
        const done = window.localStorage.getItem('myDesk_migrated');
        if (done === '1') return;
      }
    } catch {}
    // Show global busy during migration
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('mydesk-loading',{ detail:{ active:true } })); } catch {}
    // Check server state
    const [inwardSrv, outwardSrv, attendanceSrv, tasksSrv, profileSrv, officesSrv] = await Promise.allSettled([
      api.getInward(),
      api.getOutward(),
      api.getAttendance(),
      api.getTasks(),
      api.getProfile(),
      api.getOffices(),
    ]);
    // Inward
    try {
      const serverList = inwardSrv.status === 'fulfilled' ? safeArray(inwardSrv.value) : [];
      const serverNos = new Set(serverList.map(x => String(x.fileNo||'').toLowerCase()));
      const local = safeArray(getFromLocalStorage(LOCAL_STORAGE_KEYS.INWARD, []));
      for (const it of local) {
        const fileNo = String(it.fileNo||'').toLowerCase();
        if (!fileNo || serverNos.has(fileNo)) continue;
        // Only migrate items that still have base64 data
        if (it?.document?.data && (it.fromOffice || it.from)) {
          try { await api.addInward({ fileNo: it.fileNo, fromOffice: it.fromOffice || it.from, subject: it.subject || '', note: it.note || '', document: it.document }); } catch {}
        }
      }
    } catch {}

    // Outward
    try {
      const serverList = outwardSrv.status === 'fulfilled' ? safeArray(outwardSrv.value) : [];
      const serverNos = new Set(serverList.map(x => String(x.fileNo||'').toLowerCase()));
      const local = safeArray(getFromLocalStorage(LOCAL_STORAGE_KEYS.OUTWARD, []));
      for (const it of local) {
        const fileNo = String(it.fileNo||'').toLowerCase();
        if (!fileNo || serverNos.has(fileNo)) continue;
        if (it?.document?.data && (it.toOffice || it.to)) {
          try { await api.addOutward({ fileNo: it.fileNo, toOffice: it.toOffice || it.to, subject: it.subject || '', note: it.note || '', document: it.document }); } catch {}
        }
      }
    } catch {}

    // Attendance
    try {
      const server = attendanceSrv.status === 'fulfilled' ? (attendanceSrv.value || {}) : {};
      const local = getFromLocalStorage(LOCAL_STORAGE_KEYS.ATTENDANCE, {});
      if (local && typeof local === 'object') {
        for (const [date, record] of Object.entries(local)) {
          const srec = server?.[date];
          const different = !srec || JSON.stringify(srec) !== JSON.stringify(record);
          if (different) { try { await api.upsertAttendance(date, record); } catch {} }
        }
      }
    } catch {}

    // Tasks
    try {
      const serverList = tasksSrv.status === 'fulfilled' ? safeArray(tasksSrv.value) : [];
      const serverIds = new Set(serverList.map(t => String(t.id)));
      const serverSig = new Set(serverList.map(t => `${(t.title||'').toLowerCase()}|${String(t.dueDate||'')}`));
      const local = safeArray(getFromLocalStorage(LOCAL_STORAGE_KEYS.TASKS, []));
      for (const t of local) {
        const id = String(t.id||'');
        const sig = `${(t.title||'').toLowerCase()}|${String(t.dueDate||'')}`;
        if (serverIds.has(id) || serverSig.has(sig)) continue;
        const payload = { title: t.title, description: t.description || '', priority: t.priority || 'Medium', status: t.status || 'Pending', dueDate: t.dueDate, relatedDocId: t.relatedDocId || '' };
        try { await api.addTask(payload); } catch {}
      }
    } catch {}

    // Profile
    try {
      const server = profileSrv.status === 'fulfilled' ? (profileSrv.value || {}) : {};
      const local = getFromLocalStorage(LOCAL_STORAGE_KEYS.PROFILE, null);
      if (local && typeof local === 'object') {
        const sTime = new Date(server?.updatedAt || 0).getTime();
        const lTime = new Date(local?.updatedAt || 0).getTime();
        if (lTime > sTime) { try { await api.saveProfile(local); } catch {} }
      }
    } catch {}
    
    // Offices: merge and push
    try {
      const server = officesSrv.status === 'fulfilled' ? safeArray(officesSrv.value) : [];
      const local = safeArray(getFromLocalStorage(LOCAL_STORAGE_KEYS.OFFICES, []));
      const merged = [...server, ...local]
        .map(v => String(v||'').trim())
        .filter(Boolean)
        .filter((v, i, arr) => arr.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i)
        .sort((a,b)=>a.localeCompare(b));
      if (merged.length !== server.length) { try { await api.saveOffices(merged); } catch {} }
    } catch {}
  } catch {}
  finally {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mydesk-loading',{ detail:{ active:false } }));
        window.localStorage.setItem('myDesk_migrated', '1');
      }
    } catch {}
  }
}

export default { runMigration };
