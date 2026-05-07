'use strict';

const STORAGE_KEY = 'bloom_data';
let editingGoal=null, editingEntry=null, activeFilter='all', sidebarCollapsed=false;

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {goals:[],weekly:[]}; }
  catch { return {goals:[],weekly:[]}; }
}
function save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function getData() { return load(); }
function setData(u) { save({...load(),...u}); }

document.addEventListener('DOMContentLoaded', () => { bindEvents(); showView('dashboard'); });

function showView(name) {
  document.querySelectorAll('.view').forEach(v=>{ v.classList.remove('active'); v.classList.add('hidden'); });
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const v = document.querySelector(`#view-${name}`);
  if(v){ v.classList.remove('hidden'); v.classList.add('active'); }
  document.querySelectorAll(`[data-view="${name}"]`).forEach(n=>n.classList.add('active'));
  if(name==='dashboard') renderDashboard();
  if(name==='goals')     renderGoals();
  if(name==='weekly')    renderWeekly();
  if(name==='compound')  renderCompound();
}

function renderDashboard() {
  const {goals}=getData();
  qs('#kpi-total').textContent = goals.length;
  qs('#kpi-done').textContent  = goals.filter(g=>g.status==='Done').length;
  qs('#kpi-active').textContent= goals.filter(g=>g.status==='In Progress').length;
  const progs=goals.map(g=>g.progress||0);
  qs('#kpi-avg').textContent = progs.length ? Math.round(progs.reduce((a,b)=>a+b,0)/progs.length)+'%' : '—';
  const list=qs('#dash-goal-list'); list.innerHTML='';
  if(!goals.length){ list.innerHTML=empty('✦','no goals yet — add your first one in "my goals"'); return; }
  goals.slice(0,6).forEach(g=>{
    const d=mkEl('div','goal-mini');
    d.innerHTML=`<div class="goal-mini-name">${esc(g.name)}</div><div class="goal-mini-cat">${esc(g.category||'')}</div><div class="progress-wrap"><div class="progress-fill ${pc(g.progress)}" style="width:${g.progress||0}%"></div></div><div class="goal-mini-prog">${g.progress||0}%</div>`;
    d.addEventListener('click',()=>{ showView('goals'); openGoalModal(g.id); });
    list.appendChild(d);
  });
}

function renderGoals() {
  let {goals}=getData();
  if(activeFilter!=='all') goals=goals.filter(g=>g.status===activeFilter);
  const grid=qs('#goals-grid'); grid.innerHTML='';
  if(!goals.length){ grid.innerHTML=empty('❋',activeFilter==='all'?'no goals yet — click "+ add goal" to begin':'no goals in this category'); return; }
  goals.forEach(g=>{
    const c=mkEl('div','goal-card');
    c.innerHTML=`<div class="goal-card-top"><div class="goal-card-name">${esc(g.name)}</div><span class="goal-card-priority priority-${(g.priority||'medium').toLowerCase()}">${g.priority||'Medium'}</span></div><div class="goal-card-cat">${esc(g.category||'')}</div><div class="goal-card-progress"><div class="progress-wrap"><div class="progress-fill ${pc(g.progress)}" style="width:${g.progress||0}%"></div></div><span class="goal-prog-label">${g.progress||0}%</span></div><span class="status-badge ${sc(g.status)}">${g.status||'Not Started'}</span>${g.aspects?`<div class="goal-card-aspects">${esc(g.aspects)}</div>`:''}`;
    c.addEventListener('click',()=>openGoalModal(g.id));
    grid.appendChild(c);
  });
}

function renderWeekly() {
  const {weekly}=getData(); const list=qs('#weekly-list'); list.innerHTML='';
  if(!weekly.length){ list.innerHTML=empty('◎','no entries yet — log your first week!'); return; }
  [...weekly].reverse().forEach(e=>{
    const gain=(e.now||0)-(e.prev||0);
    const cls=gain>0?'gain-pos':gain<0?'gain-neg':'gain-zero';
    const lbl=gain>0?`+${gain}%`:gain<0?`${gain}%`:'±0%';
    const d=mkEl('div','weekly-entry');
    d.innerHTML=`<div class="weekly-entry-top"><div><div class="weekly-entry-week">${esc(e.week||'')}</div><div class="weekly-entry-goal">${esc(e.goal||'')}</div></div><span class="weekly-gain ${cls}">${lbl}</span></div>${e.aspects?`<div class="weekly-aspects">worked on: ${esc(e.aspects)}</div>`:''}${e.reflection?`<div class="weekly-reflection">"${esc(e.reflection)}"</div>`:''}`;
    d.addEventListener('click',()=>openWeeklyModal(e.id));
    list.appendChild(d);
  });
}

function renderCompound() { updateCalc(); renderRefTable(); }

function updateCalc() {
  const start=parseFloat(qs('#c-start').value),rate=parseFloat(qs('#c-rate').value),days=parseInt(qs('#c-days').value);
  qs('#c-start-val').textContent=`${start}%`; qs('#c-rate-val').textContent=`${rate.toFixed(1)}%`; qs('#c-days-val').textContent=days;
  const mult=Math.pow(1+rate/100,days),final=start*mult;
  qs('#c-final').textContent=final.toFixed(1)+'%'; qs('#c-mult').textContent=mult.toFixed(2)+'×'; qs('#c-gain').textContent='+'+(final-start).toFixed(1)+'pts';
  drawChart(start,rate,days);
}

function drawChart(start,rate,days) {
  const cv=qs('#compound-chart'),ctx=cv.getContext('2d'),W=cv.width,H=cv.height,p={t:24,r:20,b:36,l:50};
  const cW=W-p.l-p.r,cH=H-p.t-p.b; ctx.clearRect(0,0,W,H);
  const pts=[]; const step=Math.max(1,Math.floor(days/60));
  for(let d=0;d<=days;d+=step) pts.push({x:d,y:start*Math.pow(1+rate/100,d)});
  if(pts[pts.length-1].x!==days) pts.push({x:days,y:start*Math.pow(1+rate/100,days)});
  const maxY=Math.max(...pts.map(p=>p.y))*1.05;
  const tx=d=>p.l+(d/days)*cW, ty=v=>p.t+cH-(v/maxY)*cH;
  ctx.strokeStyle='#ede9e4'; ctx.lineWidth=1;
  for(let i=0;i<=4;i++){ const y=p.t+(i/4)*cH; ctx.beginPath(); ctx.moveTo(p.l,y); ctx.lineTo(p.l+cW,y); ctx.stroke(); }
  const g=ctx.createLinearGradient(0,p.t,0,p.t+cH); g.addColorStop(0,'rgba(232,180,184,.35)'); g.addColorStop(1,'rgba(232,180,184,0)');
  ctx.beginPath(); ctx.moveTo(tx(pts[0].x),ty(pts[0].y)); pts.forEach(pt=>ctx.lineTo(tx(pt.x),ty(pt.y)));
  ctx.lineTo(tx(pts[pts.length-1].x),ty(0)); ctx.lineTo(tx(pts[0].x),ty(0)); ctx.closePath(); ctx.fillStyle=g; ctx.fill();
  ctx.beginPath(); ctx.moveTo(tx(pts[0].x),ty(pts[0].y)); pts.forEach(pt=>ctx.lineTo(tx(pt.x),ty(pt.y)));
  ctx.strokeStyle='#e8b4b8'; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.stroke();
  ctx.strokeStyle='#c9c4be'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(p.l,p.t); ctx.lineTo(p.l,p.t+cH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p.l,p.t+cH); ctx.lineTo(p.l+cW,p.t+cH); ctx.stroke();
  ctx.fillStyle='#8a837c'; ctx.font='11px DM Mono,monospace'; ctx.textAlign='right';
  for(let i=0;i<=4;i++) ctx.fillText((maxY*(4-i)/4).toFixed(0),p.l-6,p.t+(i/4)*cH+4);
  ctx.textAlign='center';
  [0,Math.floor(days/2),days].forEach(d=>ctx.fillText(d+'d',tx(d),p.t+cH+18));
}

function renderRefTable() {
  const rows=qs('#ref-rows'); rows.innerHTML='';
  [{label:'Decline 1%/day',rate:-1,v:'⚠️ Major decay'},{label:'0.1% / day',rate:0.1,v:'📊 Slow & steady'},{label:'0.5% / day',rate:0.5,v:'📈 Solid growth'},{label:'1% / day',rate:1.0,v:'🚀 Elite'},{label:'2% / day',rate:2.0,v:'🔥 Extraordinary'}].forEach(s=>{
    const m=Math.pow(1+s.rate/100,365),d=mkEl('div','ref-row');
    d.innerHTML=`<span class="ref-row-label">${s.label}</span><span class="ref-row-rate">${s.rate>0?'+':''}${s.rate}%</span><span class="ref-row-mult">${m.toFixed(2)}×</span><span class="ref-row-verdict">${s.v}</span>`;
    rows.appendChild(d);
  });
}

function openGoalModal(id=null) {
  editingGoal=id; const {goals}=getData(); const g=id?goals.find(g=>g.id===id):null;
  qs('#goal-modal-title').textContent=g?'edit goal':'new goal'; qs('#goal-modal-icon').textContent=g?'✏️':'❋';
  qs('#g-name').value=g?.name||''; qs('#g-cat').value=g?.category||'Academic'; qs('#g-priority').value=g?.priority||'Medium';
  qs('#g-start').value=g?.startDate||today(); qs('#g-target').value=g?.targetDate||'';
  qs('#g-progress').value=g?.progress||0; qs('#g-progress-val').textContent=g?.progress||0;
  qs('#g-status').value=g?.status||'Not Started'; qs('#g-aspects').value=g?.aspects||'';
  qs('#g-comment').value=g?.comment||''; qs('#g-next').value=g?.next||'';
  qs('#btn-delete-goal').style.display=g?'inline-flex':'none';
  showModal('modal-goal');
}

function saveGoal() {
  const name=qs('#g-name').value.trim(); if(!name){ toast('please enter a goal name 🌸'); return; }
  const {goals}=getData();
  const entry={name,category:qs('#g-cat').value,priority:qs('#g-priority').value,startDate:qs('#g-start').value,targetDate:qs('#g-target').value,progress:parseInt(qs('#g-progress').value)||0,status:qs('#g-status').value,aspects:qs('#g-aspects').value.trim(),comment:qs('#g-comment').value.trim(),next:qs('#g-next').value.trim(),updatedAt:Date.now()};
  if(editingGoal){ const i=goals.findIndex(g=>g.id===editingGoal); if(i!==-1) goals[i]={...goals[i],...entry}; }
  else goals.push({id:uid(),createdAt:Date.now(),...entry});
  setData({goals}); closeModals(); renderGoals(); renderDashboard();
  toast(editingGoal?'goal updated ✓':'goal added 🌱');
}

function deleteGoal() {
  if(!editingGoal||!confirm('delete this goal?')) return;
  setData({goals:getData().goals.filter(g=>g.id!==editingGoal)});
  closeModals(); renderGoals(); renderDashboard(); toast('goal deleted');
}

function openWeeklyModal(id=null) {
  editingEntry=id; const {goals,weekly}=getData(); const e=id?weekly.find(e=>e.id===id):null;
  const sel=qs('#w-goal'); sel.innerHTML='';
  goals.forEach(g=>{ const o=document.createElement('option'); o.value=g.name; o.textContent=g.name; sel.appendChild(o); });
  qs('#weekly-modal-title').textContent=e?'edit entry':'log this week';
  qs('#w-week').value=e?.week||weekLabel(); sel.value=e?.goal||(goals[0]?.name||'');
  qs('#w-now').value=e?.now??''; qs('#w-prev').value=e?.prev??'';
  qs('#w-aspects').value=e?.aspects||''; qs('#w-reflection').value=e?.reflection||'';
  qs('#btn-delete-entry').style.display=e?'inline-flex':'none';
  showModal('modal-weekly');
}

function saveEntry() {
  const week=qs('#w-week').value.trim(),goal=qs('#w-goal').value.trim();
  if(!week||!goal){ toast('please fill in week and goal 🌸'); return; }
  const {weekly}=getData();
  const entry={week,goal,now:parseInt(qs('#w-now').value)||0,prev:parseInt(qs('#w-prev').value)||0,aspects:qs('#w-aspects').value.trim(),reflection:qs('#w-reflection').value.trim(),savedAt:Date.now()};
  if(editingEntry){ const i=weekly.findIndex(e=>e.id===editingEntry); if(i!==-1) weekly[i]={...weekly[i],...entry}; }
  else weekly.push({id:uid(),...entry});
  setData({weekly}); closeModals(); renderWeekly();
  toast(editingEntry?'entry updated ✓':'week logged 📊');
}

function deleteEntry() {
  if(!editingEntry||!confirm('delete this entry?')) return;
  setData({weekly:getData().weekly.filter(e=>e.id!==editingEntry)});
  closeModals(); renderWeekly(); toast('entry deleted');
}

function bindEvents() {
  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  qs('#sidebar-toggle').addEventListener('click',()=>{ sidebarCollapsed=!sidebarCollapsed; qs('#sidebar').classList.toggle('collapsed',sidebarCollapsed); });
  qs('#btn-add-goal').addEventListener('click',()=>openGoalModal());
  qs('#close-goal-modal').addEventListener('click',closeModals);
  qs('#btn-save-goal').addEventListener('click',saveGoal);
  qs('#btn-delete-goal').addEventListener('click',deleteGoal);
  qs('#g-progress').addEventListener('input',e=>{ qs('#g-progress-val').textContent=e.target.value; });
  qs('#btn-add-entry').addEventListener('click',()=>openWeeklyModal());
  qs('#close-weekly-modal').addEventListener('click',closeModals);
  qs('#btn-save-entry').addEventListener('click',saveEntry);
  qs('#btn-delete-entry').addEventListener('click',deleteEntry);
  document.querySelectorAll('.filter-btn').forEach(b=>b.addEventListener('click',()=>{ document.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); activeFilter=b.dataset.filter; renderGoals(); }));
  ['c-start','c-rate','c-days'].forEach(id=>qs(`#${id}`)?.addEventListener('input',updateCalc));
  document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{ if(e.target===o) closeModals(); }));
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModals(); });
}

function showModal(id){ qs(`#${id}`).classList.remove('hidden'); }
function closeModals(){ document.querySelectorAll('.modal-overlay').forEach(m=>m.classList.add('hidden')); editingGoal=null; editingEntry=null; }
function mkEl(tag,cls){ const e=document.createElement(tag); if(cls) e.className=cls; return e; }
const qs=s=>document.querySelector(s);
const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const uid=()=>Math.random().toString(36).slice(2,11)+Date.now().toString(36);
const today=()=>new Date().toISOString().split('T')[0];
const weekLabel=()=>{ const d=new Date(); return `Week · ${d.toLocaleDateString('en-GB',{month:'short',day:'numeric'})}`; };
const empty=(icon,text)=>`<div class="empty-state"><div class="empty-state-icon">${icon}</div><div class="empty-state-text">${text}</div></div>`;
const pc=p=>p>=100?'done':p>=60?'high':'';
const sc=s=>s==='Done'?'status-done':s==='In Progress'?'status-progress':'status-not-started';
function toast(msg){ const t=qs('#toast'); t.textContent=msg; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'),2600); }
