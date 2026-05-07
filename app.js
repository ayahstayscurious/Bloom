/* ══════════════════════════════════════════════════════
   bloom · goals tracker · app.js
   localStorage-persisted, multi-user
   ══════════════════════════════════════════════════════ */

'use strict';

// ── Constants ──────────────────────────────────────────────────────────────
const STORAGE_KEY   = 'bloom_data';
const AVATARS = ['🌸','🌿','✦','🌙','🍵','🦋','🌺','🌼',
                 '🐚','🍃','🌱','⭐','🫧','🌾','🍀','🐝',
                 '🌷','🦢','🫐','🌊','🎋','🕊️','🌻','💫'];

// ── State ──────────────────────────────────────────────────────────────────
let DB           = { users: [], activeUser: null };
let currentUser  = null;
let editingGoal  = null;
let editingEntry = null;
let activeFilter = 'all';
let sidebarCollapsed = false;
let compChart    = null;

// ── Persistence ────────────────────────────────────────────────────────────
function load() {
  try { DB = JSON.parse(localStorage.getItem(STORAGE_KEY)) || { users: [], activeUser: null }; }
  catch { DB = { users: [], activeUser: null }; }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); }

function userData() {
  return DB.users.find(u => u.id === currentUser?.id) || null;
}
function setUserData(updates) {
  const idx = DB.users.findIndex(u => u.id === currentUser?.id);
  if (idx !== -1) { Object.assign(DB.users[idx], updates); save(); }
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  load();
  renderUserScreen();
  bindStaticEvents();
  initEmojiGrid();

  // auto-login last user
  if (DB.activeUser) {
    const u = DB.users.find(u => u.id === DB.activeUser);
    if (u) { loginUser(u); return; }
  }
  showScreen('user-screen');
});

// ── User Screen ────────────────────────────────────────────────────────────
function renderUserScreen() {
  const grid = q('#user-cards');
  grid.innerHTML = '';
  DB.users.forEach(u => {
    const card = el('div', { class: 'user-card', 'data-id': u.id });
    card.innerHTML = `<span class="user-card-emoji">${u.emoji}</span>
                      <span class="user-card-name">${u.name}</span>`;
    card.addEventListener('click', () => loginUser(u));
    grid.appendChild(card);
  });
}

function loginUser(u) {
  currentUser = u;
  DB.activeUser = u.id;
  save();
  showScreen('app-screen');
  renderApp();
}

// ── Emoji grid ─────────────────────────────────────────────────────────────
let selectedEmoji = AVATARS[0];
function initEmojiGrid() {
  const grid = q('#emoji-grid');
  AVATARS.forEach((emoji, i) => {
    const btn = el('button', { class: `emoji-opt${i===0?' selected':''}`, type: 'button' });
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.emoji-opt').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEmoji = emoji;
    });
    grid.appendChild(btn);
  });
}

// ── Create user ────────────────────────────────────────────────────────────
function createUser() {
  const name = q('#new-user-name').value.trim();
  if (!name) { toast('please enter your name 🌸'); return; }
  const u = { id: uid(), name, emoji: selectedEmoji, goals: [], weekly: [] };
  DB.users.push(u);
  save();
  closeAllModals();
  renderUserScreen();
  loginUser(u);
}

// ── App render ─────────────────────────────────────────────────────────────
function renderApp() {
  const u = userData();
  if (!u) return;

  // sidebar
  const badge = q('#user-badge');
  badge.innerHTML = `<span class="user-badge-emoji">${u.emoji}</span>
                     <span class="user-badge-name">${u.name}</span>`;
  renderDashboard();
}

// ── Views ──────────────────────────────────────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const v = q(`#view-${name}`);
  if (v) v.classList.add('active');
  document.querySelectorAll(`[data-view="${name}"]`).forEach(n => n.classList.add('active'));

  if (name === 'dashboard') renderDashboard();
  if (name === 'goals')     renderGoals();
  if (name === 'weekly')    renderWeekly();
  if (name === 'compound')  renderCompound();
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function renderDashboard() {
  const u = userData(); if (!u) return;
  const goals = u.goals || [];

  q('#dash-name').textContent = u.name.split(' ')[0];
  q('#kpi-total').textContent  = goals.length;
  q('#kpi-done').textContent   = goals.filter(g => g.status === 'Done').length;
  q('#kpi-active').textContent = goals.filter(g => g.status === 'In Progress').length;

  const progs = goals.map(g => g.progress || 0);
  q('#kpi-avg').textContent = progs.length
    ? Math.round(progs.reduce((a,b)=>a+b,0)/progs.length) + '%'
    : '—';

  const list = q('#dash-goal-list');
  list.innerHTML = '';
  if (!goals.length) {
    list.innerHTML = emptyState('✦', 'no goals yet — add your first one in "my goals"');
    return;
  }
  goals.slice(0,6).forEach(g => {
    const item = el('div', { class: 'goal-mini' });
    item.innerHTML = `
      <div class="goal-mini-name">${esc(g.name)}</div>
      <div class="goal-mini-cat">${esc(g.category || '')}</div>
      <div class="progress-wrap"><div class="progress-fill ${progressClass(g.progress)}" style="width:${g.progress||0}%"></div></div>
      <div class="goal-mini-prog">${g.progress||0}%</div>`;
    item.addEventListener('click', () => { showView('goals'); openGoalModal(g.id); });
    list.appendChild(item);
  });
}

// ── Goals ──────────────────────────────────────────────────────────────────
function renderGoals() {
  const u = userData(); if (!u) return;
  let goals = u.goals || [];

  if (activeFilter !== 'all') goals = goals.filter(g => g.status === activeFilter);

  const grid = q('#goals-grid');
  grid.innerHTML = '';
  if (!goals.length) {
    grid.innerHTML = emptyState('❋', activeFilter === 'all'
      ? 'no goals yet — click "+ add goal" to begin'
      : 'no goals in this category');
    return;
  }
  goals.forEach(g => {
    const card = el('div', { class: 'goal-card' });
    card.innerHTML = `
      <div class="goal-card-top">
        <div class="goal-card-name">${esc(g.name)}</div>
        <span class="goal-card-priority priority-${(g.priority||'medium').toLowerCase()}">${g.priority||'Medium'}</span>
      </div>
      <div class="goal-card-cat">${esc(g.category||'')}</div>
      <div class="goal-card-progress">
        <div class="progress-wrap"><div class="progress-fill ${progressClass(g.progress)}" style="width:${g.progress||0}%"></div></div>
        <span class="goal-prog-label">${g.progress||0}%</span>
      </div>
      <span class="status-badge ${statusClass(g.status)}">${g.status||'Not Started'}</span>
      ${g.aspects ? `<div class="goal-card-aspects">${esc(g.aspects)}</div>` : ''}`;
    card.addEventListener('click', () => openGoalModal(g.id));
    grid.appendChild(card);
  });
}

// ── Weekly ─────────────────────────────────────────────────────────────────
function renderWeekly() {
  const u = userData(); if (!u) return;
  const entries = (u.weekly || []).slice().reverse();
  const list = q('#weekly-list');
  list.innerHTML = '';
  if (!entries.length) {
    list.innerHTML = emptyState('◎', 'no entries yet — log your first week!');
    return;
  }
  entries.forEach(e => {
    const gain  = (e.now||0) - (e.prev||0);
    const cls   = gain > 0 ? 'gain-pos' : gain < 0 ? 'gain-neg' : 'gain-zero';
    const label = gain > 0 ? `+${gain}%` : gain < 0 ? `${gain}%` : '±0%';
    const item  = el('div', { class: 'weekly-entry' });
    item.innerHTML = `
      <div class="weekly-entry-top">
        <div>
          <div class="weekly-entry-week">${esc(e.week||'')}</div>
          <div class="weekly-entry-goal">${esc(e.goal||'')}</div>
        </div>
        <span class="weekly-gain ${cls}">${label}</span>
      </div>
      ${e.aspects    ? `<div class="weekly-aspects">worked on: ${esc(e.aspects)}</div>` : ''}
      ${e.reflection ? `<div class="weekly-reflection">"${esc(e.reflection)}"</div>`    : ''}`;
    item.addEventListener('click', () => openWeeklyModal(e.id));
    list.appendChild(item);
  });
}

// ── Compound ───────────────────────────────────────────────────────────────
function renderCompound() {
  updateCompoundCalc();
  renderRefTable();
}

function updateCompoundCalc() {
  const start = parseFloat(q('#c-start').value);
  const rate  = parseFloat(q('#c-rate').value);
  const days  = parseInt(q('#c-days').value);

  q('#c-start-val').textContent = `${start}%`;
  q('#c-rate-val').textContent  = `${rate.toFixed(1)}%`;
  q('#c-days-val').textContent  = days;

  const mult  = Math.pow(1 + rate/100, days);
  const final = start * mult;
  const gain  = final - start;

  q('#c-final').textContent = final.toFixed(1) + '%';
  q('#c-mult').textContent  = mult.toFixed(2) + '×';
  q('#c-gain').textContent  = '+' + gain.toFixed(1) + 'pts';

  drawCompoundChart(start, rate, days);
}

function drawCompoundChart(start, rate, days) {
  const canvas = q('#compound-chart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 24, right: 20, bottom: 36, left: 50 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  // data
  const pts = [];
  for (let d = 0; d <= days; d += Math.max(1, Math.floor(days/60))) {
    pts.push({ x: d, y: start * Math.pow(1 + rate/100, d) });
  }
  if (pts[pts.length-1].x !== days) pts.push({ x: days, y: start * Math.pow(1+rate/100, days) });

  const maxY = Math.max(...pts.map(p=>p.y)) * 1.05;

  const toX = d => pad.left + (d/days)*chartW;
  const toY = v => pad.top + chartH - (v/maxY)*chartH;

  // grid lines
  ctx.strokeStyle = '#ede9e4'; ctx.lineWidth = 1;
  for (let i=0; i<=4; i++) {
    const y = pad.top + (i/4)*chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left+chartW, y); ctx.stroke();
  }

  // gradient fill
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top+chartH);
  grad.addColorStop(0, 'rgba(232,180,184,.4)');
  grad.addColorStop(1, 'rgba(232,180,184,0)');
  ctx.beginPath();
  ctx.moveTo(toX(pts[0].x), toY(pts[0].y));
  pts.forEach(p => ctx.lineTo(toX(p.x), toY(p.y)));
  ctx.lineTo(toX(pts[pts.length-1].x), toY(0));
  ctx.lineTo(toX(pts[0].x), toY(0));
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();

  // line
  ctx.beginPath();
  ctx.moveTo(toX(pts[0].x), toY(pts[0].y));
  pts.forEach(p => ctx.lineTo(toX(p.x), toY(p.y)));
  ctx.strokeStyle = '#e8b4b8'; ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round'; ctx.stroke();

  // axes
  ctx.strokeStyle = '#c9c4be'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top+chartH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top+chartH); ctx.lineTo(pad.left+chartW, pad.top+chartH); ctx.stroke();

  // y labels
  ctx.fillStyle = '#8a837c'; ctx.font = '11px DM Mono, monospace'; ctx.textAlign = 'right';
  for (let i=0; i<=4; i++) {
    const v = (maxY*(4-i)/4);
    ctx.fillText(v.toFixed(0), pad.left-6, pad.top+(i/4)*chartH+4);
  }

  // x labels
  ctx.textAlign = 'center';
  [0, Math.floor(days/2), days].forEach(d => {
    ctx.fillText(d + 'd', toX(d), pad.top+chartH+18);
  });
}

function renderRefTable() {
  const rows = q('#ref-rows');
  rows.innerHTML = '';
  const scenarios = [
    { label: 'Decline 1%/day', rate: -1 },
    { label: '0.1% / day',     rate: 0.1 },
    { label: '0.5% / day',     rate: 0.5 },
    { label: '1% / day',       rate: 1.0 },
    { label: '2% / day',       rate: 2.0 },
  ];
  const verdicts = ['⚠️ Major decay','📊 Slow & steady','📈 Solid growth','🚀 Elite','🔥 Extraordinary'];
  scenarios.forEach((s, i) => {
    const mult = Math.pow(1 + s.rate/100, 365);
    const row  = el('div', { class: 'ref-row' });
    row.innerHTML = `
      <span class="ref-row-label">${s.label}</span>
      <span class="ref-row-rate">${s.rate > 0 ? '+' : ''}${s.rate}%</span>
      <span class="ref-row-mult">${mult.toFixed(2)}×</span>
      <span class="ref-row-verdict">${verdicts[i]}</span>`;
    rows.appendChild(row);
  });
}

// ── Goal Modal ─────────────────────────────────────────────────────────────
function openGoalModal(id = null) {
  editingGoal = id;
  const u = userData();
  const g = id ? (u?.goals||[]).find(g => g.id === id) : null;

  q('#goal-modal-title').textContent = g ? 'edit goal' : 'new goal';
  q('#goal-modal-icon').textContent  = g ? '✏️' : '❋';

  q('#g-name').value     = g?.name     || '';
  q('#g-cat').value      = g?.category || 'Academic';
  q('#g-priority').value = g?.priority || 'Medium';
  q('#g-start').value    = g?.startDate|| today();
  q('#g-target').value   = g?.targetDate|| '';
  q('#g-progress').value = g?.progress || 0;
  q('#g-progress-val').textContent = g?.progress || 0;
  q('#g-status').value   = g?.status   || 'Not Started';
  q('#g-aspects').value  = g?.aspects  || '';
  q('#g-comment').value  = g?.comment  || '';
  q('#g-next').value     = g?.next     || '';

  q('#btn-delete-goal').style.display = g ? 'inline-flex' : 'none';
  showModal('modal-goal');
}

function saveGoal() {
  const name = q('#g-name').value.trim();
  if (!name) { toast('please enter a goal name 🌸'); return; }

  const u = userData();
  const goals = u?.goals || [];
  const data = {
    name,
    category:   q('#g-cat').value,
    priority:   q('#g-priority').value,
    startDate:  q('#g-start').value,
    targetDate: q('#g-target').value,
    progress:   parseInt(q('#g-progress').value) || 0,
    status:     q('#g-status').value,
    aspects:    q('#g-aspects').value.trim(),
    comment:    q('#g-comment').value.trim(),
    next:       q('#g-next').value.trim(),
    updatedAt:  Date.now(),
  };

  if (editingGoal) {
    const idx = goals.findIndex(g => g.id === editingGoal);
    if (idx !== -1) goals[idx] = { ...goals[idx], ...data };
  } else {
    goals.push({ id: uid(), createdAt: Date.now(), ...data });
  }

  setUserData({ goals });
  closeAllModals();
  renderGoals();
  renderDashboard();
  toast(editingGoal ? 'goal updated ✓' : 'goal added 🌱');
}

function deleteGoal() {
  if (!editingGoal) return;
  if (!confirm('delete this goal?')) return;
  const u = userData();
  setUserData({ goals: (u.goals||[]).filter(g => g.id !== editingGoal) });
  closeAllModals();
  renderGoals();
  renderDashboard();
  toast('goal deleted');
}

// ── Weekly Modal ───────────────────────────────────────────────────────────
function openWeeklyModal(id = null) {
  editingEntry = id;
  const u = userData();
  const e = id ? (u?.weekly||[]).find(e => e.id === id) : null;

  q('#weekly-modal-title').textContent = e ? 'edit entry' : 'log this week';

  // populate goal selector
  const sel = q('#w-goal');
  sel.innerHTML = '';
  (u?.goals||[]).forEach(g => {
    const opt = el('option', { value: g.name });
    opt.textContent = g.name;
    sel.appendChild(opt);
  });

  q('#w-week').value       = e?.week       || weekLabel();
  sel.value                = e?.goal        || (u?.goals?.[0]?.name || '');
  q('#w-now').value        = e?.now         || '';
  q('#w-prev').value       = e?.prev        || '';
  q('#w-aspects').value    = e?.aspects     || '';
  q('#w-reflection').value = e?.reflection  || '';

  q('#btn-delete-entry').style.display = e ? 'inline-flex' : 'none';
  showModal('modal-weekly');
}

function saveEntry() {
  const week = q('#w-week').value.trim();
  const goal = q('#w-goal').value.trim();
  if (!week || !goal) { toast('please fill in week and goal 🌸'); return; }

  const u = userData();
  const weekly = u?.weekly || [];
  const data = {
    week, goal,
    now:        parseInt(q('#w-now').value) || 0,
    prev:       parseInt(q('#w-prev').value) || 0,
    aspects:    q('#w-aspects').value.trim(),
    reflection: q('#w-reflection').value.trim(),
    savedAt:    Date.now(),
  };

  if (editingEntry) {
    const idx = weekly.findIndex(e => e.id === editingEntry);
    if (idx !== -1) weekly[idx] = { ...weekly[idx], ...data };
  } else {
    weekly.push({ id: uid(), ...data });
  }

  setUserData({ weekly });
  closeAllModals();
  renderWeekly();
  toast(editingEntry ? 'entry updated ✓' : 'week logged 📊');
}

function deleteEntry() {
  if (!editingEntry) return;
  if (!confirm('delete this entry?')) return;
  const u = userData();
  setUserData({ weekly: (u.weekly||[]).filter(e => e.id !== editingEntry) });
  closeAllModals();
  renderWeekly();
  toast('entry deleted');
}

// ── Static event bindings ──────────────────────────────────────────────────
function bindStaticEvents() {
  // user screen
  q('#btn-add-user').addEventListener('click', () => showModal('modal-user'));
  q('#close-user-modal').addEventListener('click', closeAllModals);
  q('#btn-create-user').addEventListener('click', createUser);
  q('#new-user-name').addEventListener('keydown', e => { if(e.key==='Enter') createUser(); });

  // navigation
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  // sidebar toggle
  q('#sidebar-toggle').addEventListener('click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    q('#sidebar').classList.toggle('collapsed', sidebarCollapsed);
  });

  // switch user
  q('#btn-switch-user').addEventListener('click', () => {
    currentUser = null;
    DB.activeUser = null;
    save();
    showScreen('user-screen');
    renderUserScreen();
  });

  // goal modal
  q('#btn-add-goal').addEventListener('click', () => openGoalModal());
  q('#close-goal-modal').addEventListener('click', closeAllModals);
  q('#btn-save-goal').addEventListener('click', saveGoal);
  q('#btn-delete-goal').addEventListener('click', deleteGoal);
  q('#g-progress').addEventListener('input', () => {
    q('#g-progress-val').textContent = q('#g-progress').value;
  });

  // weekly modal
  q('#btn-add-entry').addEventListener('click', () => openWeeklyModal());
  q('#close-weekly-modal').addEventListener('click', closeAllModals);
  q('#btn-save-entry').addEventListener('click', saveEntry);
  q('#btn-delete-entry').addEventListener('click', deleteEntry);

  // filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderGoals();
    });
  });

  // compound sliders
  ['c-start','c-rate','c-days'].forEach(id => {
    q(`#${id}`)?.addEventListener('input', updateCompoundCalc);
  });

  // close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeAllModals(); });
  });

  // escape key
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });
}

// ── Modal helpers ──────────────────────────────────────────────────────────
function showModal(id) { q(`#${id}`).classList.remove('hidden'); }
function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  editingGoal = null; editingEntry = null;
}

// ── Screen helpers ─────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  q(`#${id}`).classList.add('active');
}

// ── Utility ────────────────────────────────────────────────────────────────
const q   = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function el(tag, attrs={}) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => e.setAttribute(k,v));
  return e;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function weekLabel() {
  const now = new Date();
  const opts = { month: 'short', day: 'numeric' };
  return `Week · ${now.toLocaleDateString('en-GB', opts)}`;
}

function emptyState(icon, text) {
  return `<div class="empty-state"><div class="empty-state-icon">${icon}</div>
          <div class="empty-state-text">${text}</div></div>`;
}

function progressClass(p) {
  if (p >= 100) return 'done';
  if (p >= 60)  return 'high';
  return '';
}

function statusClass(s) {
  if (s === 'Done')        return 'status-done';
  if (s === 'In Progress') return 'status-progress';
  return 'status-not-started';
}

function toast(msg, duration=2600) {
  const t = q('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), duration);
}
