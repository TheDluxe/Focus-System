/* timer.js */
let swSeconds=0, swRunning=false, swInterval=null;
let breakInterval=null, breakSecondsLeft=0;
let pendingRepPass="na";
let pipWindow=null;

function fmt(s){ return [Math.floor(s/3600),Math.floor((s%3600)/60),s%60].map(v=>String(v).padStart(2,"0")).join(":"); }

function updateDisplay() {
  const t=fmt(swSeconds);
  document.getElementById("stopwatchDisplay").textContent=t;
  document.getElementById("stopwatchLabel").textContent=swRunning?"RUNNING":swSeconds>0?"PAUSED":"READY";
  updateRing();
  if(pipWindow&&!pipWindow.closed){
    const el=pipWindow.document.getElementById("pipTime");
    if(el) el.textContent=t;
  }
}

function updateRing() {
  const fill=document.getElementById("ringFill");
  if(!fill) return;
  // ring animates over a 90-min target session (the playbook ceiling start)
  const target=90*60;
  const pct=Math.min(swSeconds/target,1);
  const circ=553;
  fill.style.strokeDashoffset=circ-(pct*circ);
  // color from current activity
  const act=getActivity(document.getElementById("subjectSelect").value);
  fill.style.stroke=act?act.color:"var(--accent)";
  if(swRunning) fill.classList.add("running"); else fill.classList.remove("running");
}

function startStopwatch() {
  if(swRunning) return;
  swRunning=true;
  swInterval=setInterval(()=>{ swSeconds++; updateDisplay(); checkNudge(); },1000);
  document.getElementById("startBtn").disabled=true;
  document.getElementById("pauseBtn").disabled=false;
  document.getElementById("endBtn").disabled=false;
  document.getElementById("subjectSelect").disabled=true;
  document.getElementById("stopwatchLabel").textContent="RUNNING";
  // start noise if active
  if(document.getElementById("brownNoiseBtn").classList.contains("active")){
    startBrownNoise(parseInt(document.getElementById("noiseVolume").value));
  }
}

function pauseStopwatch() {
  if(!swRunning){ startStopwatch(); document.getElementById("pauseBtn").textContent="Pause"; return; }
  swRunning=false; clearInterval(swInterval);
  document.getElementById("pauseBtn").textContent="Resume";
  updateDisplay();
}

function resetStopwatch() {
  swRunning=false; clearInterval(swInterval); swSeconds=0;
  document.getElementById("startBtn").disabled=false;
  document.getElementById("pauseBtn").disabled=true;
  document.getElementById("pauseBtn").textContent="Pause";
  document.getElementById("endBtn").disabled=true;
  document.getElementById("subjectSelect").disabled=false;
  document.getElementById("longSessionNudge").classList.add("hidden");
  updateDisplay();
}

function checkNudge() {
  if(swSeconds>=120*60) document.getElementById("longSessionNudge").classList.remove("hidden");
}

/* ── BREAK ── */
function startBreak(displayEl, onDone) {
  if(breakInterval) return;
  breakSecondsLeft=5*60;
  const el=displayEl||document.getElementById("breakDisplay");
  renderBreak(el);
  const mainBtn=document.getElementById("breakBtn");
  if(mainBtn){ mainBtn.classList.add("active"); mainBtn.querySelector(".tool-label").textContent="Break..."; }

  breakInterval=setInterval(()=>{
    breakSecondsLeft--;
    renderBreak(el);
    if(breakSecondsLeft<=0){
      clearInterval(breakInterval); breakInterval=null;
      el.textContent="Break over. Back to the floor.";
      if(mainBtn){ mainBtn.classList.remove("active"); mainBtn.querySelector(".tool-label").textContent="5-min Break"; }
      playTone(440,0.4,0.12);
      if(onDone) onDone();
    }
  },1000);
}

function renderBreak(el) {
  const m=Math.floor(breakSecondsLeft/60), s=breakSecondsLeft%60;
  (el||document.getElementById("breakDisplay")).textContent=
    `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} — eyes closed, no phone`;
}

/* ── END SESSION MODAL ── */
function openEndSessionModal() {
  if(swRunning){ swRunning=false; clearInterval(swInterval); }
  stopBrownNoise();
  document.getElementById("brownNoiseBtn").classList.remove("active");
  document.getElementById("noiseStatus").textContent="OFF";

  const actId=document.getElementById("subjectSelect").value;
  const act=getActivity(actId);
  const mins=Math.round(swSeconds/60);

  document.getElementById("sessionSummary").textContent=
    `${act?act.name:"Session"} — ${fmt(swSeconds)} (${mins} min)`;

  // reset toggles
  pendingRepPass="na";
  document.querySelectorAll(".toggle-btn").forEach(b=>b.classList.toggle("selected",b.dataset.val==="na"));

  // build extras
  const grid=document.getElementById("extrasGrid");
  grid.innerHTML="";
  (act&&act.extras||[]).forEach(ex=>{
    const div=document.createElement("div"); div.className="extra-field";
    div.innerHTML=`<label class="field-label">${ex.label}</label><input type="number" min="0" value="0" data-key="${ex.key}">`;
    grid.appendChild(div);
  });

  document.getElementById("sessionNotes").value="";

  // un-hide all modal elements
  ["quickLogBtn","saveSessionBtn"].forEach(id=>document.getElementById(id).classList.remove("hidden"));
  document.querySelector(".divider").classList.remove("hidden");
  document.querySelectorAll("#endSessionModal .form-row, #endSessionModal .extras-grid").forEach(el=>el.classList.remove("hidden"));
  document.getElementById("breakSuggestion").classList.add("hidden");
  document.getElementById("modalBreakDisplay").textContent="";

  document.getElementById("endSessionModal").classList.remove("hidden");
}

function buildRecord(actId,mins,rep,extras,notes) {
  return { id:Date.now()+"-"+Math.random().toString(36).slice(2,7), date:todayStr(), subject:actId, minutes:mins, repPass:rep, extras, notes };
}

function afterSave(session) {
  addSession(session);
  renderDashboard();
  checkExportReminder();
  // hide save options, show break prompt
  ["quickLogBtn","saveSessionBtn"].forEach(id=>document.getElementById(id).classList.add("hidden"));
  document.querySelector(".divider").classList.add("hidden");
  document.querySelectorAll("#endSessionModal .form-row, #endSessionModal .extras-grid").forEach(el=>el.classList.add("hidden"));
  document.getElementById("sessionSummary").textContent+=" — saved ✓";
  document.getElementById("breakSuggestion").classList.remove("hidden");
}

function quickLog() {
  const actId=document.getElementById("subjectSelect").value;
  const mins=Math.round(swSeconds/60);
  afterSave(buildRecord(actId,mins,"na",{},""));
}

function saveWithDetails() {
  const actId=document.getElementById("subjectSelect").value;
  const mins=Math.round(swSeconds/60);
  const extras={};
  document.querySelectorAll("#extrasGrid input[data-key]").forEach(inp=>{
    extras[inp.dataset.key]=parseInt(inp.value)||0;
  });
  afterSave(buildRecord(actId,mins,pendingRepPass,extras,document.getElementById("sessionNotes").value.trim()));
}

function closeModal() {
  document.getElementById("endSessionModal").classList.add("hidden");
  resetStopwatch();
}

/* ── PiP ── */
async function openPip() {
  if(!("documentPictureInPicture" in window)){
    document.getElementById("pipUnsupported").classList.remove("hidden"); return;
  }
  if(pipWindow&&!pipWindow.closed){ pipWindow.focus(); return; }
  pipWindow=await window.documentPictureInPicture.requestWindow({width:260,height:130});
  const st=pipWindow.document.createElement("style");
  st.textContent=`body{margin:0;background:#0f1117;color:#e4e7f0;font-family:'JetBrains Mono',monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh}
  .t{font-size:52px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:1px}
  .l{font-size:11px;letter-spacing:2px;color:#626c84;margin-top:4px}`;
  pipWindow.document.head.appendChild(st);
  const wrap=pipWindow.document.createElement("div");
  const act=getActivity(document.getElementById("subjectSelect").value);
  wrap.innerHTML=`<div class="t" id="pipTime">${fmt(swSeconds)}</div><div class="l">${act?act.name.toUpperCase():""}</div>`;
  pipWindow.document.body.appendChild(wrap);
  pipWindow.addEventListener("pagehide",()=>{ pipWindow=null; });
}

/* ── INIT ── */
function initTimerHandlers() {
  document.getElementById("startBtn").addEventListener("click", startStopwatch);
  document.getElementById("pauseBtn").addEventListener("click", pauseStopwatch);
  document.getElementById("endBtn").addEventListener("click", openEndSessionModal);
  document.getElementById("quickLogBtn").addEventListener("click", quickLog);
  document.getElementById("saveSessionBtn").addEventListener("click", saveWithDetails);

  document.getElementById("takeBreakBtn").addEventListener("click",()=>{
    document.getElementById("takeBreakBtn").disabled=true;
    document.getElementById("skipBreakBtn").disabled=true;
    startBreak(document.getElementById("modalBreakDisplay"), closeModal);
  });
  document.getElementById("skipBreakBtn").addEventListener("click", closeModal);

  document.querySelectorAll(".toggle-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".toggle-btn").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      pendingRepPass=btn.dataset.val;
    });
  });

  document.getElementById("brownNoiseBtn").addEventListener("click",()=>{
    const btn=document.getElementById("brownNoiseBtn");
    const on=btn.classList.contains("active");
    if(on){ stopBrownNoise(); btn.classList.remove("active"); document.getElementById("noiseStatus").textContent="OFF"; }
    else{ startBrownNoise(parseInt(document.getElementById("noiseVolume").value)); btn.classList.add("active"); document.getElementById("noiseStatus").textContent="ON"; }
  });
  document.getElementById("noiseVolume").addEventListener("input",e=>setNoiseVolume(parseInt(e.target.value)));
  document.getElementById("breakBtn").addEventListener("click",()=>startBreak());
  document.getElementById("pipBtn").addEventListener("click", openPip);

  document.getElementById("subjectSelect").addEventListener("change",e=>{
    updateRing();
    if(pipWindow&&!pipWindow.closed){
      const act=getActivity(e.target.value);
      const l=pipWindow.document.querySelector(".l");
      if(l) l.textContent=act?act.name.toUpperCase():"";
    }
  });

  if(!("documentPictureInPicture" in window)){
    document.getElementById("pipUnsupported").classList.remove("hidden");
  }

  updateDisplay();
}
