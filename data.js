/* data.js */
function exportData() {
  const blob=new Blob([JSON.stringify(DATA,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob), a=document.createElement("a");
  a.href=url; a.download=`focus-system-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  DATA.meta.lastExportDate=todayStr(); persist();
  renderDataView(); hideExportReminder();
}

function importDataFile(file) {
  const reader=new FileReader();
  reader.onload=e=>{
    try {
      const imp=JSON.parse(e.target.result);
      if(!Array.isArray(imp.sessions)) return alert("Not a valid Focus System backup.");
      const merge=confirm("Merge with existing data? (OK = merge, Cancel = replace)");
      if(merge){
        const ids=new Set(DATA.sessions.map(s=>s.id));
        imp.sessions.forEach(s=>{ if(!ids.has(s.id)){ DATA.sessions.push(s); ids.add(s.id); } });
        if(Array.isArray(imp.journal)){
          const jkeys=new Set(DATA.journal.map(j=>j.date+"|"+j.forDate));
          imp.journal.forEach(j=>{ const k=j.date+"|"+j.forDate; if(!jkeys.has(k)){ DATA.journal.push(j); jkeys.add(k); } });
        }
        if(Array.isArray(imp.activities)&&imp.activities.length) DATA.activities=imp.activities;
      } else {
        DATA.sessions=imp.sessions||[];
        DATA.journal=imp.journal||[];
        DATA.activities=imp.activities&&imp.activities.length?imp.activities:DATA.activities;
        if(imp.meta) DATA.meta=Object.assign(DATA.meta,imp.meta);
      }
      persist(); renderDashboard(); renderPastJournal(); renderStickyNote();
      populateSubjectSelects(); renderActivitiesList(); renderDataView();
      alert("Import complete.");
    } catch(err){ alert("Failed: "+err.message); }
  };
  reader.readAsText(file);
}

function shouldShowReminder() {
  if(!DATA.meta.reminderEnabled||DATA.sessions.length===0) return false;
  const now=new Date(), isSun=now.getDay()===0, isEve=now.getHours()>=18;
  if(!DATA.meta.lastExportDate) return isSun;
  const days=Math.floor((now-new Date(DATA.meta.lastExportDate))/(86400000));
  if(days>=7) return true;
  if(isSun&&isEve&&DATA.meta.lastExportDate!==todayStr()) return true;
  return false;
}

function checkExportReminder() {
  if(shouldShowReminder()) document.getElementById("exportReminder").classList.remove("hidden");
}
function hideExportReminder() { document.getElementById("exportReminder").classList.add("hidden"); }

function renderDataView() {
  document.getElementById("reminderEnabled").checked=DATA.meta.reminderEnabled!==false;
  document.getElementById("lastExportInfo").textContent=DATA.meta.lastExportDate?`Last export: ${DATA.meta.lastExportDate}`:"No export yet.";
  document.getElementById("rawDataPreview").textContent=JSON.stringify(DATA,null,2);
}

function resetAllData() {
  if(!confirm("Delete ALL data? Make sure you exported a backup first.")) return;
  if(!confirm("Really? This cannot be undone.")) return;
  DATA=defaultData(); persist();
  renderDashboard(); renderPastJournal(); renderStickyNote();
  populateSubjectSelects(); renderActivitiesList(); renderDataView();
}

function initDataHandlers() {
  document.getElementById("exportBtn").addEventListener("click", exportData);
  document.getElementById("exportNowBtn").addEventListener("click", exportData);
  document.getElementById("dismissReminderBtn").addEventListener("click",()=>{ hideExportReminder(); DATA.meta.lastReminderShown=todayStr(); persist(); });
  document.getElementById("importFile").addEventListener("change",e=>{ const f=e.target.files[0]; if(f) importDataFile(f); e.target.value=""; });
  document.getElementById("resetBtn").addEventListener("click", resetAllData);
  document.getElementById("reminderEnabled").addEventListener("change",e=>{ DATA.meta.reminderEnabled=e.target.checked; persist(); if(!e.target.checked) hideExportReminder(); });
  renderDataView();
  setTimeout(checkExportReminder,800);
}
