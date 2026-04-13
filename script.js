'use strict';

/* ── STATE ─────────────────────────────────────────────────── */
const state = {
  timer: {
    mode: 'pomodoro', phase: 'focus',
    running: false, paused: false, intervalId: null,
    totalSeconds: 25 * 60, remainingSeconds: 25 * 60, currentSession: 1,
    config: { focusMin: 25, shortBreakMin: 5, longBreakMin: 15, sessionsPerCycle: 4 },
    custom: { hours: 0, minutes: 45, seconds: 0 },
  },
  tasks: [],
  stats: { totalSessions: 0, totalMinutes: 0, totalTasksDone: 0, todaySessions: 0, lastDate: null, history: [] },
  video: { playCount: 0, pauseCount: 0, endCount: 0, muteCount: 0, isMuted: false, player: null },
  ui: { sidebarOpen: false, activeFilter: 'all' },
};

/* ── DOM HELPERS ───────────────────────────────────────────── */
const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// Shorthand references only for elements used 3+ times
const D = {
  loader:      $('loader-overlay'),
  sidebar:     $('sidebar'),
  backdrop:    $('sidebar-backdrop'),
  menuBtn:     $('menu-btn'),
  topbar:      $('topbar'),
  statusLabel: $('status-label'),
  statusDot:   document.querySelector('.status-dot'),
  sessionCount:$('sidebar-session-count'),
  // Timer
  mins:        $('timer-minutes'),
  secs:        $('timer-seconds'),
  colon:       document.querySelector('.timer-colon'),
  phase:       $('timer-phase'),
  startBtn:    $('timer-start-btn'),
  btnIcon:     $('timer-btn-icon'),
  ring:        $('ring-progress'),
  sessionNum:  $('current-session-num'),
  nextPhase:   $('next-phase-label'),
  notifBanner: $('notif-banner'),
  notifText:   $('notif-text'),
  // Tasks
  taskForm:    $('task-form'),
  taskInput:   $('task-input'),
  taskError:   $('task-name-error'),
  taskList:    $('task-list'),
  taskEmpty:   $('task-empty'),
  activeCount: $('active-count'),
  doneCount:   $('done-count'),
  // Video
  vidBadge:    $('video-status-badge'),
  logEntries:  $('log-entries'),
  vidOverlay:  $('video-overlay'),
  evtPlay:     $('evt-play'),
  evtPause:    $('evt-pause'),
  evtEnd:      $('evt-end'),
  evtMute:     $('evt-mute'),
  // Stats
  statEls:     ['stat-sessions','stat-minutes','stat-tasks','stat-today'].map($),
  heroEls:     ['total-sessions-hero','total-minutes-hero','total-tasks-hero'].map($),
  historyList: $('history-list'),
  // Misc
  toasts:      $('toast-container'),
  parallax:    $('parallax-bg'),
};

/* ── EVENT 1: PAGE LOAD ────────────────────────────────────── */
window.addEventListener('load', () => {
  loadFromStorage();
  injectRingGradient();
  syncTimerUI();
  renderAll();
  setTimeout(() => {
    D.loader.classList.add('hidden');
    setTimeout(() => $$('.reveal-on-load').forEach(el => el.classList.add('visible')), 200);
  }, 2000);
});

/* ── SIDEBAR ───────────────────────────────────────────────── */
const openSidebar  = () => { state.ui.sidebarOpen = true;  D.sidebar.classList.add('open');    D.backdrop.classList.add('active');    D.menuBtn.classList.add('active');    document.body.style.overflow = 'hidden'; updateSidebarLink(); };
const closeSidebar = () => { state.ui.sidebarOpen = false; D.sidebar.classList.remove('open'); D.backdrop.classList.remove('active'); D.menuBtn.classList.remove('active'); document.body.style.overflow = ''; };

D.menuBtn.addEventListener('click', () => state.ui.sidebarOpen ? closeSidebar() : openSidebar());
$('sidebar-close').addEventListener('click', closeSidebar);
D.backdrop.addEventListener('click', closeSidebar);

$$('.sidebar-link').forEach(link => link.addEventListener('click', e => {
  e.preventDefault();
  document.querySelector(link.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
  setTimeout(closeSidebar, 300);
}));

function updateSidebarLink() {
  const sections = ['hero-section','timer-section','tasks-section','ambient-section','stats-section'];
  const active   = sections.reduce((acc, id) => {
    const el = $(id);
    return (el && window.scrollY >= el.offsetTop - 200) ? id : acc;
  }, 'hero-section');
  $$('.sidebar-link').forEach(l => l.classList.toggle('active', l.getAttribute('href').slice(1) === active));
}

/* ── EVENT 2: KEYBOARD ─────────────────────────────────────── */
document.addEventListener('keydown', e => {
  const isInput = ['input','textarea','select'].includes(document.activeElement.tagName.toLowerCase());
  const actions = {
    'Escape': () => state.ui.sidebarOpen && (closeSidebar(), showToast('Sidebar closed','✕','info')),
    ' ':      () => !isInput && (e.preventDefault(), toggleTimer()),
    'r' : 'R': () => !isInput && (e.preventDefault(), resetTimer(), showToast('Timer reset','↺','info')),
    's' : 'S': () => !isInput && (e.preventDefault(), skipPhase(), showToast('Phase skipped','⟫','info')),
    'm' : 'M': () => !isInput && (e.preventDefault(), openSidebar()),
    'o' : 'O': () => !isInput && (e.preventDefault(), openSidebar()),
    'c' : 'C': () => state.ui.sidebarOpen && (e.preventDefault(), closeSidebar()),
  };
  (actions[e.key] || actions[e.key.toLowerCase()])?.();
});

/* ── EVENT 5 & 6: SCROLL + RESIZE ──────────────────────────── */
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  D.topbar.classList.toggle('scrolled', y > 20);

  if (D.parallax) {
    const hero     = $('hero-section');
    const progress = Math.min(y / hero.offsetHeight, 1);
    const layers   = D.parallax.querySelectorAll('.parallax-layer');
    [0.5, 0.8, 1.2].forEach((speed, i) => { layers[i].style.transform = `translateY(${y * speed}px)`; });
    const [r,g,b]  = [124,58,237].map((s, i) => Math.round(s + ([6,182,212][i] - s) * progress));
    D.parallax.style.background = `linear-gradient(to bottom,rgba(${r},${g},${b},.1),rgba(${r},${g},${b},.3))`;
    const hc = document.querySelector('.hero-content');
    if (hc) hc.style.opacity = 1 - progress * 1.4;
  }

  $$('.scroll-reveal').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight - 80)
      setTimeout(() => el.classList.add('revealed'), parseInt(el.dataset.delay) || 0);
  });
  updateSidebarLink();
}, { passive: true });

window.addEventListener('resize', () => {
  if (window.innerWidth >= 1024 && state.ui.sidebarOpen) closeSidebar();
});

/* ── TIMER — CORE ──────────────────────────────────────────── */
function injectRingGradient() {
  const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
  defs.innerHTML = `<linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient>`;
  document.querySelector('.timer-ring').insertBefore(defs, null);
}

const getPhaseSeconds = () => {
  const c = state.timer.config;
  return ({ focus: c.focusMin * 60, 'short-break': c.shortBreakMin * 60, 'long-break': c.longBreakMin * 60 })[state.timer.phase] ?? c.focusMin * 60;
};

// Single function to sync all timer UI at once
function syncTimerUI() {
  const { remainingSeconds: rem, totalSeconds, phase, currentSession, config } = state.timer;
  const m = Math.floor(rem / 60), s = rem % 60;
  D.mins.textContent  = String(m).padStart(2,'0');
  D.secs.textContent  = String(s).padStart(2,'0');
  document.title = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} — FocusFlow`;

  const offset = 603 * (1 - rem / totalSeconds);
  D.ring.style.strokeDashoffset = offset;
  D.ring.style.stroke = phase === 'focus' ? 'url(#ring-gradient)' : '#06b6d4';
  D.ring.style.filter = `drop-shadow(0 0 6px rgba(${phase === 'focus' ? '124,58,237' : '6,182,212'},.6))`;

  const labels = { focus: 'FOCUS', 'short-break': 'SHORT BREAK', 'long-break': 'LONG BREAK' };
  D.phase.textContent  = labels[phase];
  D.phase.className    = 'timer-phase-label' + (phase !== 'focus' ? ' break-phase' : '');

  D.sessionNum.textContent = currentSession;
  const last = currentSession >= config.sessionsPerCycle;
  D.nextPhase.textContent  = phase === 'focus' ? (last ? 'Long break next' : 'Short break next') : 'Focus next';
}

const setPaused = (paused) => {
  D.btnIcon.textContent = paused ? '▶' : '⏸';
  D.colon.classList.toggle('paused', paused);
};

function toggleTimer() { state.timer.running ? pauseTimer() : startTimer(); }

function startTimer() {
  state.timer.running = true; state.timer.paused = false;
  setPaused(false);
  setStatus(state.timer.phase === 'focus' ? 'Focusing' : 'On Break', state.timer.phase === 'focus' ? 'running' : 'break');
  state.timer.intervalId = setInterval(() => {
    if (state.timer.remainingSeconds > 0) { state.timer.remainingSeconds--; syncTimerUI(); }
    else onPhaseComplete();
  }, 1000);
}

function pauseTimer() {
  state.timer.running = false; state.timer.paused = true;
  clearInterval(state.timer.intervalId);
  setPaused(true); setStatus('Paused','ready');
}

function resetTimer() {
  clearInterval(state.timer.intervalId);
  Object.assign(state.timer, { running: false, paused: false, remainingSeconds: state.timer.totalSeconds });
  setPaused(true); syncTimerUI(); setStatus('Ready','ready');
}

function skipPhase() {
  clearInterval(state.timer.intervalId);
  state.timer.running = false; state.timer.remainingSeconds = 0;
  onPhaseComplete();
}

function onPhaseComplete() {
  clearInterval(state.timer.intervalId);
  state.timer.running = false; setPaused(true);
  const c = state.timer.config;
  if (state.timer.phase === 'focus') {
    recordSession(c.focusMin);
    if (state.timer.currentSession >= c.sessionsPerCycle) {
      Object.assign(state.timer, { phase: 'long-break', currentSession: 1, totalSeconds: c.longBreakMin * 60 });
      showNotif('🎉 Long break time! You completed a full cycle.');
      showToast('Cycle complete! Long break time 🎉','🔥','success');
    } else {
      state.timer.phase = 'short-break';
      state.timer.currentSession++;
      state.timer.totalSeconds = c.shortBreakMin * 60;
      showNotif('⏸ Focus session complete. Take a short break!');
      showToast('Session complete! Short break time ⏸','✅','success');
    }
  } else {
    state.timer.phase = 'focus';
    state.timer.totalSeconds = c.focusMin * 60;
    showNotif('🧠 Break over. Time to focus!');
    showToast('Break over. Back to focus! 🧠','⏱','info');
  }
  state.timer.remainingSeconds = state.timer.totalSeconds;
  syncTimerUI(); setStatus('Ready','ready'); renderStats(); updateHeroStats();
}

const setStatus = (label, type) => {
  D.statusLabel.textContent = label;
  D.statusDot.className = 'status-dot' + (type === 'running' ? ' running' : type === 'break' ? ' break' : '');
};

// Timer button events
$('timer-start-btn').addEventListener('click', toggleTimer);
$('timer-reset-btn').addEventListener('click', () => { resetTimer(); showToast('Timer reset','↺','info'); });
$('timer-skip-btn').addEventListener('click',  () => { skipPhase();  showToast('Phase skipped','⟫','info'); });

// Mode switch
['pomodoro','custom'].forEach(mode => $(`mode-${mode}`).addEventListener('click', () => {
  state.timer.mode = mode; resetTimer();
  const isPomo = mode === 'pomodoro';
  $('mode-pomodoro').classList.toggle('active', isPomo);
  $('mode-custom').classList.toggle('active', !isPomo);
  $('pomodoro-config').classList.toggle('hidden', !isPomo);
  $('custom-config').classList.toggle('hidden', isPomo);
  if (isPomo) {
    state.timer.phase = 'focus';
    state.timer.totalSeconds = state.timer.remainingSeconds = state.timer.config.focusMin * 60;
  }
  syncTimerUI();
  showToast(`Switched to ${isPomo ? 'Pomodoro' : 'Custom'} mode`,'⚙','info');
}));

// Pomodoro config controls
const LIMITS = { 'focus-val':[5,60], 'short-break-val':[1,30], 'long-break-val':[5,60], 'sessions-val':[1,8] };
const CONFIG_MAP = { 'focus-val':'focusMin', 'short-break-val':'shortBreakMin', 'long-break-val':'longBreakMin', 'sessions-val':'sessionsPerCycle' };

$$('.ctrl-btn').forEach(btn => btn.addEventListener('click', () => {
  const id  = btn.dataset.target;
  const el  = $(id);
  const [mn, mx] = LIMITS[id] || [1,99];
  const val = Math.max(mn, Math.min(mx, parseInt(el.textContent) + parseInt(btn.dataset.delta)));
  el.textContent = val;
  state.timer.config[CONFIG_MAP[id]] = val;
  if (!state.timer.running && state.timer.phase === 'focus' && id === 'focus-val') {
    state.timer.totalSeconds = state.timer.remainingSeconds = val * 60;
    syncTimerUI();
  }
  D.sessionNum.textContent = state.timer.currentSession;
  D.nextPhase.textContent  = state.timer.currentSession >= state.timer.config.sessionsPerCycle ? 'Long break next' : 'Short break next';
}));

// Custom timer
$('set-custom-btn').addEventListener('click', () => {
  const total = (parseInt($('custom-hours').value)||0)*3600 + (parseInt($('custom-minutes').value)||0)*60 + (parseInt($('custom-seconds').value)||0);
  if (!total) return showToast('Please set a duration greater than 0','⚠','warning');
  resetTimer();
  state.timer.totalSeconds = state.timer.remainingSeconds = total;
  state.timer.phase = 'focus';
  syncTimerUI();
  showToast(`Custom timer set`,'⏱','success');
});

$('notif-close').addEventListener('click', () => D.notifBanner.classList.add('hidden'));
const showNotif = msg => {
  D.notifText.textContent = msg;
  D.notifBanner.classList.remove('hidden');
  setTimeout(() => D.notifBanner.classList.add('hidden'), 6000);
};

/* ── EVENT 3: TASK FORM ─────────────────────────────────────── */
D.taskForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = D.taskInput.value.trim();
  const setErr = msg => { D.taskError.textContent = msg; D.taskInput.classList.toggle('error', !!msg); };
  setErr('');
  if (!name)                                                           return setErr('Task name is required.');
  if (name.length < 3)                                                 return setErr('Task name must be at least 3 characters.');
  if (state.tasks.some(t => t.name.toLowerCase() === name.toLowerCase() && !t.done)) return setErr('A task with this name already exists.');

  state.tasks.unshift({ id: Date.now().toString(), name, category: $('task-category').value, priority: $('task-priority').value, note: $('task-note').value.trim(), done: false, createdAt: new Date().toISOString() });
  persist(); D.taskInput.value = ''; $('task-note').value = ''; D.taskInput.focus();
  showToast(`Task added: "${name}"`, '✅', 'success');
});

/* ── TASK RENDERING ─────────────────────────────────────────── */
const CAT_LABELS = { 'deep-work':'🧠 Deep Work', admin:'📋 Admin', creative:'🎨 Creative', learning:'📚 Learning', meeting:'💬 Meeting' };

function renderTaskList() {
  const f = state.ui.activeFilter;
  const tasks = state.tasks.filter(t => f === 'active' ? !t.done : f === 'done' ? t.done : true);
  D.taskList.querySelectorAll('.task-item').forEach(el => el.remove());
  D.taskEmpty.classList.toggle('hidden', tasks.length > 0);
  tasks.forEach(task => {
    const div = document.createElement('div');
    div.className = 'task-item' + (task.done ? ' done' : '');
    div.dataset.id = task.id;
    div.innerHTML = `
      <button class="task-checkbox ${task.done ? 'checked' : ''}" title="${task.done ? 'Mark incomplete' : 'Mark complete'}"></button>
      <div class="task-body">
        <div class="task-name">${escapeHTML(task.name)}</div>
        <div class="task-meta">
          <span class="task-tag cat-${task.category}">${CAT_LABELS[task.category] || task.category}</span>
          <span class="priority-dot ${task.priority}" title="Priority: ${task.priority}"></span>
          <span style="font-size:.68rem;color:var(--text-muted);font-family:var(--font-mono)">${task.priority}</span>
        </div>
        ${task.note ? `<div class="task-note">${escapeHTML(task.note)}</div>` : ''}
      </div>
      <button class="task-delete" title="Delete task">✕</button>`;
    div.querySelector('.task-checkbox').addEventListener('click', () => toggleTaskDone(task.id));
    div.querySelector('.task-delete').addEventListener('click',   () => deleteTask(task.id));
    D.taskList.appendChild(div);
  });
}

function updateTaskCounts() {
  D.activeCount.textContent = state.tasks.filter(t => !t.done).length;
  D.doneCount.textContent   = `${state.tasks.filter(t => t.done).length} done`;
}

function toggleTaskDone(id) {
  const t = state.tasks.find(t => t.id === id); if (!t) return;
  t.done = !t.done;
  if (t.done) { state.stats.totalTasksDone++; showToast(`Task completed: "${t.name}"`, '✅','success'); }
  persist(); renderTaskList(); updateTaskCounts(); renderStats(); updateHeroStats();
}

function deleteTask(id) {
  const had = state.tasks.find(t => t.id === id);
  state.tasks = state.tasks.filter(t => t.id !== id);
  persist(); renderTaskList(); updateTaskCounts();
  if (had) showToast('Task deleted','🗑','info');
}

$$('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
  $$('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); state.ui.activeFilter = btn.dataset.filter; renderTaskList();
}));

$('clear-done-btn').addEventListener('click', () => {
  const n = state.tasks.filter(t => t.done).length;
  state.tasks = state.tasks.filter(t => !t.done);
  persist(); renderTaskList(); updateTaskCounts();
  if (n) showToast(`Cleared ${n} completed task${n !== 1 ? 's' : ''}`, '🗑','info');
});

/* ── EVENT 8: YOUTUBE ───────────────────────────────────────── */
window.onYouTubeIframeAPIReady = () => {
  state.video.player = new YT.Player('yt-player', {
    videoId: 'jfKfPfyJRdk',
    playerVars: { autoplay:0, controls:0, rel:0, modestbranding:1, iv_load_policy:3, fs:0 },
    events: { onReady: e => { addVideoLog('Player ready. Click play to start.','idle'); e.target.mute(); setupAutoPlayOnScroll(); }, onStateChange: onPlayerStateChange },
  });
};

function setupAutoPlayOnScroll() {
  const el = $('yt-player'); if (!el) return;
  new IntersectionObserver(entries => entries.forEach(en => {
    if (!state.video.player) return;
    en.isIntersecting ? state.video.player.playVideo() : state.video.player.pauseVideo();
  }), { threshold: 0.5 }).observe(el);
}

function onPlayerStateChange({ data }) {
  const v = state.video;
  if (data === YT.PlayerState.PLAYING) {
    v.playCount++; D.evtPlay.textContent = v.playCount;
    D.vidBadge.textContent = 'Playing'; D.vidBadge.className = 'video-status-badge playing';
    D.vidOverlay.classList.add('hidden');
    addVideoLog('▶ Video started playing','play'); flashEventCard('play');
  } else if (data === YT.PlayerState.PAUSED) {
    v.pauseCount++; D.evtPause.textContent = v.pauseCount;
    D.vidBadge.textContent = 'Paused'; D.vidBadge.className = 'video-status-badge paused';
    addVideoLog('⏸ Video paused','pause'); flashEventCard('pause');
  } else if (data === YT.PlayerState.ENDED) {
    v.endCount++; D.evtEnd.textContent = v.endCount;
    D.vidBadge.textContent = 'Ended'; D.vidBadge.className = 'video-status-badge';
    D.vidOverlay.classList.remove('hidden');
    addVideoLog('⏹ Video ended','end'); flashEventCard('end');
    showToast('Video ended. Click play to restart.','🎵','info');
  }
}

// Video button events — grouped
[['vid-play', () => state.video.player?.playVideo()],
 ['vid-pause',() => state.video.player?.pauseVideo()],
 ['video-play-btn', () => state.video.player?.playVideo()]
].forEach(([id, fn]) => $(id).addEventListener('click', fn));

$('vid-mute').addEventListener('click', () => {
  const v = state.video; if (!v.player) return;
  v.isMuted = !v.isMuted;
  v.isMuted ? v.player.mute()   : v.player.unMute();
  $('vid-mute').textContent = v.isMuted ? '🔊 Unmute' : '🔇 Mute';
  if (v.isMuted) { v.muteCount++; D.evtMute.textContent = v.muteCount; addVideoLog('🔇 Video muted','mute'); flashEventCard('mute'); }
  else             addVideoLog('🔊 Video unmuted','mute');
});

function addVideoLog(msg, type) {
  const idle = D.logEntries.querySelector('.log-entry-idle');
  if (idle) idle.remove();
  const el  = document.createElement('div');
  el.className = `log-entry log-entry-${type}`;
  el.textContent = `[${new Date().toLocaleTimeString('en-US',{hour12:false})}] ${msg}`;
  D.logEntries.insertBefore(el, D.logEntries.firstChild);
  while (D.logEntries.children.length > 10) D.logEntries.removeChild(D.logEntries.lastChild);
}

const flashEventCard = type => {
  const card = document.querySelector(`.vevent-item[data-event="${type}"]`);
  if (card) { card.classList.add('fired'); setTimeout(() => card.classList.remove('fired'), 400); }
};

/* ── STATS ──────────────────────────────────────────────────── */
function recordSession(minutes) {
  const today = new Date().toDateString();
  if (state.stats.lastDate !== today) { state.stats.todaySessions = 0; state.stats.lastDate = today; }
  state.stats.totalSessions++;
  state.stats.totalMinutes += minutes;
  state.stats.todaySessions++;
  state.stats.history.unshift({ id: Date.now().toString(), type:'focus', duration: minutes, timestamp: new Date().toISOString() });
  if (state.stats.history.length > 20) state.stats.history.pop();
  D.sessionCount.textContent = state.stats.todaySessions;
  persist(); renderStats(); renderHistory();
}

function renderStats() {
  const { totalSessions, totalMinutes, totalTasksDone, todaySessions } = state.stats;
  [totalSessions, totalMinutes, totalTasksDone, todaySessions].forEach((v,i) => { D.statEls[i].textContent = v; });
}

function updateHeroStats() {
  [state.stats.totalSessions, state.stats.totalMinutes, state.stats.totalTasksDone].forEach((v,i) => { D.heroEls[i].textContent = v; });
}

function renderHistory() {
  D.historyList.innerHTML = state.stats.history.length === 0
    ? '<div class="history-empty">No sessions recorded yet. Start your first focus session!</div>'
    : state.stats.history.map(entry => {
        const d = new Date(entry.timestamp).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:true});
        return `<div class="history-item"><span class="history-icon">🔥</span><div class="history-info"><div class="history-title">Focus Session</div><div class="history-time">${d}</div></div><span class="history-duration">${entry.duration} min</span></div>`;
      }).join('');
}

$('clear-history-btn').addEventListener('click', () => {
  state.stats.history = []; persist(); renderHistory(); showToast('Session history cleared','🗑','info');
});

$('reset-stats-btn').addEventListener('click', () => {
  if (!confirm('Are you sure you want to reset all stats? This cannot be undone.')) return;
  state.stats = { totalSessions:0, totalMinutes:0, totalTasksDone:0, todaySessions:0, lastDate:null, history:[] };
  persist(); renderAll(); D.sessionCount.textContent = 0;
  showToast('All stats reset','↺','info');
});

/* ── HERO BUTTONS ───────────────────────────────────────────── */
$('hero-start-btn').addEventListener('click', () => {
  $('timer-section').scrollIntoView({ behavior:'smooth' });
  setTimeout(() => { if (!state.timer.running) { startTimer(); showToast('Focus session started! 🧠','▶','success'); } }, 800);
});
$('hero-learn-btn').addEventListener('click', () => $('timer-section').scrollIntoView({ behavior:'smooth' }));

/* ── TOASTS ─────────────────────────────────────────────────── */
function showToast(msg, icon='💡', type='info') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  D.toasts.appendChild(t);
  setTimeout(() => { t.classList.add('toast-out'); setTimeout(() => t.remove(), 350); }, 3000);
}

/* ── HOVER TILT ─────────────────────────────────────────────── */
$$('.glass-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const { left, top, width, height } = card.getBoundingClientRect();
    const tX = ((e.clientY - top  - height/2) / (height/2)) * 3;
    const tY = ((width/2  - (e.clientX - left)) / (width/2)) * 3;
    card.style.transform = `perspective(800px) rotateX(${tX}deg) rotateY(${tY}deg) translateY(-2px)`;
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

/* ── STORAGE ────────────────────────────────────────────────── */
function persist() {
  try {
    localStorage.setItem('focusflow_tasks',  JSON.stringify(state.tasks));
    localStorage.setItem('focusflow_stats',  JSON.stringify(state.stats));
    localStorage.setItem('focusflow_config', JSON.stringify(state.timer.config));
  } catch(e) { console.warn('localStorage save failed:', e); }
}

function loadFromStorage() {
  try {
    const tasks  = localStorage.getItem('focusflow_tasks');
    const stats  = localStorage.getItem('focusflow_stats');
    const config = localStorage.getItem('focusflow_config');
    if (tasks)  state.tasks = JSON.parse(tasks);
    if (stats)  state.stats = { ...state.stats, ...JSON.parse(stats) };
    if (config) {
      state.timer.config = { ...state.timer.config, ...JSON.parse(config) };
      const c = state.timer.config;
      ['focus-val','short-break-val','long-break-val','sessions-val'].forEach((id, i) => {
        $(id).textContent = [c.focusMin, c.shortBreakMin, c.longBreakMin, c.sessionsPerCycle][i];
      });
      state.timer.totalSeconds = state.timer.remainingSeconds = c.focusMin * 60;
    }
    const today = new Date().toDateString();
    if (state.stats.lastDate !== today) state.stats.todaySessions = 0;
    D.sessionCount.textContent = state.stats.todaySessions;
  } catch(e) { console.warn('localStorage load failed:', e); }
}

/* ── RENDER ALL (convenience) ───────────────────────────────── */
function renderAll() {
  renderTaskList(); updateTaskCounts(); renderStats(); renderHistory(); updateHeroStats();
}

/* ── UTILS ──────────────────────────────────────────────────── */
const escapeHTML = str => { const d = document.createElement('div'); d.appendChild(document.createTextNode(str)); return d.innerHTML; };

D.taskInput.addEventListener('input', () => { D.taskInput.classList.remove('error'); D.taskError.textContent = ''; });

['custom-hours','custom-minutes','custom-seconds'].forEach(id => {
  const el = $(id);
  el.addEventListener('blur', () => {
    const v = parseInt(el.value);
    if (isNaN(v) || v < 0) el.value = 0;
    if (id === 'custom-hours' && v > 23) el.value = 23;
    if (id !== 'custom-hours' && v > 59) el.value = 59;
  });
});

console.log('%cFocusFlow Initialized ✓', 'color: #7c3aed; font-weight: bold; font-size: 14px;');
console.log('%cPF 302 — Event Driven Programming | Mater Dei College', 'color: #06b6d4; font-size: 12px;');