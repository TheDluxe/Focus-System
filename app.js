/* app.js
   Entry point: tab navigation + init all modules.
*/

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add("active");

  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${tabName}`).classList.add("active");

  if (tabName === "dashboard") renderDashboard();
  if (tabName === "data") renderDataView();
  if (tabName === "night") {
    renderPastJournal();
  }
}

function initNav() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initNav();
  initTimerHandlers();
  initNightHandlers();
  initDataHandlers();

  renderStickyNote();
  renderDashboard();

  // small delay so reminder banner doesn't flash before paint
  setTimeout(checkExportReminder, 800);
});
