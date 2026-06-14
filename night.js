/* night.js */
function renderStickyNote() {
  const latest=getLatestJournal();
  const taskEl=document.getElementById("stickyTaskText");
  const fallEl=document.getElementById("stickyFallbackText");
  if(!latest||!latest.j2task){ taskEl.textContent="No task set — go to Night Before"; fallEl.textContent=""; return; }
  const today=todayStr();
  taskEl.textContent=latest.j2task;
  fallEl.textContent=latest.j2fallback?`Fallback: ${latest.j2fallback}`:"";
  if(latest.tomorrowSubject){
    const sel=document.getElementById("subjectSelect");
    if(sel&&getActivity(latest.tomorrowSubject)) sel.value=latest.tomorrowSubject;
  }
}

function saveNightEntry() {
  const entry={ date:todayStr(), forDate:tomorrowStr(), j1:document.getElementById("journal1").value.trim(), j2task:document.getElementById("journalTask").value.trim(), j2fallback:document.getElementById("journalFallback").value.trim(), j3:document.getElementById("journal3").value.trim(), tomorrowSubject:document.getElementById("tomorrowSubject").value };
  addOrUpdateJournal(entry);
  document.getElementById("nightSavedMsg").classList.remove("hidden");
  renderStickyNote(); renderPastJournal();
}

function renderPastJournal() {
  const c=document.getElementById("pastJournal"); c.innerHTML="";
  const entries=[...DATA.journal].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10);
  if(!entries.length){ c.innerHTML=`<p class="hint">No entries yet.</p>`; return; }
  entries.forEach(e=>{
    const div=document.createElement("div"); div.className="journal-entry";
    div.innerHTML=`<div class="je-date">${e.date} → ${e.forDate||"?"}</div>
      ${e.j1?`<div class="je-line"><strong>Moved forward:</strong> ${esc(e.j1)}</div>`:""}
      ${e.j2task?`<div class="je-line"><strong>Tomorrow:</strong> ${esc(e.j2task)}</div>`:""}
      ${e.j2fallback?`<div class="je-line"><strong>Fallback:</strong> ${esc(e.j2fallback)}</div>`:""}
      ${e.j3?`<div class="je-line"><strong>Carrying:</strong> ${esc(e.j3)}</div>`:""}`;
    c.appendChild(div);
  });
}

function esc(s){ const d=document.createElement("div"); d.textContent=s; return d.innerHTML; }

function initNightHandlers() {
  document.getElementById("saveNightBtn").addEventListener("click", saveNightEntry);
  document.getElementById("nightSavedMsg").classList.add("hidden");
  renderPastJournal();
}
