/* night.js
   Night Before Routine: journal prompts + sets tomorrow's sticky note.
*/

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return todayStr(d);
}

function loadNightFormFromLatest() {
  // pre-fill nothing by default - it's a fresh entry each night
  document.getElementById("journal1").value = "";
  document.getElementById("journalTask").value = "";
  document.getElementById("journalFallback").value = "";
  document.getElementById("journal3").value = "";
  document.getElementById("nightSavedMsg").classList.add("hidden");
}

function saveNightEntry() {
  const entry = {
    date: todayStr(), // the night this was written
    forDate: tomorrowStr(), // the day this sticky note applies to
    j1: document.getElementById("journal1").value.trim(),
    j2task: document.getElementById("journalTask").value.trim(),
    j2fallback: document.getElementById("journalFallback").value.trim(),
    j3: document.getElementById("journal3").value.trim(),
    tomorrowSubject: document.getElementById("tomorrowSubject").value
  };

  addOrUpdateJournal(entry);

  document.getElementById("nightSavedMsg").classList.remove("hidden");
  renderStickyNote();
  renderPastJournal();
}

function renderStickyNote() {
  const latest = getLatestJournal();
  const taskEl = document.getElementById("stickyTaskText");
  const fallbackEl = document.getElementById("stickyFallbackText");
  const subjectSelect = document.getElementById("subjectSelect");

  if (!latest || !latest.j2task) {
    taskEl.textContent = "No task set — go to Night Before tab and write tonight's note.";
    fallbackEl.textContent = "";
    return;
  }

  // Only show as "active" sticky note if it was written for today
  const today = todayStr();
  if (latest.forDate === today) {
    taskEl.textContent = latest.j2task;
    fallbackEl.textContent = latest.j2fallback ? `Fallback: ${latest.j2fallback}` : "";
    // pre-select subject
    if (latest.tomorrowSubject) {
      subjectSelect.value = latest.tomorrowSubject;
    }
  } else {
    taskEl.textContent = `(Last note was for ${latest.forDate}) ${latest.j2task}`;
    fallbackEl.textContent = latest.j2fallback ? `Fallback: ${latest.j2fallback}` : "";
  }
}

function renderPastJournal() {
  const container = document.getElementById("pastJournal");
  container.innerHTML = "";

  const entries = [...DATA.journal].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);

  if (entries.length === 0) {
    container.innerHTML = `<p class="muted">No entries yet.</p>`;
    return;
  }

  entries.forEach(e => {
    const div = document.createElement("div");
    div.className = "journal-entry";
    div.innerHTML = `
      <div class="je-date">${e.date} (for ${e.forDate || "?"})</div>
      ${e.j1 ? `<div class="je-line"><strong>Moved forward:</strong> ${escapeHtml(e.j1)}</div>` : ""}
      ${e.j2task ? `<div class="je-line"><strong>Tomorrow's task:</strong> ${escapeHtml(e.j2task)}</div>` : ""}
      ${e.j2fallback ? `<div class="je-line"><strong>Fallback:</strong> ${escapeHtml(e.j2fallback)}</div>` : ""}
      ${e.j3 ? `<div class="je-line"><strong>Carrying:</strong> ${escapeHtml(e.j3)}</div>` : ""}
    `;
    container.appendChild(div);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function initNightHandlers() {
  document.getElementById("saveNightBtn").addEventListener("click", saveNightEntry);
  loadNightFormFromLatest();
  renderPastJournal();
}
