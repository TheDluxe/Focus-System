/* activities.js - Full CRUD for activities */
const PRESET_COLORS=["#4d8ef0","#b87de8","#f0a83a","#3ecfb8","#e05454","#3ecf6e","#f06292","#80cbc4","#ffb74d","#7986cb"];
let editingActivityId=null;

function renderActivitiesList() {
  const c=document.getElementById("activitiesList"); c.innerHTML="";
  getActivities().forEach(act=>{
    const item=document.createElement("div");
    item.className="activity-item";
    item.setAttribute("draggable","true");
    item.dataset.id=act.id;
    item.style.setProperty("--c",act.color);
    item.innerHTML=`
      <span class="activity-drag" title="Drag to reorder">⠿</span>
      <div style="flex:1">
        <div class="activity-name">${esc2(act.name)}</div>
        ${act.goal?`<div class="activity-goal-text">Goal: ${act.goal}h · ${(getTotalMinutes(act.id)/60).toFixed(1)}h done</div>`:"<div class='activity-goal-text'>No goal set</div>"}
        ${act.extras&&act.extras.length?`<div class="activity-goal-text" style="margin-top:2px">Fields: ${act.extras.map(e=>e.label).join(", ")}</div>`:""}
      </div>
      <div class="activity-actions">
        <button class="icon-btn" onclick="openActivityEditor('${act.id}')">✏ Edit</button>
        <button class="icon-btn danger" onclick="confirmDeleteActivity('${act.id}')">✕</button>
      </div>`;
    c.appendChild(item);
  });
  initDragDrop();
}

function esc2(s){ const d=document.createElement("div"); d.textContent=s; return d.innerHTML; }

function openActivityEditor(id) {
  editingActivityId=id||null;
  const act=id?getActivity(id):null;
  document.getElementById("activityModalTitle").textContent=act?"Edit activity":"New activity";
  document.getElementById("activityName").value=act?act.name:"";
  document.getElementById("activityGoal").value=act&&act.goal?act.goal:"";

  // color swatches
  const chosenColor=act?act.color:PRESET_COLORS[0];
  const swatchesEl=document.getElementById("colorSwatches");
  swatchesEl.innerHTML=PRESET_COLORS.map(c=>`<div class="swatch${c===chosenColor?" selected":""}" data-color="${c}" style="background:${c}" onclick="selectSwatch(this,'${c}')"></div>`).join("");
  document.getElementById("activityColorCustom").value=chosenColor;

  // extra fields
  renderExtraFieldsEditor(act?act.extras:[]);
  document.getElementById("activityModal").classList.remove("hidden");
}

function selectSwatch(el, color) {
  document.querySelectorAll(".swatch").forEach(s=>s.classList.remove("selected"));
  el.classList.add("selected");
  document.getElementById("activityColorCustom").value=color;
}

function renderExtraFieldsEditor(extras=[]) {
  const c=document.getElementById("extraFieldsList"); c.innerHTML="";
  extras.forEach((ex,i)=>{
    const row=document.createElement("div"); row.className="extra-field-editor";
    row.innerHTML=`<input type="text" placeholder="Field name (e.g. Vocab cards)" value="${esc2(ex.label)}" data-idx="${i}">
      <button class="icon-btn danger" onclick="removeExtraField(${i})">✕</button>`;
    c.appendChild(row);
  });
}

function addExtraField() {
  const inputs=[...document.querySelectorAll("#extraFieldsList input")];
  const extras=inputs.map(inp=>({ key:inp.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")||("field-"+Date.now()), label:inp.value }));
  extras.push({ key:"field-"+Date.now(), label:"" });
  renderExtraFieldsEditor(extras);
}

function removeExtraField(idx) {
  const inputs=[...document.querySelectorAll("#extraFieldsList input")];
  const extras=inputs.map(inp=>({ key:inp.value.toLowerCase().replace(/\s+/g,"-")||"field", label:inp.value }));
  extras.splice(idx,1);
  renderExtraFieldsEditor(extras);
}

function saveActivityFromModal() {
  const name=document.getElementById("activityName").value.trim();
  if(!name){ document.getElementById("activityName").focus(); return; }
  const color=document.getElementById("activityColorCustom").value||PRESET_COLORS[0];
  const goal=parseInt(document.getElementById("activityGoal").value)||0;
  const inputs=[...document.querySelectorAll("#extraFieldsList input")];
  const extras=inputs.filter(inp=>inp.value.trim()).map(inp=>({
    key:inp.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")||("f"+Date.now()),
    label:inp.value.trim()
  }));
  const id=editingActivityId||generateActivityId(name);
  saveActivity({ id, name, color, goal, extras });
  document.getElementById("activityModal").classList.add("hidden");
  renderActivitiesList();
  populateSubjectSelects();
  renderDashboard();
}

function confirmDeleteActivity(id) {
  const act=getActivity(id);
  if(!act) return;
  const sessions=getSessionsByActivity(id).length;
  const msg=sessions?`Delete "${act.name}"? This will also delete ${sessions} logged sessions. This cannot be undone.`:`Delete "${act.name}"?`;
  if(!confirm(msg)) return;
  deleteActivity(id);
  renderActivitiesList();
  populateSubjectSelects();
  renderDashboard();
}

/* ── DRAG & DROP reorder ── */
let dragSrc=null;
function initDragDrop() {
  document.querySelectorAll(".activity-item").forEach(item=>{
    item.addEventListener("dragstart",e=>{ dragSrc=item; e.dataTransfer.effectAllowed="move"; item.style.opacity="0.5"; });
    item.addEventListener("dragend",()=>{ item.style.opacity=""; dragSrc=null; });
    item.addEventListener("dragover",e=>{ e.preventDefault(); e.dataTransfer.dropEffect="move"; });
    item.addEventListener("drop",e=>{
      e.preventDefault();
      if(dragSrc===item) return;
      const ids=[...document.querySelectorAll(".activity-item")].map(el=>el.dataset.id);
      const fromIdx=ids.indexOf(dragSrc.dataset.id), toIdx=ids.indexOf(item.dataset.id);
      ids.splice(fromIdx,1); ids.splice(toIdx,0,dragSrc.dataset.id);
      reorderActivities(ids);
      renderActivitiesList();
      populateSubjectSelects();
    });
  });
}

function initActivitiesHandlers() {
  document.getElementById("addActivityBtn").addEventListener("click",()=>openActivityEditor(null));
  document.getElementById("saveActivityBtn").addEventListener("click", saveActivityFromModal);
  document.getElementById("cancelActivityBtn").addEventListener("click",()=>document.getElementById("activityModal").classList.add("hidden"));
  document.getElementById("addExtraFieldBtn").addEventListener("click", addExtraField);
  document.getElementById("activityColorCustom").addEventListener("input",e=>{
    document.querySelectorAll(".swatch").forEach(s=>s.classList.remove("selected"));
  });
  renderActivitiesList();
}
