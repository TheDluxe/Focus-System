/* timer.js
   Stopwatch (counts UP, not down - per ADHD doc).
   Break timer (5 min countdown).
   End-session modal: rep pass + subject-specific extras + notes.
*/

let stopwatchInterval = null;
let stopwatchSeconds = 0;
let stopwatchRunning = false;

let breakInterval = null;
let breakSecondsLeft = 0;

let pendingRepPass = "na";

function formatHMS(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

function updateStopwatchDisplay() {
  const text = formatHMS(stopwatchSeconds);
  document.getElementById("stopwatchDisplay").textContent = text;
  if (pipWindow && !pipWindow.closed) {
    const pipDisplay = pipWindow.document.getElementById("pipTime");
    if (pipDisplay) pipDisplay.textContent = text;
  }
}

/* ---------- PICTURE-IN-PICTURE ---------- */

let pipWindow = null;

async function openPipTimer() {
  if (!("documentPictureInPicture" in window)) {
    document.getElementById("pipUnsupported").classList.remove("hidden");
    return;
  }

  if (pipWindow && !pipWindow.closed) {
    pipWindow.focus();
    return;
  }

  pipWindow = await window.documentPictureInPicture.requestWindow({
    width: 260,
    height: 140
  });

  // basic styling inside the PiP window
  const style = pipWindow.document.createElement("style");
  style.textContent = `
    body {
      margin: 0;
      background: #14161a;
      color: #e8e9eb;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }
    .pip-time {
      font-size: 56px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      letter-spacing: 1px;
    }
    .pip-label {
      font-size: 12px;
      color: #8b919c;
      letter-spacing: 1px;
      margin-top: 4px;
    }
  `;
  pipWindow.document.head.appendChild(style);

  const wrap = pipWindow.document.createElement("div");
  wrap.style.textAlign = "center";

  const timeEl = pipWindow.document.createElement("div");
  timeEl.id = "pipTime";
  timeEl.className = "pip-time";
  timeEl.textContent = formatHMS(stopwatchSeconds);

  const labelEl = pipWindow.document.createElement("div");
  labelEl.className = "pip-label";
  const subject = document.getElementById("subjectSelect").value;
  labelEl.textContent = SUBJECT_LABELS[subject].toUpperCase();

  wrap.appendChild(timeEl);
  wrap.appendChild(labelEl);
  pipWindow.document.body.appendChild(wrap);

  pipWindow.addEventListener("pagehide", () => {
    pipWindow = null;
  });
}

function startStopwatch() {
  if (stopwatchRunning) return;
  stopwatchRunning = true;
  stopwatchInterval = setInterval(() => {
    stopwatchSeconds++;
    updateStopwatchDisplay();
    checkLongSessionNudge();
  }, 1000);

  document.getElementById("startBtn").disabled = true;
  document.getElementById("pauseBtn").disabled = false;
  document.getElementById("endBtn").disabled = false;
  document.getElementById("subjectSelect").disabled = true;
}

function pauseStopwatch() {
  if (!stopwatchRunning) {
    // resume
    startStopwatch();
    document.getElementById("pauseBtn").textContent = "Pause";
    return;
  }
  stopwatchRunning = false;
  clearInterval(stopwatchInterval);
  document.getElementById("startBtn").disabled = false;
  document.getElementById("pauseBtn").textContent = "Resume";
}

function resetStopwatch() {
  stopwatchRunning = false;
  clearInterval(stopwatchInterval);
  stopwatchSeconds = 0;
  updateStopwatchDisplay();
  document.getElementById("startBtn").disabled = false;
  document.getElementById("pauseBtn").disabled = true;
  document.getElementById("pauseBtn").textContent = "Pause";
  document.getElementById("endBtn").disabled = true;
  document.getElementById("subjectSelect").disabled = false;
  document.getElementById("longSessionNudge").classList.add("hidden");
}

function checkLongSessionNudge() {
  const el = document.getElementById("longSessionNudge");
  if (stopwatchSeconds >= 120 * 60) {
    el.classList.remove("hidden");
  }
}

/* ---------- BREAK TIMER ---------- */

function startBreak(targetDisplayEl, onComplete) {
  if (breakInterval) return;
  breakSecondsLeft = 5 * 60;
  const displayEl = targetDisplayEl || document.getElementById("breakDisplay");
  updateBreakDisplay(displayEl);

  const mainBtn = document.getElementById("breakBtn");
  if (mainBtn) {
    mainBtn.textContent = "Break running...";
    mainBtn.disabled = true;
  }

  breakInterval = setInterval(() => {
    breakSecondsLeft--;
    updateBreakDisplay(displayEl);
    if (breakSecondsLeft <= 0) {
      clearInterval(breakInterval);
      breakInterval = null;
      displayEl.textContent = "Break over. Back to the floor.";
      if (mainBtn) {
        mainBtn.textContent = "Start 5-min Break";
        mainBtn.disabled = false;
      }
      // gentle audio cue
      try {
        initAudio();
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.frequency.value = 440;
        g.gain.value = 0.15;
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) {}
      if (onComplete) onComplete();
    }
  }, 1000);
}

function updateBreakDisplay(displayEl) {
  const m = Math.floor(breakSecondsLeft / 60);
  const s = breakSecondsLeft % 60;
  const el = displayEl || document.getElementById("breakDisplay");
  el.textContent =
    `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} remaining — eyes closed, no phone`;
}

/* ---------- END SESSION MODAL ---------- */

function openEndSessionModal() {
  // pause stopwatch while filling out modal
  if (stopwatchRunning) {
    stopwatchRunning = false;
    clearInterval(stopwatchInterval);
  }

  const subject = document.getElementById("subjectSelect").value;
  const minutes = Math.round(stopwatchSeconds / 60);

  document.getElementById("sessionSummary").textContent =
    `${SUBJECT_LABELS[subject]} — ${formatHMS(stopwatchSeconds)} (${minutes} min logged)`;

  // reset rep toggle
  pendingRepPass = "na";
  document.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("selected"));
  document.querySelector('.toggle-btn[data-val="na"]').classList.add("selected");

  // build extras fields for this subject
  const extrasGrid = document.getElementById("extrasGrid");
  extrasGrid.innerHTML = "";
  (SUBJECT_EXTRAS[subject] || []).forEach(extra => {
    const div = document.createElement("div");
    div.className = "extra-field";
    div.innerHTML = `
      <label>${extra.label}</label>
      <input type="number" min="0" value="0" data-extra-key="${extra.key}">
    `;
    extrasGrid.appendChild(div);
  });

  document.getElementById("sessionNotes").value = "";

  // un-hide save options (in case previous session left them hidden)
  document.getElementById("quickLogBtn").classList.remove("hidden");
  document.querySelector(".divider").classList.remove("hidden");
  document.getElementById("saveSessionBtn").classList.remove("hidden");
  document.querySelectorAll("#endSessionModal .form-row, #endSessionModal .extras-grid").forEach(el => el.classList.remove("hidden"));

  // reset break suggestion area
  document.getElementById("breakSuggestion").classList.add("hidden");
  const breakStatusDisplay = document.getElementById("modalBreakDisplay");
  if (breakStatusDisplay) breakStatusDisplay.textContent = "";

  document.getElementById("endSessionModal").classList.remove("hidden");
}

function buildSessionRecord(subject, minutes, repPass, extras, notes) {
  return {
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    date: todayStr(),
    subject: subject,
    minutes: minutes,
    repPass: repPass,
    extras: extras,
    notes: notes
  };
}

function finishSessionSave(session) {
  addSession(session);
  renderDashboard();
  checkExportReminder();

  // hide the save options, show break suggestion
  document.getElementById("quickLogBtn").classList.add("hidden");
  document.querySelector(".divider").classList.add("hidden");
  document.getElementById("saveSessionBtn").classList.add("hidden");
  document.querySelectorAll("#endSessionModal .form-row, #endSessionModal .extras-grid").forEach(el => el.classList.add("hidden"));
  document.getElementById("sessionSummary").textContent += " — saved.";

  showBreakSuggestion();
}

function showBreakSuggestion() {
  document.getElementById("breakSuggestion").classList.remove("hidden");
}

function quickLogSession() {
  const subject = document.getElementById("subjectSelect").value;
  const minutes = Math.round(stopwatchSeconds / 60);
  const session = buildSessionRecord(subject, minutes, "na", {}, "");
  finishSessionSave(session);
}

function saveCurrentSession() {
  const subject = document.getElementById("subjectSelect").value;
  const minutes = Math.round(stopwatchSeconds / 60);

  const extras = {};
  document.querySelectorAll("#extrasGrid input[data-extra-key]").forEach(input => {
    const key = input.getAttribute("data-extra-key");
    extras[key] = parseInt(input.value, 10) || 0;
  });

  const session = buildSessionRecord(
    subject,
    minutes,
    pendingRepPass,
    extras,
    document.getElementById("sessionNotes").value.trim()
  );

  finishSessionSave(session);
}

function closeEndSessionModal() {
  document.getElementById("endSessionModal").classList.add("hidden");
  resetStopwatch();
}


function initTimerHandlers() {
  document.getElementById("startBtn").addEventListener("click", () => {
    startStopwatch();
    const vol = parseInt(document.getElementById("noiseVolume").value, 10);
    if (document.getElementById("brownNoiseBtn").dataset.on === "true") {
      startBrownNoise(vol);
    }
  });

  document.getElementById("pauseBtn").addEventListener("click", pauseStopwatch);

  document.getElementById("endBtn").addEventListener("click", () => {
    stopBrownNoise();
    document.getElementById("brownNoiseBtn").dataset.on = "false";
    document.getElementById("brownNoiseBtn").textContent = "🔊 Brown Noise: OFF";
    openEndSessionModal();
  });

  document.getElementById("saveSessionBtn").addEventListener("click", saveCurrentSession);

  document.getElementById("quickLogBtn").addEventListener("click", quickLogSession);

  document.getElementById("takeBreakBtn").addEventListener("click", () => {
    document.getElementById("takeBreakBtn").disabled = true;
    document.getElementById("skipBreakBtn").disabled = true;
    startBreak(document.getElementById("modalBreakDisplay"), () => {
      closeEndSessionModal();
    });
  });

  document.getElementById("skipBreakBtn").addEventListener("click", () => {
    closeEndSessionModal();
  });

  document.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      pendingRepPass = btn.dataset.val;
    });
  });

  document.getElementById("brownNoiseBtn").addEventListener("click", (e) => {
    const btn = e.target;
    const on = btn.dataset.on === "true";
    const vol = parseInt(document.getElementById("noiseVolume").value, 10);
    if (on) {
      stopBrownNoise();
      btn.dataset.on = "false";
      btn.textContent = "🔊 Brown Noise: OFF";
    } else {
      startBrownNoise(vol);
      btn.dataset.on = "true";
      btn.textContent = "🔊 Brown Noise: ON";
    }
  });

  document.getElementById("noiseVolume").addEventListener("input", (e) => {
    setNoiseVolume(parseInt(e.target.value, 10));
  });

  document.getElementById("breakBtn").addEventListener("click", () => startBreak());

  document.getElementById("pipBtn").addEventListener("click", openPipTimer);

  document.getElementById("subjectSelect").addEventListener("change", (e) => {
    if (pipWindow && !pipWindow.closed) {
      const labelEl = pipWindow.document.querySelector(".pip-label");
      if (labelEl) labelEl.textContent = SUBJECT_LABELS[e.target.value].toUpperCase();
    }
  });

  if (!("documentPictureInPicture" in window)) {
    document.getElementById("pipUnsupported").classList.remove("hidden");
  }

  updateStopwatchDisplay();
}
