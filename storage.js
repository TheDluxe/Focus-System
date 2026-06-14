/* storage.js - Dynamic activities, sessions, journal */

const STORAGE_KEY = "focusSystemData_v2";

const DEFAULT_ACTIVITIES = [
  { id: "de",      name: "Data Engineering",  color: "#4d8ef0", goal: 200, extras: [
      { key: "commits",  label: "GitHub commits" },
      { key: "reps",     label: "Reps passed" },
      { key: "posts",    label: "LinkedIn posts" },
      { key: "outreach", label: "Outreach sent" }
    ]
  },
  { id: "french",  name: "French",            color: "#b87de8", goal: 100, extras: [
      { key: "vocab",     label: "New words" },
      { key: "exercises", label: "Exercises" }
    ]
  },
  { id: "spanish", name: "Spanish",           color: "#f0a83a", goal: 100, extras: [
      { key: "vocab",     label: "New words" },
      { key: "exercises", label: "Exercises" }
    ]
  },
  { id: "music",   name: "Music Production",  color: "#3ecfb8", goal: 80,  extras: [
      { key: "tracks",    label: "Tracks / loops" },
      { key: "exercises", label: "Exercises" }
    ]
  }
];

function todayStr(d = new Date()) {
  return [d.getFullYear(), String(d.getMonth()+1).padStart(2,"0"), String(d.getDate()).padStart(2,"0")].join("-");
}

function defaultData() {
  return {
    version: 2,
    activities: JSON.parse(JSON.stringify(DEFAULT_ACTIVITIES)),
    sessions: [],
    journal: [],
    meta: { lastExportDate: null, reminderEnabled: true, lastReminderShown: null, theme: "auto" }
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const p = JSON.parse(raw);
    return {
      version: p.version || 2,
      activities: Array.isArray(p.activities) && p.activities.length ? p.activities : JSON.parse(JSON.stringify(DEFAULT_ACTIVITIES)),
      sessions: Array.isArray(p.sessions) ? p.sessions : [],
      journal:  Array.isArray(p.journal)  ? p.journal  : [],
      meta: Object.assign({ lastExportDate:null, reminderEnabled:true, lastReminderShown:null, theme:"auto" }, p.meta||{})
    };
  } catch(e) { return defaultData(); }
}

let DATA = loadData();
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA)); }

/* ── ACTIVITIES ── */
function getActivities() { return DATA.activities; }
function getActivity(id)  { return DATA.activities.find(a => a.id === id); }

function saveActivity(act) {
  const idx = DATA.activities.findIndex(a => a.id === act.id);
  if (idx >= 0) DATA.activities[idx] = act;
  else DATA.activities.push(act);
  persist();
}

function deleteActivity(id) {
  DATA.activities = DATA.activities.filter(a => a.id !== id);
  persist();
}

function reorderActivities(ids) {
  const map = Object.fromEntries(DATA.activities.map(a => [a.id, a]));
  DATA.activities = ids.map(id => map[id]).filter(Boolean);
  persist();
}

function generateActivityId(name) {
  return name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"") + "-" + Date.now().toString(36);
}

/* ── SESSIONS ── */
function addSession(s)              { DATA.sessions.push(s); persist(); }
function getSessionsByActivity(id)  { return DATA.sessions.filter(s => s.subject === id); }
function getTotalMinutes(id)        { return getSessionsByActivity(id).reduce((n,s)=>n+s.minutes,0); }
function getSessionsForDate(dt)     { return DATA.sessions.filter(s => s.date === dt); }
function getActiveDates()           { return [...new Set(DATA.sessions.map(s=>s.date))].sort(); }

function getCurrentStreak() {
  const dates = new Set(DATA.sessions.map(s=>s.date));
  let streak=0, cursor=new Date();
  if (!dates.has(todayStr(cursor))) cursor.setDate(cursor.getDate()-1);
  while(dates.has(todayStr(cursor))){ streak++; cursor.setDate(cursor.getDate()-1); }
  return streak;
}

function getCurrentZeroStreak() {
  const dates = new Set(DATA.sessions.map(s=>s.date));
  let z=0, cursor=new Date();
  while(!dates.has(todayStr(cursor))){ z++; cursor.setDate(cursor.getDate()-1); if(z>60) break; }
  return z;
}

/* ── JOURNAL ── */
function addOrUpdateJournal(entry) {
  const idx = DATA.journal.findIndex(j => j.date === entry.date);
  if (idx>=0) DATA.journal[idx]=entry; else DATA.journal.push(entry);
  persist();
}
function getLatestJournal() {
  return DATA.journal.length ? DATA.journal[DATA.journal.length-1] : null;
}

function tomorrowStr() {
  const d=new Date(); d.setDate(d.getDate()+1); return todayStr(d);
}
