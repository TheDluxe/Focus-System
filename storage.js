/* storage.js - Dynamic activities, sessions, journal */

const STORAGE_KEY = "focusSystemData_v2";

const DEFAULT_ACTIVITIES = [
  { id: "kosmus",   name: "Kosmus Studio",      color: "#6B1A1A", goal: 200, extras: [
      { key: "videos",   label: "Videos rendered" },
      { key: "posts",    label: "Posted (TikTok/Reels)" }
    ]
  },
  { id: "writing",  name: "Songwriting / Co-writes", color: "#4d8ef0", goal: 100, extras: [
      { key: "songs",    label: "Songs / demos started" },
      { key: "finished", label: "Demos finished" }
    ]
  },
  { id: "production", name: "Beat / Production",  color: "#3ecfb8", goal: 100, extras: [
      { key: "beats",    label: "Beats made" },
      { key: "placed",   label: "Pitched / sent out" }
    ]
  },
  { id: "locs",     name: "Locs Maintenance",   color: "#b87de8", goal: 0,  extras: [
      { key: "retwist",  label: "Retwist done" }
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

/* ── MINIMUM VIABLE DAY ──
   A day only counts toward a streak if at least MVD_MINUTES were logged.
   Total hours/volume stats are unaffected — this only gates streaks. */
const MVD_MINUTES = 15;

function getDayTotalMinutes(date) {
  return DATA.sessions.filter(s=>s.date===date).reduce((n,s)=>n+s.minutes,0);
}

function getDayMinutesForActivity(actId, date) {
  return DATA.sessions.filter(s=>s.date===date && s.subject===actId).reduce((n,s)=>n+s.minutes,0);
}

function getCurrentStreak() {
  let streak=0, cursor=new Date();
  if (getDayTotalMinutes(todayStr(cursor)) < MVD_MINUTES) cursor.setDate(cursor.getDate()-1);
  while(getDayTotalMinutes(todayStr(cursor)) >= MVD_MINUTES){ streak++; cursor.setDate(cursor.getDate()-1); }
  return streak;
}

function getCurrentStreakForActivity(actId) {
  let streak=0, cursor=new Date();
  if (getDayMinutesForActivity(actId, todayStr(cursor)) < MVD_MINUTES) cursor.setDate(cursor.getDate()-1);
  while(getDayMinutesForActivity(actId, todayStr(cursor)) >= MVD_MINUTES){ streak++; cursor.setDate(cursor.getDate()-1); }
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

/* Equanimity check: prompt 3 ("what am I carrying") repeating or present
   on 2+ consecutive most-recent journal entries is the signal to act,
   per the doc's Equanimity Response Protocol. */
function getEquanimityFlag() {
  const sorted=[...DATA.journal].sort((a,b)=>b.date.localeCompare(a.date));
  if (sorted.length<2) return null;
  const [latest, prev] = sorted;
  if (latest.j3 && latest.j3.trim() && prev.j3 && prev.j3.trim()) {
    return { latest: latest.j3, prev: prev.j3 };
  }
  return null;
}

function tomorrowStr() {
  const d=new Date(); d.setDate(d.getDate()+1); return todayStr(d);
}
