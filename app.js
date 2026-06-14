/* app.js */
function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===`view-${name}`));
  if(name==="dashboard") renderDashboard();
  if(name==="data") renderDataView();
  if(name==="night"){ renderPastJournal(); document.getElementById("nightSavedMsg").classList.add("hidden"); }
  if(name==="activities") renderActivitiesList();
}

function initTheme() {
  const saved=DATA.meta.theme||"auto";
  document.documentElement.setAttribute("data-theme",saved);
  document.getElementById("themeToggle").addEventListener("click",()=>{
    const cur=document.documentElement.getAttribute("data-theme");
    const next=cur==="dark"?"light":cur==="light"?"auto":"dark";
    document.documentElement.setAttribute("data-theme",next);
    DATA.meta.theme=next; persist();
  });
}

window.addEventListener("DOMContentLoaded",()=>{
  initTheme();
  document.querySelectorAll(".tab-btn").forEach(btn=>btn.addEventListener("click",()=>switchTab(btn.dataset.tab)));
  populateSubjectSelects();
  initTimerHandlers();
  initNightHandlers();
  initActivitiesHandlers();
  initDataHandlers();
  renderStickyNote();
  renderDashboard();
});
