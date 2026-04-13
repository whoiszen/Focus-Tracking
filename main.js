
//  * Events implemented:
//  *  1. Page Load Event       — Initialization, localStorage restore, loader dismiss
//  *  2. Button Click Events   — Timer controls, sidebar, tasks, video, filters, etc.
//  *  3. Keyboard Events       — Space (timer), ESC (sidebar), R (reset), S (skip), M (menu)
//  *  4. Form Submission Event — Task form with validation
//  *  5. Scroll Event          — Parallax hero, scroll-reveal animations, topbar styling
//  *  6. Window Resize Event   — Sidebar auto-close on mobile, responsive behavior
//  *  7. Hover Events          — Managed via CSS + JS for interactive effects
//  *  8. Video Events          — YouTube API: play, pause, end, mute tracking
//  *  9. Image/Parallax Effect — Multi-layer hero parallax on scroll
//  * 10. Dynamic Sidebar       — Open/close with overlay, ESC support, nav highlights
 

'use strict';   //directive nis javascript para e enable ang strict mode, less prone to error and safer siya if mag gamit ani.

/* ═══════════════════════════════════════════════════
   STATE MANAGEMENT
   ═══════════════════════════════════════════════════ */
const state = {
  // Timer state
  timer: {
    mode: 'pomodoro',          // 'pomodoro' | 'custom'
    phase: 'focus',            // 'focus' | 'short-break' | 'long-break'
    running: false,
    paused: false,
    intervalId: null,
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    currentSession: 1,
    config: {
      focusMin: 25,
      shortBreakMin: 5,
      longBreakMin: 15,
      sessionsPerCycle: 4,
    },
    custom: { hours: 0, minutes: 45, seconds: 0 },
  },
  // Task state
  tasks: [],
  // Stats
  stats: {  
    totalSessions: 0,
    totalMinutes: 0,
    totalTasksDone: 0,
    todaySessions: 0,
    lastDate: null,
    history: [],
  },
  // Video event counters
  video: {
    playCount: 0,
    pauseCount: 0,
    endCount: 0,
    muteCount: 0,
    isMuted: false,
    player: null,
  },
  // UI state
  ui: {
    sidebarOpen: false,
    activeFilter: 'all',
  },
};

/* ═══════════════════════════════════════════════════
   DOM REFERENCES
   ═══════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const DOM = {
  loader:           $('loader-overlay'),
  sidebar:          $('sidebar'),
  sidebarBackdrop:  $('sidebar-backdrop'),
  sidebarClose:     $('sidebar-close'),
  menuBtn:          $('menu-btn'),
  topbar:           $('topbar'),
  statusLabel:      $('status-label'),
  statusDot:        document.querySelector('.status-dot'),
  sidebarSessionCount: $('sidebar-session-count'),

  // Timer
  timerMinutes:     $('timer-minutes'),
  timerSeconds:     $('timer-seconds'),
  timerColon:       document.querySelector('.timer-colon'),
  timerPhaseLabel:  $('timer-phase'),
  timerStartBtn:    $('timer-start-btn'),
  timerBtnIcon:     $('timer-btn-icon'),
  timerResetBtn:    $('timer-reset-btn'),
  timerSkipBtn:     $('timer-skip-btn'),
  timerRingProgress:$('ring-progress'),
  currentSessionNum:$('current-session-num'),
  nextPhaseLabel:   $('next-phase-label'),
  modePomodoroBtn:  $('mode-pomodoro'),
  modeCustomBtn:    $('mode-custom'),
  pomodoroConfig:   $('pomodoro-config'),
  customConfig:     $('custom-config'),
  setCustomBtn:     $('set-custom-btn'),
  customHours:      $('custom-hours'),
  customMinutes:    $('custom-minutes'),
  customSeconds:    $('custom-seconds'),
  notifBanner:      $('notif-banner'),
  notifText:        $('notif-text'),
  notifClose:       $('notif-close'),

  // Tasks
  taskForm:         $('task-form'),
  taskInput:        $('task-input'),
  taskCategory:     $('task-category'),
  taskPriority:     $('task-priority'),
  taskNote:         $('task-note'),
  taskNameError:    $('task-name-error'),
  taskList:         $('task-list'),
  taskEmpty:        $('task-empty'),
  activeCount:      $('active-count'),
  doneCount:        $('done-count'),
  clearDoneBtn:     $('clear-done-btn'),

  // Video
  videoStatusBadge: $('video-status-badge'),
  logEntries:       $('log-entries'),
  vidPlayBtn:       $('vid-play'),
  vidPauseBtn:      $('vid-pause'),
  vidMuteBtn:       $('vid-mute'),
  videoOverlay:     $('video-overlay'),
  videoPlayBigBtn:  $('video-play-btn'),
  evtPlay:          $('evt-play'),
  evtPause:         $('evt-pause'),
  evtEnd:           $('evt-end'),
  evtMute:          $('evt-mute'),

  // Stats
  statSessions:     $('stat-sessions'),
  statMinutes:      $('stat-minutes'),
  statTasks:        $('stat-tasks'),
  statToday:        $('stat-today'),
  historyList:      $('history-list'),
  clearHistoryBtn:  $('clear-history-btn'),
  resetStatsBtn:    $('reset-stats-btn'),
  totalSessionsHero:$('total-sessions-hero'),
  totalMinutesHero: $('total-minutes-hero'),
  totalTasksHero:   $('total-tasks-hero'),

  // Hero
  heroStartBtn:     $('hero-start-btn'),
  heroLearnBtn:     $('hero-learn-btn'),
  parallaxBg:       $('parallax-bg'),
  toastContainer:   $('toast-container'),
};

/* ═══════════════════════════════════════════════════
   EVENT 1: PAGE LOAD — Initialization
   ═══════════════════════════════════════════════════ */
window.addEventListener('load', () => {
  // Restore data from localStorage
  loadFromStorage();

  // Add SVG gradient for ring
  injectRingGradient();

  // Update timer display
  updateTimerDisplay();
  updateTimerRing();
  updateSessionInfo();

  // Render tasks & stats
  renderTaskList();
  updateTaskCounts();
  renderStats();
  renderHistory();
  updateHeroStats();

  // Trigger load animations
  setTimeout(() => {
    // Dismiss loader
    DOM.loader.classList.add('hidden');

    // Trigger hero reveal animations
    document.querySelectorAll('.reveal-on-load').forEach(el => {
      setTimeout(() => el.classList.add('visible'), parseInt(el.style.transitionDelay) * 1000 || 0);
    });
    // Force all reveal-on-load to fire
    setTimeout(() => {
      document.querySelectorAll('.reveal-on-load').forEach(el => el.classList.add('visible'));
    }, 800);

  }, 2000); // Loader visible for 2s
});

/* ═══════════════════════════════════════════════════
   SIDEBAR — Dynamic Navigation (Event: Click + ESC)
   ═══════════════════════════════════════════════════ */
function openSidebar() {
  state.ui.sidebarOpen = true;
  DOM.sidebar.classList.add('open');
  DOM.sidebarBackdrop.classList.add('active');
  DOM.menuBtn.classList.add('active');
  document.body.style.overflow = 'hidden';
  updateSidebarActiveLink();
}

function closeSidebar() {
  state.ui.sidebarOpen = false;
  DOM.sidebar.classList.remove('open');
  DOM.sidebarBackdrop.classList.remove('active');
  DOM.menuBtn.classList.remove('active');
  document.body.style.overflow = '';
}

// Button Click: Open menu
DOM.menuBtn.addEventListener('click', () => {
  if (state.ui.sidebarOpen) closeSidebar();
  else openSidebar();
});

// Button Click: Close via X button
DOM.sidebarClose.addEventListener('click', closeSidebar);

// Click outside (backdrop) to close
DOM.sidebarBackdrop.addEventListener('click', closeSidebar);

// Sidebar smooth scroll nav
document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.getAttribute('href');
    const targetEl = document.querySelector(target);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
    setTimeout(closeSidebar, 300);
  });
});

function updateSidebarActiveLink() {
  const sections = ['hero-section', 'timer-section', 'tasks-section', 'ambient-section', 'stats-section'];
  let activeSection = 'hero-section';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 200) activeSection = id;
  });
  document.querySelectorAll('.sidebar-link').forEach(link => {
    const href = link.getAttribute('href').replace('#', '');
    link.classList.toggle('active', href === activeSection);
  });
}

/* ═══════════════════════════════════════════════════
   EVENT 2: KEYBOARD EVENTS
   ═══════════════════════════════════════════════════ */
document.addEventListener('keydown', (e) => {
  // Don't fire when typing in inputs
  const tag = document.activeElement.tagName.toLowerCase();
  const isInput = ['input', 'textarea', 'select'].includes(tag);

  switch (e.key) {
    case 'Escape':
      // ESC: Close sidebar
      if (state.ui.sidebarOpen) {
        closeSidebar();
        showToast('Sidebar closed', '✕', 'info');
      }
      break;

    case ' ':
      // Space: Toggle timer (only when not typing)
      if (!isInput) {
        e.preventDefault();
        toggleTimer();
      }
      break;

    case 'r':
    case 'R':
      if (!isInput) {
        e.preventDefault();
        resetTimer();
        showToast('Timer reset', '↺', 'info');
      }
      break;

    case 's':
    case 'S':
      if (!isInput) {
        e.preventDefault();
        skipPhase();
        showToast('Phase skipped', '⟫', 'info');
      }
      break;

    case 'm':
    case 'M':
      if (!isInput) {
        e.preventDefault();
        openSidebar();
      }
      break;
    
    case 'o':
    case 'O':
      if (!isInput) {
        e.preventDefault();
        openSidebar();
      }
      break;
    
    case 'c':
    case 'C':
      if (state.ui.sidebarOpen) {
        e.preventDefault();
        closeSidebar();
      }
      break;
  }
});

/* ═══════════════════════════════════════════════════
   EVENT 5: SCROLL EVENT — Parallax + Topbar + Reveal
   ═══════════════════════════════════════════════════ */
let lastScrollY = 0;

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;

  // Topbar styling on scroll
  if (scrollY > 20) DOM.topbar.classList.add('scrolled');
  else DOM.topbar.classList.remove('scrolled');

  // Parallax effect on hero layers
  const parallax = DOM.parallaxBg;
  if (parallax) {
    const heroHeight = document.getElementById('hero-section').offsetHeight;
    const progress = Math.min(scrollY / heroHeight, 1);
    const layers = parallax.querySelectorAll('.parallax-layer');
    layers[0].style.transform = `translateY(${scrollY * 0.3}px)`;   // Slow layer
    layers[1].style.transform = `translateY(${scrollY * 0.5}px)`;   // Medium layer
    layers[2].style.transform = `translateY(${scrollY * 0.7}px)`;   // Fast layer
    // Fade hero content on scroll
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
      heroContent.style.opacity = 1 - (progress * 1.4);
    }
  }

  // Scroll reveal for stat cards and other elements
  document.querySelectorAll('.scroll-reveal').forEach(el => {
    const rect = el.getBoundingClientRect();
    const delay = parseInt(el.dataset.delay) || 0;
    if (rect.top < window.innerHeight - 80) {
      setTimeout(() => el.classList.add('revealed'), delay);
    }
  });

  // Update sidebar active link
  updateSidebarActiveLink();

  lastScrollY = scrollY;
}, { passive: true });

/* ═══════════════════════════════════════════════════
   EVENT 6: WINDOW RESIZE EVENT
   ═══════════════════════════════════════════════════ */
window.addEventListener('resize', () => {
  // Auto-close sidebar on desktop (>= 1024px)
  if (window.innerWidth >= 1024 && state.ui.sidebarOpen) {
    closeSidebar();
    console.log('Sidebar closed.'); //test if mo work ba ang close if greater than 1024 ang size sa window.
  }
});

/* ═══════════════════════════════════════════════════
   TIMER — Core Logic
   ═══════════════════════════════════════════════════ */

function injectRingGradient() {
  // Insert SVG gradient defs into the ring SVG
  const svg = document.querySelector('.timer-ring');
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  `;
  svg.insertBefore(defs, svg.firstChild);
}

function getPhaseSeconds() {
  const c = state.timer.config;
  if (state.timer.phase === 'focus')       return c.focusMin * 60;
  if (state.timer.phase === 'short-break') return c.shortBreakMin * 60;
  if (state.timer.phase === 'long-break')  return c.longBreakMin * 60;
  return c.focusMin * 60;
}

function updateTimerDisplay() {
  const rem = state.timer.remainingSeconds;
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  DOM.timerMinutes.textContent = String(m).padStart(2, '0');
  DOM.timerSeconds.textContent = String(s).padStart(2, '0');
  // Update page title
  document.title = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} — FocusFlow`;
}

function updateTimerRing() {
  const totalDash = 603; // 2π * r ≈ 2 * 3.14159 * 96 ≈ 603
  const progress = state.timer.remainingSeconds / state.timer.totalSeconds;
  const offset = totalDash * (1 - progress);
  DOM.timerRingProgress.style.strokeDashoffset = offset;
  // Change ring color based on phase
  if (state.timer.phase === 'focus') {
    DOM.timerRingProgress.style.stroke = 'url(#ring-gradient)';
    DOM.timerRingProgress.style.filter = 'drop-shadow(0 0 6px rgba(124, 58, 237, 0.6))';
  } else {
    DOM.timerRingProgress.style.stroke = '#06b6d4';
    DOM.timerRingProgress.style.filter = 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))';
  }
}

function updateSessionInfo() {
  DOM.currentSessionNum.textContent = state.timer.currentSession;
  const isLastSession = state.timer.currentSession >= state.timer.config.sessionsPerCycle;
  DOM.nextPhaseLabel.textContent = state.timer.phase === 'focus'
    ? (isLastSession ? 'Long break next' : 'Short break next')
    : 'Focus next';
}

function updatePhaseLabel() {
  const labels = { 'focus': 'FOCUS', 'short-break': 'SHORT BREAK', 'long-break': 'LONG BREAK' };
  DOM.timerPhaseLabel.textContent = labels[state.timer.phase] || 'FOCUS';
  DOM.timerPhaseLabel.className = 'timer-phase-label' + (state.timer.phase !== 'focus' ? ' break-phase' : '');
}

function toggleTimer() {
  if (!state.timer.running) startTimer();
  else pauseTimer();
}

function startTimer() {
  state.timer.running = true;
  state.timer.paused = false;
  DOM.timerBtnIcon.textContent = '⏸';
  DOM.timerColon.classList.remove('paused');

  // Update topbar status
  setStatus(state.timer.phase === 'focus' ? 'Focusing' : 'On Break', state.timer.phase === 'focus' ? 'running' : 'break');

  state.timer.intervalId = setInterval(() => {
    if (state.timer.remainingSeconds > 0) {
      state.timer.remainingSeconds--;
      updateTimerDisplay();
      updateTimerRing();
    } else {
      // Phase complete!
      onPhaseComplete();
    }
  }, 1000);
}

function pauseTimer() {
  state.timer.running = false;
  state.timer.paused = true;
  clearInterval(state.timer.intervalId);
  DOM.timerBtnIcon.textContent = '▶';
  DOM.timerColon.classList.add('paused');
  setStatus('Paused', 'ready');
}

function resetTimer() {
  clearInterval(state.timer.intervalId); //e stop niya 
  state.timer.running = false;
  state.timer.paused = false;
  state.timer.remainingSeconds = state.timer.totalSeconds;
  DOM.timerBtnIcon.textContent = '▶';
  DOM.timerColon.classList.add('paused');
  updateTimerDisplay();
  updateTimerRing();
  setStatus('Ready', 'ready');
}

function skipPhase() {
  clearInterval(state.timer.intervalId);
  state.timer.running = false;
  state.timer.remainingSeconds = 0;
  onPhaseComplete();
}

function onPhaseComplete() {
  clearInterval(state.timer.intervalId);
  state.timer.running = false;
  DOM.timerBtnIcon.textContent = '▶';
  DOM.timerColon.classList.add('paused');

  if (state.timer.phase === 'focus') {
    // Record completed focus session
    const sessionMinutes = state.timer.config.focusMin;
    recordSession(sessionMinutes);

    // Advance session counter
    if (state.timer.currentSession >= state.timer.config.sessionsPerCycle) {
      // Go to long break
      state.timer.phase = 'long-break';
      state.timer.currentSession = 1;
      state.timer.totalSeconds = state.timer.config.longBreakMin * 60;
      showNotif('🎉 Long break time! You completed a full cycle.');
      showToast('Cycle complete! Long break time 🎉', '🔥', 'success');
    } else {
      // Go to short break
      state.timer.phase = 'short-break';
      state.timer.currentSession++;
      state.timer.totalSeconds = state.timer.config.shortBreakMin * 60;
      showNotif('⏸ Focus session complete. Take a short break!');
      showToast('Session complete! Short break time ⏸', '✅', 'success');
    }
  } else {
    // Break done → back to focus
    state.timer.phase = 'focus';
    state.timer.totalSeconds = state.timer.config.focusMin * 60;
    showNotif('🧠 Break over. Time to focus!');
    showToast('Break over. Back to focus! 🧠', '⏱', 'info');
  }

  state.timer.remainingSeconds = state.timer.totalSeconds;
  updateTimerDisplay();
  updateTimerRing();
  updatePhaseLabel();
  updateSessionInfo();
  setStatus('Ready', 'ready');
  renderStats();
  updateHeroStats();
}

function setStatus(label, type) {
  DOM.statusLabel.textContent = label;
  DOM.statusDot.className = 'status-dot ' + (type === 'running' ? 'running' : type === 'break' ? 'break' : '');
}

// Button Click: Start/Pause
DOM.timerStartBtn.addEventListener('click', toggleTimer);

// Button Click: Reset
DOM.timerResetBtn.addEventListener('click', () => {
  resetTimer();
  showToast('Timer reset', '↺', 'info');
});

// Button Click: Skip phase
DOM.timerSkipBtn.addEventListener('click', () => {
  skipPhase();
  showToast('Phase skipped', '⟫', 'info');
});

// Button Click: Mode switch
DOM.modePomodoroBtn.addEventListener('click', () => switchTimerMode('pomodoro'));
DOM.modeCustomBtn.addEventListener('click', () => switchTimerMode('custom'));

function switchTimerMode(mode) {
  state.timer.mode = mode;
  resetTimer();
  if (mode === 'pomodoro') {
    DOM.modePomodoroBtn.classList.add('active');
    DOM.modeCustomBtn.classList.remove('active');
    DOM.pomodoroConfig.classList.remove('hidden');
    DOM.customConfig.classList.add('hidden');
    state.timer.phase = 'focus';
    state.timer.totalSeconds = state.timer.config.focusMin * 60;
    state.timer.remainingSeconds = state.timer.totalSeconds;
  } else {
    DOM.modeCustomBtn.classList.add('active');
    DOM.modePomodoroBtn.classList.remove('active');
    DOM.customConfig.classList.remove('hidden');
    DOM.pomodoroConfig.classList.add('hidden');
  }
  updateTimerDisplay();
  updateTimerRing();
  updatePhaseLabel();
  showToast(`Switched to ${mode === 'pomodoro' ? 'Pomodoro' : 'Custom'} mode`, '⚙', 'info');
}

// Button Clicks: Pomodoro config controls
document.querySelectorAll('.ctrl-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const delta = parseInt(btn.dataset.delta);
    const span = document.getElementById(targetId);
    let val = parseInt(span.textContent) + delta;

    // Apply limits
    const limits = {
      'focus-val': [5, 60],
      'short-break-val': [1, 30],
      'long-break-val': [5, 60],
      'sessions-val': [1, 8],
    };
    const [min, max] = limits[targetId] || [1, 99];
    val = Math.max(min, Math.min(max, val));
    span.textContent = val;

    // Update state
    if (targetId === 'focus-val')        state.timer.config.focusMin = val;
    if (targetId === 'short-break-val')  state.timer.config.shortBreakMin = val;
    if (targetId === 'long-break-val')   state.timer.config.longBreakMin = val;
    if (targetId === 'sessions-val')     state.timer.config.sessionsPerCycle = val;

    // If timer not running, update display
    if (!state.timer.running && state.timer.phase === 'focus' && targetId === 'focus-val') {
      state.timer.totalSeconds = val * 60;
      state.timer.remainingSeconds = val * 60;
      updateTimerDisplay();
      updateTimerRing();
    }
    updateSessionInfo();
  });
});

// Button Click: Set custom timer
DOM.setCustomBtn.addEventListener('click', () => {
  const h = parseInt(DOM.customHours.value) || 0;
  const m = parseInt(DOM.customMinutes.value) || 0;
  const s = parseInt(DOM.customSeconds.value) || 0;
  const total = (h * 3600) + (m * 60) + s;
  if (total <= 0) {
    showToast('Please set a duration greater than 0', '⚠', 'warning');
    return;
  }
  resetTimer();
  state.timer.totalSeconds = total;
  state.timer.remainingSeconds = total;
  state.timer.phase = 'focus';
  updateTimerDisplay();
  updateTimerRing();
  updatePhaseLabel();
  showToast(`Custom timer set: ${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s > 0 ? s + 's' : ''}`, '⏱', 'success');
});

// Notification banner close
DOM.notifClose.addEventListener('click', () => {
  DOM.notifBanner.classList.add('hidden');
});

function showNotif(message) {
  DOM.notifText.textContent = message;
  DOM.notifBanner.classList.remove('hidden');
  // Auto-dismiss after 6s
  setTimeout(() => DOM.notifBanner.classList.add('hidden'), 6000);
}

/* ═══════════════════════════════════════════════════
   EVENT 3: FORM SUBMISSION — Task Form with Validation
   ═══════════════════════════════════════════════════ */
DOM.taskForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = DOM.taskInput.value.trim();
  const category = DOM.taskCategory.value;
  const priority = DOM.taskPriority.value;
  const note = DOM.taskNote.value.trim();

  // Validation
  let isValid = true;

  // Clear previous errors
  DOM.taskNameError.textContent = '';
  DOM.taskInput.classList.remove('error');

  if (!name) {
    DOM.taskNameError.textContent = 'Task name is required.';
    DOM.taskInput.classList.add('error');
    DOM.taskInput.focus();
    isValid = false;
  } else if (name.length < 3) {
    DOM.taskNameError.textContent = 'Task name must be at least 3 characters.';
    DOM.taskInput.classList.add('error');
    isValid = false;
  } else if (state.tasks.some(t => t.name.toLowerCase() === name.toLowerCase() && !t.done)) {
    DOM.taskNameError.textContent = 'A task with this name already exists.';
    DOM.taskInput.classList.add('error');
    isValid = false;
  }

  if (!isValid) return;

  // Create task object
  const task = {
    id: Date.now().toString(),
    name,
    category,
    priority,
    note,
    done: false,
    createdAt: new Date().toISOString(),
  };

  state.tasks.unshift(task);
  saveToStorage();
  renderTaskList();
  updateTaskCounts();
  updateHeroStats();

  // Clear ang form after submission
  DOM.taskInput.value = '';
  DOM.taskNote.value = '';
  DOM.taskInput.focus();

  showToast(`Task added: "${name}"`, '✅', 'success');
});

/* ═══════════════════════════════════════════════════
   TASK RENDERING & INTERACTIONS
   ═══════════════════════════════════════════════════ */
function renderTaskList() {
  const filter = state.ui.activeFilter;
  let tasks = state.tasks;

  if (filter === 'active') tasks = tasks.filter(t => !t.done);
  if (filter === 'done')   tasks = tasks.filter(t => t.done);

  // Remove all task items (keep empty state)
  const existing = DOM.taskList.querySelectorAll('.task-item');
  existing.forEach(el => el.remove());

  if (tasks.length === 0) {
    DOM.taskEmpty.classList.remove('hidden');
    return;
  }
  DOM.taskEmpty.classList.add('hidden');

  tasks.forEach(task => {
    const item = createTaskElement(task);
    DOM.taskList.appendChild(item);
  });
}

function createTaskElement(task) {
  const div = document.createElement('div');
  div.className = 'task-item' + (task.done ? ' done' : '');
  div.dataset.id = task.id;

  const catLabels = {
    'deep-work': '🧠 Deep Work',
    'admin':     '📋 Admin',
    'creative':  '🎨 Creative',
    'learning':  '📚 Learning',
    'meeting':   '💬 Meeting',
  };

  div.innerHTML = `
    <button class="task-checkbox ${task.done ? 'checked' : ''}" data-id="${task.id}" title="${task.done ? 'Mark incomplete' : 'Mark complete'}"></button>
    <div class="task-body">
      <div class="task-name">${escapeHTML(task.name)}</div>
      <div class="task-meta">
        <span class="task-tag cat-${task.category}">${catLabels[task.category] || task.category}</span>
        <span class="priority-dot ${task.priority}" title="Priority: ${task.priority}"></span>
        <span style="font-size:0.68rem; color:var(--text-muted); font-family:var(--font-mono);">${task.priority}</span>
      </div>
      ${task.note ? `<div class="task-note">${escapeHTML(task.note)}</div>` : ''}
    </div>
    <button class="task-delete" data-id="${task.id}" title="Delete task">✕</button>
  `;

  // Hover effects managed by CSS
  // Click: Toggle done
  div.querySelector('.task-checkbox').addEventListener('click', () => toggleTaskDone(task.id));
  // Click: Delete
  div.querySelector('.task-delete').addEventListener('click', () => deleteTask(task.id));

  return div;
}

function toggleTaskDone(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;

  if (task.done) {
    state.stats.totalTasksDone++;
    showToast(`Task completed: "${task.name}"`, '✅', 'success');
  }

  saveToStorage();
  renderTaskList();
  updateTaskCounts();
  renderStats();
  updateHeroStats();
}

function deleteTask(id) {
  const task = state.tasks.find(t => t.id === id);
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveToStorage();
  renderTaskList();
  updateTaskCounts();
  if (task) showToast(`Task deleted`, '🗑', 'info');
}

function updateTaskCounts() {
  const active = state.tasks.filter(t => !t.done).length;
  const done   = state.tasks.filter(t => t.done).length;
  DOM.activeCount.textContent = active;
  DOM.doneCount.textContent = `${done} done`;
}

// Button Click: Filter tasks
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.ui.activeFilter = btn.dataset.filter;
    renderTaskList();
  });
});

// Button Click: Clear completed tasks
DOM.clearDoneBtn.addEventListener('click', () => {
  const count = state.tasks.filter(t => t.done).length;
  state.tasks = state.tasks.filter(t => !t.done);
  saveToStorage();
  renderTaskList();
  updateTaskCounts();
  if (count > 0) showToast(`Cleared ${count} completed task${count !== 1 ? 's' : ''}`, '🗑', 'info');
});

/* ═══════════════════════════════════════════════════
   EVENT 8: VIDEO EVENTS — YouTube API
   ═══════════════════════════════════════════════════ */

// YouTube IFrame API — called automatically when API is ready
window.onYouTubeIframeAPIReady = function () {
  state.video.player = new YT.Player('yt-player', {
    videoId: 'jfKfPfyJRdk', // Lo-fi Girl — very popular focus/lofi stream
    playerVars: {
      autoplay: 0,
      controls: 0,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      fs: 0,
    },
    events: {
      onStateChange: onPlayerStateChange,
      onReady: onPlayerReady,
    },
  });
};

function onPlayerReady(event) {
  addVideoLog('Player ready. Click play to start.', 'idle');
  
  event.target.mute();
  setupAutoPlayOnScroll();
}

function setupAutoPlayOnScroll(){
  const videoSection = document.getElementById('yt-player');

  if(!videoSection) return;

  const observer =  new IntersectionObserver((entries) => {
    entries.forEach(entry => {

      if(!state.video.player) return;

      if (entry.isIntersecting) {
        state.video.player.playVideo();
      } else {
        state.video.player.pauseVideo();
      }
    });
  }, {
    threshold: 0.5 // play when 50% visible
  });

  observer.observe(videoSection);
}
  

function onPlayerStateChange(event) {
  const YT_STATES = {
    '-1': 'unstarted',
    '0':  'ended',
    '1':  'playing',
    '2':  'paused',
    '3':  'buffering',
    '5':  'cued',
  };
  const stateStr = YT_STATES[event.data] || 'unknown';

  switch (event.data) {
    case YT.PlayerState.PLAYING:
      // Video Play Event
      state.video.playCount++;
      DOM.evtPlay.textContent = state.video.playCount;
      DOM.videoStatusBadge.textContent = 'Playing';
      DOM.videoStatusBadge.className = 'video-status-badge playing';
      DOM.videoOverlay.classList.add('hidden');
      addVideoLog(`▶ Video started playing`, 'play');
      flashEventCard('play');
      break;

    case YT.PlayerState.PAUSED:
      // Video Pause Event
      state.video.pauseCount++;
      DOM.evtPause.textContent = state.video.pauseCount;
      DOM.videoStatusBadge.textContent = 'Paused';
      DOM.videoStatusBadge.className = 'video-status-badge paused';
      addVideoLog(`⏸ Video paused`, 'pause');
      flashEventCard('pause');
      break;

    case YT.PlayerState.ENDED:
      // Video End Event
      state.video.endCount++;
      DOM.evtEnd.textContent = state.video.endCount;
      DOM.videoStatusBadge.textContent = 'Ended';
      DOM.videoStatusBadge.className = 'video-status-badge';
      DOM.videoOverlay.classList.remove('hidden');
      addVideoLog(`⏹ Video ended`, 'end');
      flashEventCard('end');
      showToast('Video ended. Click play to restart.', '🎵', 'info');
      break;
  }
}

// Button Click: Video controls
DOM.vidPlayBtn.addEventListener('click', () => {
  if (state.video.player && state.video.player.playVideo) {
    state.video.player.playVideo();
  }
});

DOM.vidPauseBtn.addEventListener('click', () => {
  if (state.video.player && state.video.player.pauseVideo) {
    state.video.player.pauseVideo();
  }
});

// Video Mute Event
DOM.vidMuteBtn.addEventListener('click', () => {
  if (!state.video.player) return;
  state.video.isMuted = !state.video.isMuted;
  if (state.video.isMuted) {
    state.video.player.mute();
    DOM.vidMuteBtn.textContent = '🔊 Unmute';
    state.video.muteCount++;
    DOM.evtMute.textContent = state.video.muteCount;
    addVideoLog(`🔇 Video muted`, 'mute');
    flashEventCard('mute');
  } else {
    state.video.player.unMute();
    DOM.vidMuteBtn.textContent = '🔇 Mute';
    addVideoLog(`🔊 Video unmuted`, 'mute');
  }
});

// Big play button overlay
DOM.videoPlayBigBtn.addEventListener('click', () => {
  if (state.video.player && state.video.player.playVideo) {
    state.video.player.playVideo();
  }
});

function addVideoLog(message, type) {
  const logEl = DOM.logEntries;
  // Remove idle placeholder
  const idle = logEl.querySelector('.log-entry-idle');
  if (idle) idle.remove();

  const entry = document.createElement('div');
  entry.className = `log-entry log-entry-${type}`;
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  entry.textContent = `[${time}] ${message}`;
  logEl.insertBefore(entry, logEl.firstChild);

  // Keep max 10 entries
  while (logEl.children.length > 10) {
    logEl.removeChild(logEl.lastChild);
  }
}

function flashEventCard(eventType) {
  const card = document.querySelector(`.vevent-item[data-event="${eventType}"]`);
  if (card) {
    card.classList.add('fired');
    setTimeout(() => card.classList.remove('fired'), 400);
  }
}

/* ═══════════════════════════════════════════════════
   STATS & SESSION RECORDING
   ═══════════════════════════════════════════════════ */
function recordSession(minutes) {
  const today = new Date().toDateString();
  if (state.stats.lastDate !== today) {
    state.stats.todaySessions = 0;
    state.stats.lastDate = today;
  }
  state.stats.totalSessions++;
  state.stats.totalMinutes += minutes;
  state.stats.todaySessions++;

  // Add history entry
  const entry = {
    id: Date.now().toString(),
    type: 'focus',
    duration: minutes,
    timestamp: new Date().toISOString(),
  };
  state.stats.history.unshift(entry);
  if (state.stats.history.length > 20) state.stats.history.pop();

  DOM.sidebarSessionCount.textContent = state.stats.todaySessions;
  saveToStorage();
  renderStats();
  renderHistory();
}

function renderStats() {
  DOM.statSessions.textContent = state.stats.totalSessions;
  DOM.statMinutes.textContent  = state.stats.totalMinutes;
  DOM.statTasks.textContent    = state.stats.totalTasksDone;
  DOM.statToday.textContent    = state.stats.todaySessions;
}

function renderHistory() {
  DOM.historyList.innerHTML = '';
  if (state.stats.history.length === 0) {
    DOM.historyList.innerHTML = '<div class="history-empty">No sessions recorded yet. Start your first focus session!</div>';
    return;
  }
  state.stats.history.forEach(entry => {
    const div = document.createElement('div');
    div.className = 'history-item';
    const date = new Date(entry.timestamp);
    const timeStr = date.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
    div.innerHTML = `
      <span class="history-icon">🔥</span>
      <div class="history-info">
        <div class="history-title">Focus Session</div>
        <div class="history-time">${timeStr}</div>
      </div>
      <span class="history-duration">${entry.duration} min</span>
    `;
    DOM.historyList.appendChild(div);
  });
}

function updateHeroStats() {
  DOM.totalSessionsHero.textContent = state.stats.totalSessions;
  DOM.totalMinutesHero.textContent  = state.stats.totalMinutes;
  DOM.totalTasksHero.textContent    = state.stats.totalTasksDone;
}

// Button Click: Clear history
DOM.clearHistoryBtn.addEventListener('click', () => {
  state.stats.history = [];
  saveToStorage();
  renderHistory();
  showToast('Session history cleared', '🗑', 'info');
});

// Button Click: Reset all stats
DOM.resetStatsBtn.addEventListener('click', () => {
  if (!confirm('Are you sure you want to reset all stats? This cannot be undone.')) return;
  state.stats = {
    totalSessions: 0,
    totalMinutes: 0,
    totalTasksDone: 0,
    todaySessions: 0,
    lastDate: null,
    history: [],
  };
  saveToStorage();
  renderStats();
  renderHistory();
  updateHeroStats();
  DOM.sidebarSessionCount.textContent = 0;
  showToast('All stats reset', '↺', 'info');
});

/* ═══════════════════════════════════════════════════
   HERO BUTTON CLICKS
   ═══════════════════════════════════════════════════ */
DOM.heroStartBtn.addEventListener('click', () => {
  document.getElementById('timer-section').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    if (!state.timer.running) {
      startTimer();
      showToast('Focus session started! 🧠', '▶', 'success');
    }
  }, 800);
});

DOM.heroLearnBtn.addEventListener('click', () => {
  document.getElementById('timer-section').scrollIntoView({ behavior: 'smooth' });
});

/* ═══════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ═══════════════════════════════════════════════════ */
function showToast(message, icon = '💡', type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 350);
  }, 3000);
}

/* ═══════════════════════════════════════════════════
   HOVER EVENTS — JS-enhanced interactions
   ═══════════════════════════════════════════════════ */
// Add tilt effect on glass cards
document.querySelectorAll('.glass-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const tiltX = ((y - cy) / cy) * 3;
    const tiltY = ((cx - x) / cx) * 3;
    card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-2px)`;
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

/* ═══════════════════════════════════════════════════
   LOCAL STORAGE — Persistence
   ═══════════════════════════════════════════════════ */
function saveToStorage() {
  try {
    localStorage.setItem('focusflow_tasks',  JSON.stringify(state.tasks));
    localStorage.setItem('focusflow_stats',  JSON.stringify(state.stats));
    localStorage.setItem('focusflow_config', JSON.stringify(state.timer.config));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
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
      // Sync UI config display
      document.getElementById('focus-val').textContent = state.timer.config.focusMin;
      document.getElementById('short-break-val').textContent = state.timer.config.shortBreakMin;
      document.getElementById('long-break-val').textContent = state.timer.config.longBreakMin;
      document.getElementById('sessions-val').textContent = state.timer.config.sessionsPerCycle;
      // Update timer
      state.timer.totalSeconds = state.timer.config.focusMin * 60;
      state.timer.remainingSeconds = state.timer.config.focusMin * 60;
    }

    // Restore today session count
    const today = new Date().toDateString();
    if (state.stats.lastDate !== today) state.stats.todaySessions = 0;
    DOM.sidebarSessionCount.textContent = state.stats.todaySessions;

  } catch (e) {
    console.warn('localStorage load failed:', e);
  }
}

/* ═══════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════ */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/* ═══════════════════════════════════════════════════
   INPUT: Real-time validation feedback on task input
   ═══════════════════════════════════════════════════ */
DOM.taskInput.addEventListener('input', () => {
  if (DOM.taskInput.classList.contains('error')) {
    DOM.taskInput.classList.remove('error');
    DOM.taskNameError.textContent = '';
  }
});

// Custom number input: clamp on blur
[DOM.customHours, DOM.customMinutes, DOM.customSeconds].forEach(input => {
  input.addEventListener('blur', () => {
    const val = parseInt(input.value);
    if (isNaN(val) || val < 0) input.value = 0;
    if (input === DOM.customHours && val > 23) input.value = 23;
    if ((input === DOM.customMinutes || input === DOM.customSeconds) && val > 59) input.value = 59;
  });
});

console.log('%cFocusFlow Initialized ✓', 'color: #7c3aed; font-weight: bold; font-size: 14px;');
console.log('%cPF 302 — Event Driven Programming | Mater Dei College', 'color: #06b6d4; font-size: 12px;');
