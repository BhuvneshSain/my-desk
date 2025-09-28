import { format } from 'date-fns';
import { LOCAL_STORAGE_KEYS, getFromLocalStorage } from '../utils/localStorage';

export default function ExportData() {
  const collect = () => {
    const pick = (k, d) => getFromLocalStorage(k, d);
    const payload = {
      inward: pick(LOCAL_STORAGE_KEYS.INWARD, []),
      outward: pick(LOCAL_STORAGE_KEYS.OUTWARD, []),
      attendance: pick(LOCAL_STORAGE_KEYS.ATTENDANCE, {}),
      tasks: pick(LOCAL_STORAGE_KEYS.TASKS, []),
      profile: pick(LOCAL_STORAGE_KEYS.PROFILE, {}),
      offices: pick(LOCAL_STORAGE_KEYS.OFFICES, []),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mydesk-local-export_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(url), 1500);
  };

  return (
    <div className="space-y-4 bg-card border-2 border-border/40 rounded-xl p-6 shadow-retro">
      <h1 className="text-2xl font-semibold">Export Local Data</h1>
      <p className="text-muted-foreground">Download all current local data (inward/outward, attendance, tasks, profile, offices) as a JSON file.</p>
      <button onClick={collect} className="px-4 py-2 rounded-md bg-primary text-primary-foreground border border-border shadow-retro hover:bg-primary-hover">Download Export JSON</button>
      <p className="text-sm text-muted-foreground">Open this on the browser that has your data.</p>
    </div>
  );
}

