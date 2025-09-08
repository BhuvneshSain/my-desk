const LOCAL_STORAGE_KEYS = {
  ATTENDANCE: 'myDesk_attendance',
  TASKS: 'myDesk_tasks',
  INWARD: 'myDesk_inward',
  OUTWARD: 'myDesk_outward',
  OFFICES: 'myDesk_offices',
  PROFILE: 'myDesk_profile',
  JOURNAL: 'myDesk_journal',
  EXPENSES: 'myDesk_expenses',
  CONTACTS: 'myDesk_contacts',
  SHORTCUTS: 'myDesk_shortcuts',
  REMINDERS: 'myDesk_reminders',
};

export const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

export const getFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

export { LOCAL_STORAGE_KEYS };
