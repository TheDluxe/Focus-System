/* dashboard.js
   Renders: subject totals cards, per-subject heatmaps, daily log table, weekly checkpoint.
*/

const SUBJECT_COLORS = {
  de: "#5b8def",
  french: "#b97ed9",
  spanish: "#e9a23b",
  music: "#4cc2a6"
};

function renderSubjectCards() {
  const container = document.getElementById("subjectCards");
  container.innerHTML = "";

  SUBJECTS.forEach(subj => {
    const total = getTotalMinutes(subj);
    const sessions = getSessionsBySubject(subj);
    const sessionCount = sessions.length;
    const repsPassed = sessions.filter(s => s.repPass === "yes").length;

    const card = document.createElement("div");
    card.className = `subject-card ${subj}`;
    card.innerHTML = `
      <div class="sc-name">${SUBJECT_LABELS[subj]}</div>
      <div class="sc-total">${total} min</div>
      <div class="sc-sub">${sessionCount} sessions · ${repsPassed} reps passed</div>
    `;
    container.appendChild(card);
  });
}

function renderStreakAlert() {
  const el = document.getElementById("streakAlert");
  const streak = getCurrentStreak();
  const zeroStreak = getCurrentZeroStreak();

  if (zeroStreak >= 2) {
    el.className = "streak-alert warn";
    el.textContent = `${zeroStreak} days with no session. The only alarm: open something and do one rep. Just one.`;
  } else if (streak > 0) {
    el.className = "streak-alert";
    el.textContent = `🔥 ${streak} day streak`;
  } else {
    el.className = "streak-alert empty";
  }
}

/* ---------- HEATMAPS ---------- */

function getLevelForMinutes(mins) {
  if (mins <= 0) return 0;
  if (mins < 30) return 1;
  if (mins < 75) return 2;
  return 3;
}

function renderHeatmaps() {
  const container = document.getElementById("heatmaps");
  container.innerHTML = "";

  // last ~182 days (26 weeks x 7), but laid out as a simple grid of 26 columns x 7 rows per subject
  const days = 182;
  const today = new Date();

  SUBJECTS.forEach(subj => {
    // map date -> minutes for this subject
    const minutesByDate = {};
    getSessionsBySubject(subj).forEach(s => {
      minutesByDate[s.date] = (minutesByDate[s.date] || 0) + s.minutes;
    });

    const block = document.createElement("div");
    block.className = "heatmap-block";

    const title = document.createElement("div");
    title.className = "heatmap-title";
    title.innerHTML = `<span class="heatmap-dot-legend" style="background:${SUBJECT_COLORS[subj]}"></span> ${SUBJECT_LABELS[subj]}`;
    block.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "heatmap-grid";

    // build cells oldest -> newest
    const cells = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = todayStr(d);
      const mins = minutesByDate[ds] || 0;
      const level = getLevelForMinutes(mins);
      cells.push({ ds, mins, level });
    }

    cells.forEach(c => {
      const cell = document.createElement("div");
      cell.className = "heatmap-cell";
      cell.title = `${c.ds}: ${c.mins} min`;
      cell.setAttribute("data-level", c.level);
      if (c.level > 0) {
        cell.style.background = SUBJECT_COLORS[subj];
      }
      grid.appendChild(cell);
    });

    block.appendChild(grid);
    container.appendChild(block);
  });
}

/* ---------- DAILY LOG TABLE ---------- */

function renderDailyLog() {
  const tbody = document.querySelector("#dailyLogTable tbody");
  tbody.innerHTML = "";

  const dates = getActiveDates().sort().reverse(); // most recent first
  const recentDates = dates.slice(0, 30); // last 30 active days

  recentDates.forEach(date => {
    const sessionsToday = getSessionsForDate(date);
    const minsBySubject = { de: 0, french: 0, spanish: 0, music: 0 };
    let dayTotal = 0;
    const extrasSummary = [];

    sessionsToday.forEach(s => {
      minsBySubject[s.subject] += s.minutes;
      dayTotal += s.minutes;
      Object.entries(s.extras || {}).forEach(([k, v]) => {
        if (v > 0) extrasSummary.push(`${SUBJECT_LABELS[s.subject]}: ${k}=${v}`);
      });
    });

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${date}</td>
      <td>${minsBySubject.de || ""}</td>
      <td>${minsBySubject.french || ""}</td>
      <td>${minsBySubject.spanish || ""}</td>
      <td>${minsBySubject.music || ""}</td>
      <td><strong>${dayTotal}</strong></td>
      <td>${extrasSummary.join(", ")}</td>
    `;
    tbody.appendChild(tr);
  });

  if (recentDates.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7" class="muted">No sessions logged yet. Start your first session in the Session tab.</td>`;
    tbody.appendChild(tr);
  }
}

/* ---------- WEEKLY SNAPSHOT ---------- */

function getWeekRange(weeksAgo = 0) {
  // Monday-Sunday week containing today, shifted back weeksAgo weeks
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek - (weeksAgo * 7));
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
}

function renderWeeklySnapshot() {
  const container = document.getElementById("weeklySnapshot");
  container.innerHTML = "";

  const { start, end } = getWeekRange(0);
  const startStr = todayStr(start);
  const endStr = todayStr(end);

  let totalMinutes = 0;
  const subjectTotals = { de: 0, french: 0, spanish: 0, music: 0 };
  let repsPassed = 0;
  let repsFailed = 0;
  const extrasTotals = {};

  DATA.sessions.forEach(s => {
    if (s.date >= startStr && s.date <= endStr) {
      totalMinutes += s.minutes;
      subjectTotals[s.subject] += s.minutes;
      if (s.repPass === "yes") repsPassed++;
      if (s.repPass === "no") repsFailed++;
      Object.entries(s.extras || {}).forEach(([k, v]) => {
        const key = `${s.subject}.${k}`;
        extrasTotals[key] = (extrasTotals[key] || 0) + v;
      });
    }
  });

  // activity status
  const activeDaysThisWeek = new Set(
    DATA.sessions.filter(s => s.date >= startStr && s.date <= endStr).map(s => s.date)
  ).size;

  let status = "❌ Red";
  if (activeDaysThisWeek >= 4) status = "✅ Green";
  else if (activeDaysThisWeek >= 1) status = "⚠️ Yellow";

  const extrasList = Object.entries(extrasTotals)
    .filter(([_, v]) => v > 0)
    .map(([k, v]) => {
      const [subj, key] = k.split(".");
      const label = (SUBJECT_EXTRAS[subj] || []).find(e => e.key === key)?.label || key;
      return `${SUBJECT_LABELS[subj]} — ${label}: ${v}`;
    });

  const card = document.createElement("div");
  card.className = "subject-card";
  card.style.borderLeftColor = "var(--accent)";
  card.innerHTML = `
    <div class="sc-name">This Week (${startStr} → ${endStr})</div>
    <div class="sc-total">${totalMinutes} min total</div>
    <div class="sc-sub">
      Status: ${status} · Active days: ${activeDaysThisWeek}/7 · Reps passed: ${repsPassed} · Reps failed: ${repsFailed}
    </div>
    <div class="sc-sub" style="margin-top:8px;">
      ${SUBJECTS.map(s => `${SUBJECT_LABELS[s]}: ${subjectTotals[s]}min`).join(" · ")}
    </div>
    ${extrasList.length ? `<div class="sc-sub" style="margin-top:8px;">${extrasList.join(" · ")}</div>` : ""}
  `;
  container.appendChild(card);
}

/* ---------- MASTER RENDER ---------- */

function renderDashboard() {
  renderSubjectCards();
  renderStreakAlert();
  renderHeatmaps();
  renderDailyLog();
  renderWeeklySnapshot();
}
