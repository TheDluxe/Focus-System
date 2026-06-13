/* storage.js
   Single source of truth. Everything reads/writes through this object.
   Persisted to localStorage under key "focusSystemData".
*/

const STORAGE_KEY = "focusSystemData";

const SUBJECTS = ["de", "french", "spanish", "music"];

const SUBJECT_LABELS = {
  de: "Data Engineering",
  french: "French",
  spanish: "Spanish",
  music: "Music Production"
};

// Extra fields tracked per subject (matches your weekly tracker doc)
const SUBJECT_EXTRAS = {
  de: [
    { key: "commits", label: "GitHub commits" },
    { key: "reps", label: "Reps passed" },
    { key: "posts", label: "LinkedIn posts" },
    { key: "outreach", label: "Outreach sent" }
  ],
  french: [
    { key: "vocab", label: "New words" },
    { key: "exercises", label: "Exercises done" }
  ],
  spanish: [
    { key: "vocab", label: "New words" },
    { key: "exercises", label: "Exercises done" }
  ],
  music: [
    { key: "tracks", label: "Tracks/loops made" },
    { key: "exercises", label: "Exercises done" }
  ]
};

function todayStr(d = new Date()) {
  // local date YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultData() {
  return {
    version: 1,
    sessions: [],     // {id, date, subject, minutes, repPass, extras:{}, notes}
    journal: [],      // {date, j1, j2task, j2fallback, j3, tomorrowSubject}
    meta: {
      lastExportDate: null,
      reminderEnabled: true,
      lastReminderShown: null
    }
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    // basic shape safety
    return {
      version: parsed.version || 1,
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      journal: Array.isArray(parsed.journal) ? parsed.journal : [],
      meta: Object.assign({ lastExportDate: null, reminderEnabled: true, lastReminderShown: null }, parsed.meta || {})
    };
  } catch (e) {
    console.error("Failed to load data, starting fresh.", e);
    return defaultData();
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// global in-memory store
let DATA = loadData();

function persist() {
  saveData(DATA);
}

function addSession(session) {
  DATA.sessions.push(session);
  persist();
}

function addOrUpdateJournal(entry) {
  const idx = DATA.journal.findIndex(j => j.date === entry.date);
  if (idx >= 0) {
    DATA.journal[idx] = entry;
  } else {
    DATA.journal.push(entry);
  }
  persist();
}

function getLatestJournal() {
  if (DATA.journal.length === 0) return null;
  return DATA.journal[DATA.journal.length - 1];
}

function getSessionsBySubject(subject) {
  return DATA.sessions.filter(s => s.subject === subject);
}

function getTotalMinutes(subject) {
  return getSessionsBySubject(subject).reduce((sum, s) => sum + s.minutes, 0);
}

function getSessionsForDate(dateStr) {
  return DATA.sessions.filter(s => s.date === dateStr);
}

// returns array of unique dates with at least one session, sorted ascending
function getActiveDates() {
  const set = new Set(DATA.sessions.map(s => s.date));
  return Array.from(set).sort();
}

// streak in days (consecutive days with ANY session, ending today or yesterday)
function getCurrentStreak() {
  const dates = new Set(DATA.sessions.map(s => s.date));
  let streak = 0;
  let cursor = new Date();
  // allow today to be empty without breaking yesterday's streak display
  if (!dates.has(todayStr(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dates.has(todayStr(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// consecutive days with ZERO sessions ending today
function getCurrentZeroStreak() {
  const dates = new Set(DATA.sessions.map(s => s.date));
  let zeroStreak = 0;
  let cursor = new Date();
  while (!dates.has(todayStr(cursor))) {
    zeroStreak++;
    cursor.setDate(cursor.getDate() - 1);
    if (zeroStreak > 60) break; // safety
  }
  return zeroStreak;
}
