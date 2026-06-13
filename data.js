/* data.js
   Export to JSON file, import from JSON file, reset, raw preview,
   and weekly export reminder (Sunday + on-open).
*/

function exportData() {
  const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = todayStr();
  a.href = url;
  a.download = `focus-system-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  DATA.meta.lastExportDate = todayStr();
  persist();
  renderDataView();
  hideExportReminder();
}

function importDataFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported.sessions) || !Array.isArray(imported.journal)) {
        alert("This file doesn't look like a valid Focus System backup.");
        return;
      }

      const merge = confirm(
        "Import found. Click OK to MERGE with existing data (recommended), or Cancel to REPLACE all existing data with this file."
      );

      if (merge) {
        // merge sessions by id (avoid duplicates)
        const existingIds = new Set(DATA.sessions.map(s => s.id));
        imported.sessions.forEach(s => {
          if (!existingIds.has(s.id)) {
            DATA.sessions.push(s);
            existingIds.add(s.id);
          }
        });
        // merge journal by date (imported wins on conflict... actually keep both, dedupe by date+forDate)
        const existingJournalKeys = new Set(DATA.journal.map(j => j.date + "|" + j.forDate));
        imported.journal.forEach(j => {
          const key = j.date + "|" + j.forDate;
          if (!existingJournalKeys.has(key)) {
            DATA.journal.push(j);
            existingJournalKeys.add(key);
          }
        });
      } else {
        DATA.sessions = imported.sessions;
        DATA.journal = imported.journal;
        if (imported.meta) DATA.meta = Object.assign(DATA.meta, imported.meta);
      }

      persist();
      renderDashboard();
      renderPastJournal();
      renderStickyNote();
      renderDataView();
      alert("Import complete.");
    } catch (err) {
      alert("Failed to read file: " + err.message);
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  const confirmed = confirm(
    "This will permanently delete all sessions and journal entries from this browser. Make sure you've exported a backup first.\n\nAre you sure?"
  );
  if (!confirmed) return;

  const doubleCheck = confirm("Really sure? This cannot be undone.");
  if (!doubleCheck) return;

  DATA = defaultData();
  persist();
  renderDashboard();
  renderPastJournal();
  renderStickyNote();
  renderDataView();
}

function renderDataView() {
  const reminderCheckbox = document.getElementById("reminderEnabled");
  reminderCheckbox.checked = DATA.meta.reminderEnabled !== false;

  const lastExportInfo = document.getElementById("lastExportInfo");
  if (DATA.meta.lastExportDate) {
    lastExportInfo.textContent = `Last export: ${DATA.meta.lastExportDate}`;
  } else {
    lastExportInfo.textContent = "No export yet. Export now to create your first backup.";
  }

  document.getElementById("rawDataPreview").textContent = JSON.stringify(DATA, null, 2);
}

/* ---------- WEEKLY REMINDER LOGIC ---------- */

function shouldShowReminder() {
  if (DATA.meta.reminderEnabled === false) return false;
  if (DATA.sessions.length === 0) return false; // nothing to back up yet

  const now = new Date();
  const isSunday = now.getDay() === 0;
  const isEvening = now.getHours() >= 18;

  // never exported
  if (!DATA.meta.lastExportDate) {
    // show after first week of use, or any Sunday
    if (isSunday) return true;
  }

  if (DATA.meta.lastExportDate) {
    const last = new Date(DATA.meta.lastExportDate);
    const daysSince = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    if (daysSince >= 7) return true;
    // also nudge on Sunday evening even if within 7 days, if not exported today
    if (isSunday && isEvening && DATA.meta.lastExportDate !== todayStr()) return true;
  } else {
    if (isSunday) return true;
  }

  return false;
}

function checkExportReminder() {
  if (shouldShowReminder()) {
    document.getElementById("exportReminder").classList.remove("hidden");
  }
}

function hideExportReminder() {
  document.getElementById("exportReminder").classList.add("hidden");
}

function initDataHandlers() {
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document.getElementById("exportNowBtn").addEventListener("click", exportData);

  document.getElementById("dismissReminderBtn").addEventListener("click", () => {
    hideExportReminder();
    DATA.meta.lastReminderShown = todayStr();
    persist();
  });

  document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) importDataFile(file);
    e.target.value = "";
  });

  document.getElementById("resetBtn").addEventListener("click", resetAllData);

  document.getElementById("reminderEnabled").addEventListener("change", (e) => {
    DATA.meta.reminderEnabled = e.target.checked;
    persist();
    if (!e.target.checked) hideExportReminder();
  });

  renderDataView();

  // check on open
  checkExportReminder();
}
