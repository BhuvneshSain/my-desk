import { useState, useEffect, useMemo } from 'react';
import {
  format,
  isWeekend,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { LOCAL_STORAGE_KEYS, saveToLocalStorage, getFromLocalStorage } from '../utils/localStorage';
import * as XLSX from 'xlsx';

const TYPES = [
  { key: 'present', label: 'Present', color: 'emerald' },
  { key: 'official_travel', label: 'Official Travel', color: 'blue' },
  { key: 'official_leave', label: 'Official Leave', color: 'red' },
  { key: 'on_duty_leave', label: 'On Duty Leave', color: 'sky' },
  { key: 'casual_leave', label: 'Casual Leave', color: 'amber' },
  { key: 'medical_leave', label: 'Medical Leave', color: 'rose' },
  { key: 'privilege_leave', label: 'Privilege Leave', color: 'indigo' },
  { key: 'unpaid_leave', label: 'Without Pay', color: 'gray' },
];

export default function AttendancePage() {
  const profile = getFromLocalStorage(LOCAL_STORAGE_KEYS.PROFILE, null);
  const START_DATE = profile?.joiningDate ? new Date(profile.joiningDate) : new Date(2025, 7, 21); // default fallback
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(startOfMonth(new Date()));
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [type, setType] = useState('present');
  const [reason, setReason] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);
  const startStr = useMemo(() => format(START_DATE, 'yyyy-MM-dd'), []);
  const minMonth = useMemo(() => startOfMonth(START_DATE), [START_DATE]);
  const maxMonth = useMemo(() => startOfMonth(today), [today]);
  const canPrev = viewMonth > minMonth;
  const canNext = viewMonth < maxMonth;

  useEffect(() => {
    const savedRecords = getFromLocalStorage(LOCAL_STORAGE_KEYS.ATTENDANCE, {}) || {};
    const migrated = Object.fromEntries(
      Object.entries(savedRecords).map(([k, v]) => {
        if (!v) return [k, v];
        if (!v.type && (v.in || v.out)) {
          return [k, { date: k, type: 'present', reason: '', updatedAt: v.updatedAt || new Date().toISOString() }];
        }
        return [k, v];
      })
    );
    setAttendanceRecords(migrated);
    if (migrated !== savedRecords) saveToLocalStorage(LOCAL_STORAGE_KEYS.ATTENDANCE, migrated);
  }, []);

  useEffect(() => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    const rec = attendanceRecords[key];
    if (rec) {
      setType(rec.type || 'present');
      setReason(rec.reason || '');
    } else {
      if (isWeekend(selectedDate) && key >= startStr && key <= todayStr) {
        setType('official_leave');
        setReason(format(selectedDate, 'EEEE'));
      } else {
        setType('present');
        setReason('');
      }
    }
  }, [selectedDate, attendanceRecords]);

  const dateKey = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const futureSelected = dateKey > todayStr;
  const weekendSelected = isWeekend(selectedDate);
  const showReason = type !== 'present';

  const saveRecord = () => {
    const updated = {
      ...attendanceRecords,
      [dateKey]: { date: dateKey, type, reason: type === 'present' ? '' : reason, updatedAt: new Date().toISOString() },
    };
    setAttendanceRecords(updated);
    saveToLocalStorage(LOCAL_STORAGE_KEYS.ATTENDANCE, updated);
    setToastMsg('Attendance saved');
    setTimeout(() => setToastMsg(''), 1500);
  };

  const getMonthRecords = () => {
    const ym = format(viewMonth, 'yyyy-MM');
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    const records = [];
    eachDayOfInterval({ start, end }).forEach((d) => {
      const key = format(d, 'yyyy-MM-dd');
      if (key < startStr || key > todayStr) return;
      if (!key.startsWith(ym)) return;
      let rec = attendanceRecords[key];
      const weekendLabel = format(d, 'EEE');
      if (isWeekend(d)) {
        if (!rec) rec = { date: key, type: 'official_leave', reason: weekendLabel };
        else if (rec.type === 'official_leave' && !rec.reason) rec = { ...rec, reason: weekendLabel };
      }
      if (rec) records.push([key, rec]);
    });
    return records.sort((a, b) => (a[0] < b[0] ? 1 : -1));
  };

  const monthSummary = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    const counts = TYPES.reduce((acc, t) => ({ ...acc, [t.key]: 0 }), {});
    eachDayOfInterval({ start, end }).forEach((d) => {
      const key = format(d, 'yyyy-MM-dd');
      if (key < startStr || key > todayStr) return;
      let rec = attendanceRecords[key];
      if (!rec && isWeekend(d)) rec = { type: 'official_leave', reason: format(d, 'EEE') };
      if (rec?.type && counts[rec.type] !== undefined) counts[rec.type] += 1;
    });
    return counts;
  }, [attendanceRecords, viewMonth, startStr, todayStr]);

  const exportToExcel = () => {
    const combined = { ...attendanceRecords };
    const start = START_DATE;
    const end = new Date();
    eachDayOfInterval({ start, end }).forEach((d) => {
      const key = format(d, 'yyyy-MM-dd');
      const weekendLabel = format(d, 'EEE');
      if (isWeekend(d)) {
        if (!combined[key]) combined[key] = { date: key, type: 'official_leave', reason: weekendLabel };
        else if (combined[key].type === 'official_leave' && !combined[key].reason) combined[key] = { ...combined[key], reason: weekendLabel };
      }
    });
    const data = Object.entries(combined)
      .filter(([date]) => date >= startStr && date <= todayStr)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, record]) => ({
        Date: date,
        Type: TYPES.find(t => t.key === record.type)?.label || record.type || '',
        Reason: record.reason || '',
      }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `attendance_${format(new Date(), 'yyyy-MM')}.xlsx`);
  };

  const daysMatrix = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 0 });
    const all = eachDayOfInterval({ start, end });
    const rows = [];
    for (let i = 0; i < all.length; i += 7) rows.push(all.slice(i, i + 7));
    return rows;
  }, [viewMonth]);

  const typeColorMap = {
    present: 'bg-emerald-500',
    official_leave: 'bg-red-500',
    official_travel: 'bg-blue-500',
    on_duty_leave: 'bg-sky-500',
    casual_leave: 'bg-amber-500',
    medical_leave: 'bg-rose-500',
    privilege_leave: 'bg-indigo-500',
    unpaid_leave: 'bg-gray-500',
  };

  const typeBadge = (k) => `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    k === 'present' ? 'bg-emerald-100 text-emerald-700' :
    k === 'official_leave' ? 'bg-red-100 text-red-700' :
    k === 'official_travel' ? 'bg-blue-100 text-blue-700' :
    k === 'casual_leave' ? 'bg-amber-100 text-amber-700' :
    k === 'medical_leave' ? 'bg-rose-100 text-rose-700' :
    k === 'privilege_leave' ? 'bg-indigo-100 text-indigo-700' :
    'bg-gray-100 text-gray-700'
  }`;

  const currentRecord = attendanceRecords[dateKey];
  const typeBtnActive = {
    present: 'bg-emerald-600 border-emerald-600 text-white',
    official_travel: 'bg-blue-600 border-blue-600 text-white',
    official_leave: 'bg-red-600 border-red-600 text-white',
    on_duty_leave: 'bg-sky-600 border-sky-600 text-white',
    casual_leave: 'bg-amber-600 border-amber-600 text-white',
    medical_leave: 'bg-rose-600 border-rose-600 text-white',
    privilege_leave: 'bg-indigo-600 border-indigo-600 text-white',
    unpaid_leave: 'bg-gray-600 border-gray-600 text-white',
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6 bg-gradient-to-r from-brand to-blue-500 text-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Attendance</h1>
            <p className="text-white/90">Track and manage your daily attendance records</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full border border-white/40 bg-white/10 text-sm">{format(selectedDate, 'EEE, dd MMM yyyy')}</span>
            {type && <span className="px-3 py-1 rounded-full bg-white/20 text-sm">{TYPES.find(t=>t.key===type)?.label}</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button aria-label="Previous month" className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40" onClick={() => canPrev && setViewMonth(subMonths(viewMonth, 1))} disabled={!canPrev}>&larr;</button>
              <h2 className="font-semibold">{format(viewMonth, 'MMMM yyyy')}</h2>
              <button aria-label="Next month" className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-40" onClick={() => canNext && setViewMonth(addMonths(viewMonth, 1))} disabled={!canNext}>&rarr;</button>
            </div>
            <button className="px-2 py-1 text-sm rounded border hover:bg-gray-50" onClick={() => { setViewMonth(startOfMonth(today)); setSelectedDate(today); }}>Today</button>
          </div>
          <div className="mt-3 grid grid-cols-7 text-center text-xs text-gray-500">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (<div key={d} className="py-1">{d}</div>))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500"/> Present</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500"/> Official Leave</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-500"/> Casual Leave</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-500"/> Official Travel</span>
          </div>
          <div className="mt-1 space-y-1">
            {daysMatrix.map((week, wi) => (
              <div key={`w-${wi}`} className="grid grid-cols-7 gap-1 auto-rows-[2.5rem] md:auto-rows-[3rem]">
                {week.map((day, di) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const outMonth = !isSameMonth(day, viewMonth);
                  const disabled = isWeekend(day) || key < startStr || key > todayStr;
                  const rec = attendanceRecords[key];
                  let typeKey = rec?.type;
                  if (!typeKey && isWeekend(day) && key >= startStr && key <= todayStr) typeKey = 'official_leave';
                  const isSel = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, today);
                  return (
                    <button
                      key={`${wi}-${di}-${key}`}
                      onClick={() => !disabled && setSelectedDate(day)}
                      className={`relative w-full h-10 md:h-12 rounded border border-gray-200 text-sm flex items-center justify-center select-none transition ${disabled ? 'text-red-500/80' : 'hover:bg-gray-100'} ${outMonth ? 'text-gray-300' : 'text-gray-800'} ${isSel ? 'ring-2 ring-brand bg-indigo-50' : ''} ${isToday ? 'after:content-[""] after:absolute after:top-1 after:right-1 after:w-1.5 after:h-1.5 after:rounded-full after:bg-brand' : ''}`}
                      disabled={disabled}
                      title={key}
                    >
                      {format(day, 'd')}
                      {typeKey && (
                        <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${typeColorMap[typeKey]}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold">Monthly Overview</h2>
              <p className="text-xs text-gray-500">{format(viewMonth, 'MMMM yyyy')}</p>
            </div>
            <button onClick={exportToExcel} className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50">Export</button>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-600 border-b">
                  <th className="py-2">Date</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {getMonthRecords().map(([date, record]) => (
                  <tr key={date} className={`hover:bg-gray-50 cursor-pointer ${date === dateKey ? 'bg-indigo-50' : ''}`} onClick={() => setSelectedDate(new Date(date))}>
                    <td className="py-2 align-top">{format(new Date(date), 'dd MMM, yyyy')}</td>
                    <td className="py-2 align-top"><span className={typeBadge(record.type)}>{TYPES.find(t=>t.key===record.type)?.label || record.type}</span></td>
                    <td className="py-2 align-top">{record.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Monthly Summary</div>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <span key={t.key} className="px-2 py-1 rounded border text-xs bg-white">{t.label}: {monthSummary[t.key] || 0}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Mark Attendance</h2>
          <p className="text-sm text-gray-500">Select your status for {format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => {
            const active = type === t.key;
            const base = 'px-3 py-2 rounded-md border text-sm transition';
            const color = active ? (typeBtnActive[t.key] || 'bg-indigo-600 border-indigo-600 text-white') : 'bg-white border-gray-300 hover:bg-gray-50';
            return (
              <button key={t.key} className={`${base} ${color}`} onClick={() => setType(t.key)} disabled={weekendSelected || futureSelected}>{t.label}</button>
            );
          })}
        </div>
        {showReason && (
          <div className="mt-4">
            <label className="block text-sm text-gray-600 mb-1">Reason</label>
            <input type="text" className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Provide a brief reason" value={reason} onChange={(e) => setReason(e.target.value)} disabled={weekendSelected || futureSelected} />
          </div>
        )}
        <div className="mt-4 flex items-center gap-2">
          <button onClick={saveRecord} disabled={weekendSelected || futureSelected} className="px-4 py-2 rounded-md bg-brand text-white hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed">Save</button>
          {currentRecord && (<span className={`${typeBadge(currentRecord.type)} text-xs`}>{TYPES.find(t=>t.key===currentRecord.type)?.label || currentRecord.type}</span>)}
          {currentRecord?.reason && (<span className="text-sm text-gray-500">Reason: {currentRecord.reason}</span>)}
        </div>
      </div>

      {toastMsg && (<div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 bg-emerald-600 text-white px-4 py-2 rounded-full shadow">{toastMsg}</div>)}
    </div>
  );
}
