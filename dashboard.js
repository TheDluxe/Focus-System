/* dashboard.js */

function renderNavStreak() {
  const el=document.getElementById("navStreak");
  const s=getCurrentStreak();
  el.textContent=s>0?`🔥 ${s}d`:"";
}

function renderSubjectCards() {
  const c=document.getElementById("subjectCards"); c.innerHTML="";
  getActivities().forEach(act=>{
    const total=getTotalMinutes(act.id);
    const hrs=(total/60).toFixed(1);
    const sessions=getSessionsByActivity(act.id);
    const reps=sessions.filter(s=>s.repPass==="yes").length;
    const streak=getCurrentStreakForActivity(act.id);
    const div=document.createElement("div");
    div.className="subject-card";
    div.style.setProperty("--c",act.color);
    div.innerHTML=`<div class="sc-name">${act.name}</div>
      <div class="sc-total">${hrs}</div>
      <div class="sc-unit">hours</div>
      <div class="sc-sub">${sessions.length} sessions · ${reps} reps ✓${streak>0?` · 🔥 ${streak}d`:""}</div>`;
    c.appendChild(div);
  });
}

function renderGoalBars() {
  const c=document.getElementById("goalBars"); c.innerHTML="";
  const withGoals=getActivities().filter(a=>a.goal&&a.goal>0);
  if(!withGoals.length){ c.innerHTML=`<p class="hint">No goals set. Add one in the Activities tab.</p>`; return; }
  withGoals.forEach(act=>{
    const hrs=getTotalMinutes(act.id)/60;
    const pct=Math.min((hrs/act.goal)*100,100).toFixed(1);
    const div=document.createElement("div"); div.className="goal-bar-item";
    div.style.setProperty("--c",act.color);
    div.innerHTML=`
      <div class="goal-bar-header">
        <span class="goal-bar-name">${act.name}</span>
        <span class="goal-bar-val">${hrs.toFixed(1)} / ${act.goal}h (${pct}%)</span>
      </div>
      <div class="goal-bar-track"><div class="goal-bar-fill" style="width:${pct}%"></div></div>`;
    c.appendChild(div);
  });
}

function renderStreakAlert() {
  const el=document.getElementById("streakAlert");
  const streak=getCurrentStreak(), zero=getCurrentZeroStreak();
  if(zero>=2){ el.className="streak-badge warn"; el.textContent=`⚠ ${zero} days with nothing. Minimum Viable Day: one 15-min block, one activity. That's it.`; }
  else if(streak>0){ el.className="streak-badge ok"; el.textContent=`🔥 ${streak} day streak`; }
  else { el.className="streak-badge empty"; }
}

function renderHeatmaps() {
  const c=document.getElementById("heatmaps"); c.innerHTML="";
  const today=new Date(), days=182;
  getActivities().forEach(act=>{
    const byDate={};
    getSessionsByActivity(act.id).forEach(s=>{ byDate[s.date]=(byDate[s.date]||0)+s.minutes; });
    const block=document.createElement("div"); block.className="heatmap-block";
    block.innerHTML=`<div class="heatmap-label"><span class="heatmap-dot" style="background:${act.color}"></span>${act.name}</div>`;
    const grid=document.createElement("div"); grid.className="heatmap-grid";
    for(let i=days-1;i>=0;i--){
      const d=new Date(today); d.setDate(d.getDate()-i);
      const ds=todayStr(d), mins=byDate[ds]||0;
      const level=mins<=0?0:mins<30?1:mins<75?2:3;
      const cell=document.createElement("div");
      cell.className="heatmap-cell";
      cell.title=`${ds}: ${mins}min`;
      cell.setAttribute("data-level",level);
      if(level>0) cell.style.background=act.color;
      grid.appendChild(cell);
    }
    block.appendChild(grid);
    c.appendChild(block);
  });
}

function renderDailyLog() {
  const acts=getActivities();
  const head=document.getElementById("dailyLogHead");
  head.innerHTML="<th>Date</th>"+acts.map(a=>`<th>${a.name.split(" ")[0]}</th>`).join("")+"<th>Total</th><th>Notes</th>";
  const tbody=document.querySelector("#dailyLogTable tbody"); tbody.innerHTML="";
  const dates=getActiveDates().sort().reverse().slice(0,30);
  if(!dates.length){
    const tr=document.createElement("tr");
    tr.innerHTML=`<td colspan="${acts.length+3}" class="hint">No sessions yet.</td>`;
    tbody.appendChild(tr); return;
  }
  dates.forEach(date=>{
    const sessions=getSessionsForDate(date);
    const byAct={}; let total=0; const notesBits=[];
    sessions.forEach(s=>{ byAct[s.subject]=(byAct[s.subject]||0)+s.minutes; total+=s.minutes; if(s.notes) notesBits.push(s.notes); });
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${date}</td>`+acts.map(a=>`<td>${byAct[a.id]||""}</td>`).join("")+`<td><strong>${total}</strong></td><td>${notesBits.join("; ")}</td>`;
    tbody.appendChild(tr);
  });
}

function renderWeeklySnapshot() {
  const c=document.getElementById("weeklySnapshot"); c.innerHTML="";
  const now=new Date(), dow=(now.getDay()+6)%7;
  const mon=new Date(now); mon.setDate(now.getDate()-dow); mon.setHours(0,0,0,0);
  const sun=new Date(mon); sun.setDate(mon.getDate()+6);
  const startStr=todayStr(mon), endStr=todayStr(sun);
  let total=0; const byAct={}; let repsP=0, repsF=0;
  DATA.sessions.forEach(s=>{
    if(s.date>=startStr&&s.date<=endStr){
      total+=s.minutes; byAct[s.subject]=(byAct[s.subject]||0)+s.minutes;
      if(s.repPass==="yes") repsP++; if(s.repPass==="no") repsF++;
    }
  });
  const activeDays=new Set(DATA.sessions.filter(s=>s.date>=startStr&&s.date<=endStr).map(s=>s.date)).size;
  let status="❌ Red — barely anything moved";
  if(activeDays>=4) status="✅ Green — non-negotiables hit";
  else if(activeDays>=1) status="⚠️ Yellow — something happened, something didn't";
  const acts=getActivities();
  const card=document.createElement("div"); card.className="week-card";
  card.innerHTML=`<div class="week-status">${status}</div>
    <div class="week-meta">
      <strong>${(total/60).toFixed(1)}h</strong> total · <strong>${activeDays}/7</strong> active days · <strong>${repsP}</strong> reps passed · <strong>${repsF}</strong> failed<br>
      ${acts.map(a=>`${a.name.split(" ")[0]}: ${((byAct[a.id]||0)/60).toFixed(1)}h`).join(" · ")}
    </div>`;
  c.appendChild(card);
}

function populateSubjectSelects() {
  const acts=getActivities();
  ["subjectSelect","tomorrowSubject"].forEach(id=>{
    const sel=document.getElementById(id); if(!sel) return;
    const cur=sel.value;
    sel.innerHTML=acts.map(a=>`<option value="${a.id}">${a.name}</option>`).join("");
    if(acts.find(a=>a.id===cur)) sel.value=cur;
  });
}

function renderDashboard() {
  renderNavStreak();
  renderSubjectCards();
  renderGoalBars();
  renderStreakAlert();
  renderHeatmaps();
  renderDailyLog();
  renderWeeklySnapshot();
  if (typeof renderEquanimityBanner === "function") renderEquanimityBanner();
}
