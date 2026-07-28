/* ============ SUPABASE SETUP ============ */
/* Fill these in from Supabase Dashboard → Settings → API.
   The anon/public key is safe to put here — it only works within
   the Row Level Security rules set up in sb-schema.sql. */
const SUPABASE_URL = 'https://rzkleuuaullcijeixrpw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Up8mEluQTx-afEo-NugOvw_5c9Aqevh';

let sb = null;
if (window.supabase && window.supabase.createClient) {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('view-root');
    if (root) {
      root.innerHTML = '<div style="padding:20px;color:#ffb08a;">Could not load the Supabase library (check your internet connection and reload). If this keeps happening, the CDN script tag in index.html may need updating.</div>';
    }
  });
}
let currentUserId = null;
let authFailed = false;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

async function ensureAuth() {
  if (!sb) { authFailed = true; return; }
  try {
    const { data: { session } } = await withTimeout(sb.auth.getSession(), 15000);
    if (session) {
      currentUserId = session.user.id;
      return;
    }
    const { data, error } = await withTimeout(sb.auth.signInAnonymously(), 15000);
    if (error) {
      console.error('Anonymous sign-in failed. Did you enable it in Supabase → Authentication → Providers?', error);
      authFailed = true;
      return;
    }
    currentUserId = data.user.id;
  } catch (e) {
    console.error('ensureAuth failed or timed out:', e);
    authFailed = true;
  }
}

/* ============ WORKOUT PLAN DATA ============ */
const plan = [
  {
    day: "Day 1", title: "Push (Chest, Shoulders, Triceps) — Beginner",
    focus: "4 core machines + 20 min incline walk. Keep it simple this phase.",
    exercises: [
      { name: "Chest Press Machine", sets: "2 sets x 12 reps" },
      { name: "Shoulder Press Machine", sets: "2 sets x 12 reps" },
      { name: "Triceps Pushdown (cable/machine)", sets: "2 sets x 12 reps" },
      { name: "Pec Deck / Chest Fly Machine", sets: "2 sets x 12 reps" },
      { name: "Incline Treadmill Walk", sets: "20 min, moderate pace" }
    ]
  },
  {
    day: "Day 2", title: "Pull (Back, Biceps) — Beginner",
    focus: "4 core machines + 20 min incline walk",
    exercises: [
      { name: "Lat Pulldown Machine", sets: "2 sets x 12 reps" },
      { name: "Seated Row Machine", sets: "2 sets x 12 reps" },
      { name: "Bicep Curl Machine", sets: "2 sets x 12 reps" },
      { name: "Incline Treadmill Walk", sets: "20 min, moderate pace" }
    ]
  },
  {
    day: "Day 3", title: "Legs — Beginner",
    focus: "3 core leg machines + 15 min walk",
    exercises: [
      { name: "Leg Press Machine", sets: "2 sets x 12 reps" },
      { name: "Leg Extension Machine", sets: "2 sets x 12 reps" },
      { name: "Leg Curl Machine (hamstrings)", sets: "2 sets x 12 reps" },
      { name: "Incline Treadmill Walk", sets: "15 min, moderate pace" }
    ]
  },
  {
    day: "Day 4", title: "Push (Chest, Shoulders, Triceps) — Beginner",
    focus: "Same as Day 1 — repetition builds the habit + 25 min cardio",
    exercises: [
      { name: "Chest Press Machine", sets: "2 sets x 12 reps" },
      { name: "Shoulder Press Machine", sets: "2 sets x 12 reps" },
      { name: "Triceps Pushdown (cable/machine)", sets: "2 sets x 12 reps" },
      { name: "Pec Deck / Chest Fly Machine", sets: "2 sets x 12 reps" },
      { name: "Cardio: Cycle or Treadmill", sets: "25 min, steady pace" }
    ]
  },
  {
    day: "Day 5", title: "Pull (Back, Biceps) — Beginner",
    focus: "Same as Day 2 + 25 min cardio",
    exercises: [
      { name: "Lat Pulldown Machine", sets: "2 sets x 12 reps" },
      { name: "Seated Row Machine", sets: "2 sets x 12 reps" },
      { name: "Bicep Curl Machine", sets: "2 sets x 12 reps" },
      { name: "Cardio: Cycle or Treadmill", sets: "25 min, steady pace" }
    ]
  },
  {
    day: "Day 6", title: "Legs — Beginner",
    focus: "Same as Day 3 + longer cardio finisher",
    exercises: [
      { name: "Leg Press Machine", sets: "2 sets x 12 reps" },
      { name: "Leg Extension Machine", sets: "2 sets x 12 reps" },
      { name: "Leg Curl Machine (hamstrings)", sets: "2 sets x 12 reps" },
      { name: "Cardio: Incline Walk or Cycle", sets: "30 min, steady pace" }
    ]
  },
  {
    day: "Cardio", title: "Weekly Cardio Guide",
    focus: "Total weekly cardio target: ~2 hr - 2 hr 15 min",
    exercises: [
      { name: "Day 1 (Push) — Incline Treadmill Walk", sets: "20 min, moderate pace" },
      { name: "Day 2 (Pull) — Incline Treadmill Walk", sets: "20 min, moderate pace" },
      { name: "Day 3 (Legs) — Incline Walk", sets: "15 min, moderate pace" },
      { name: "Day 4 (Push) — Cycle or Treadmill", sets: "25 min, steady pace" },
      { name: "Day 5 (Pull) — Cycle or Treadmill", sets: "25 min, steady pace" },
      { name: "Day 6 (Legs) — Incline Walk or Cycle", sets: "30 min, steady pace" },
      { name: "Rest Day (optional) — Light walk outdoors", sets: "20-30 min, easy pace, purely for recovery" }
    ]
  }
];

let currentView = 'workout'; // 'workout' | 'weight' | 'calories' | 'backup'
let currentDay = 0;
const dayState = {}; // dayIndex -> Set of checked exercise indices
let exerciseLog = []; // {exercise_name, entry_date, weight, reps}

function loadDayState(day) {
  if (!dayState[day]) dayState[day] = new Set();
  return dayState[day];
}

/* ============ EXERCISE LOG (progressive overload) ============ */
async function loadExerciseLog() {
  if (!currentUserId) { exerciseLog = []; return; }
  const { data, error } = await sb
    .from('exercise_log')
    .select('exercise_name, entry_date, weight, reps')
    .eq('user_id', currentUserId)
    .order('entry_date', { ascending: true });
  if (error) { console.error('loadExerciseLog failed', error); exerciseLog = []; return; }
  exerciseLog = data || [];
}

function getLastLog(exerciseName) {
  const entries = exerciseLog.filter(e => e.exercise_name === exerciseName);
  return entries.length ? entries[entries.length - 1] : null;
}

async function saveExerciseLog(exerciseName, dateStr, weight, reps) {
  if (!currentUserId) return;
  const { error } = await sb
    .from('exercise_log')
    .upsert({ user_id: currentUserId, exercise_name: exerciseName, entry_date: dateStr, weight, reps }, { onConflict: 'user_id,exercise_name,entry_date' });
  if (error) console.error('saveExerciseLog failed', error);
}

/* ============ GYM CHECK-IN / STREAK ============ */
let gymCheckins = {}; // entry_date -> row
let freezeUses = {}; // entry_date -> true (a missed day patched by a streak freeze)
let streaks = { current: 0, best: 0 };
let pendingFreezeToast = false;

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function loadGymCheckins() {
  if (!currentUserId) { gymCheckins = {}; return; }
  const { data, error } = await sb
    .from('gym_checkins')
    .select('entry_date, check_in_time, check_in_photo_path, check_out_time, check_out_photo_path, is_rest_day')
    .eq('user_id', currentUserId)
    .order('entry_date', { ascending: true });
  if (error) { console.error('loadGymCheckins failed', error); gymCheckins = {}; return; }
  gymCheckins = {};
  (data || []).forEach(r => { gymCheckins[r.entry_date] = r; });
}

async function loadFreezeUses() {
  if (!currentUserId) { freezeUses = {}; return; }
  const { data, error } = await sb
    .from('streak_freeze_uses')
    .select('entry_date')
    .eq('user_id', currentUserId);
  if (error) { console.error('loadFreezeUses failed', error); freezeUses = {}; return; }
  freezeUses = {};
  (data || []).forEach(r => { freezeUses[r.entry_date] = true; });
}

function isDayCompleted(row) {
  if (!row) return false;
  if (row.is_rest_day) return true;
  return !!(row.check_in_photo_path && row.check_out_photo_path);
}

function isDateCompleted(ds) {
  return isDayCompleted(gymCheckins[ds]) || !!freezeUses[ds];
}

// Auto-patches single-day gaps in the streak using earned freezes (never touches today).
async function applyStreakFreezes() {
  if (!currentUserId) return;
  const earned = profile.freezesEarned || 0;
  const used = Object.keys(freezeUses).length;
  let available = Math.min(3, earned - used);
  if (available <= 0) return;

  const completedSet = new Set(Object.keys(gymCheckins).filter(d => isDayCompleted(gymCheckins[d])));
  Object.keys(freezeUses).forEach(d => completedSet.add(d));

  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1); // never freeze today — it's still in progress
  for (let i = 0; i < 60 && available > 0; i++) {
    const ds = cursor.toISOString().slice(0, 10);
    const prev = new Date(cursor); prev.setDate(prev.getDate() - 1);
    const next = new Date(cursor); next.setDate(next.getDate() + 1);
    const prevStr = prev.toISOString().slice(0, 10);
    const nextStr = next.toISOString().slice(0, 10);
    if (!completedSet.has(ds) && completedSet.has(prevStr) && completedSet.has(nextStr)) {
      const { error } = await sb.from('streak_freeze_uses')
        .upsert({ user_id: currentUserId, entry_date: ds }, { onConflict: 'user_id,entry_date', ignoreDuplicates: true });
      if (!error) {
        freezeUses[ds] = true;
        completedSet.add(ds);
        available--;
        pendingFreezeToast = true;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }
}

async function checkFreezeAward() {
  if (!currentUserId) return;
  const milestone = Math.floor(streaks.best / 14) * 14;
  const last = profile.lastFreezeMilestone || 0;
  if (milestone > last && milestone > 0) {
    const gained = Math.floor((milestone - last) / 14);
    const newEarned = (profile.freezesEarned || 0) + gained;
    const { error } = await sb.from('profile').update({
      freezes_earned: newEarned,
      last_freeze_milestone: milestone
    }).eq('user_id', currentUserId);
    if (!error) {
      profile.freezesEarned = newEarned;
      profile.lastFreezeMilestone = milestone;
    }
  }
}

function computeStreaks() {
  const allDates = new Set([...Object.keys(gymCheckins), ...Object.keys(freezeUses)]);
  const completedDates = [...allDates].filter(isDateCompleted).sort();
  const set = new Set(completedDates);
  const today = todayStr();

  let current = 0;
  const cursor = new Date();
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (set.has(cursor.toISOString().slice(0, 10))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  let best = 0, run = 0, prev = null;
  completedDates.forEach(ds => {
    if (prev) {
      const diff = Math.round((new Date(ds) - new Date(prev)) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = ds;
  });
  best = Math.max(best, current);

  streaks = { current, best };
}

function captureGymPhoto() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (input.parentNode) document.body.removeChild(input);
      if (file) resolve(file); else reject(new Error('no-photo'));
    };
    document.body.appendChild(input);
    input.click();
  });
}

async function uploadGymPhoto(file, kind) {
  const date = todayStr();
  const path = `${currentUserId}/${date}-${kind}-${Date.now()}.jpg`;
  const { error } = await sb.storage.from('gym-photos').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg'
  });
  if (error) throw error;
  return path;
}

function celebrateStreak() {
  const toast = document.createElement('div');
  toast.className = 'streak-toast';
  toast.textContent = `🔥 Day complete! ${streaks.current}-day streak`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2600);
}

function celebrateFreezeUsed() {
  const toast = document.createElement('div');
  toast.className = 'streak-toast pr-toast';
  toast.textContent = `🧊 Freeze used — streak protected!`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2600);
}

function celebratePR(name, weight) {
  const toast = document.createElement('div');
  toast.className = 'streak-toast pr-toast';
  toast.textContent = `🏆 New PR! ${name} — ${weight}kg`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2600);
}

async function handleCheckIn() {
  if (!currentUserId) { alert("Not connected yet — tap Retry at the top, then try again."); return; }
  const date = todayStr();
  const existing = gymCheckins[date];
  if (existing && existing.check_in_photo_path) return;
  try {
    const file = await captureGymPhoto();
    const path = await uploadGymPhoto(file, 'checkin');
    const { error } = await sb.from('gym_checkins').upsert({
      user_id: currentUserId,
      entry_date: date,
      check_in_time: new Date().toISOString(),
      check_in_photo_path: path,
      is_rest_day: false
    }, { onConflict: 'user_id,entry_date' });
    if (error) throw error;
    await loadGymCheckins();
    computeStreaks();
    renderStreakWidget();
    computeXP();
    renderXPWidget();
    renderVsAverageWidget();
  } catch (e) {
    if (e.message !== 'no-photo') { console.error('Check-in failed', e); alert('Check-in failed — see console.'); }
  }
}

async function handleCheckOut() {
  if (!currentUserId) { alert("Not connected yet — tap Retry at the top, then try again."); return; }
  const date = todayStr();
  const existing = gymCheckins[date];
  if (!existing || !existing.check_in_photo_path) { alert("Check in first."); return; }
  if (existing.check_out_photo_path) return;
  try {
    const file = await captureGymPhoto();
    const path = await uploadGymPhoto(file, 'checkout');
    const { error } = await sb.from('gym_checkins').upsert({
      user_id: currentUserId,
      entry_date: date,
      check_out_time: new Date().toISOString(),
      check_out_photo_path: path
    }, { onConflict: 'user_id,entry_date' });
    if (error) throw error;
    const wasCompleted = isDayCompleted(existing);
    await loadGymCheckins();
    computeStreaks();
    await checkFreezeAward();
    renderStreakWidget();
    computeXP();
    renderXPWidget();
    renderVsAverageWidget();
    if (!wasCompleted && isDayCompleted(gymCheckins[date])) celebrateStreak();
  } catch (e) {
    if (e.message !== 'no-photo') { console.error('Check-out failed', e); alert('Check-out failed — see console.'); }
  }
}

async function handleRestDay() {
  if (!currentUserId) { alert("Not connected yet — tap Retry at the top, then try again."); return; }
  const date = todayStr();
  if (gymCheckins[date]) return;
  if (!confirm("Mark today as a rest day? This keeps your streak alive without a gym check-in.")) return;
  const { error } = await sb.from('gym_checkins').upsert({
    user_id: currentUserId,
    entry_date: date,
    is_rest_day: true
  }, { onConflict: 'user_id,entry_date' });
  if (error) { console.error('Rest day save failed', error); return; }
  await loadGymCheckins();
  computeStreaks();
  await checkFreezeAward();
  renderStreakWidget();
  computeXP();
  renderXPWidget();
  renderVsAverageWidget();
}

function renderStreakWidget() {
  const el = document.getElementById('streak-widget');
  if (!el) return;
  const date = todayStr();
  const today = gymCheckins[date];
  const checkedIn = !!(today && today.check_in_photo_path);
  const checkedOut = !!(today && today.check_out_photo_path);
  const isRest = !!(today && today.is_rest_day);
  const doneToday = isDayCompleted(today);

  let actionsHtml;
  if (isRest) {
    actionsHtml = '<span class="streak-status">😴 Rest day logged</span>';
  } else if (doneToday) {
    actionsHtml = '<span class="streak-status">✅ Today locked in</span>';
  } else {
    actionsHtml = `
      <button class="streak-btn" id="btn-checkin" ${checkedIn ? 'disabled' : ''}>${checkedIn ? '✅ Checked in' : '📸 Check In'}</button>
      <button class="streak-btn" id="btn-checkout" ${(!checkedIn || checkedOut) ? 'disabled' : ''}>${checkedOut ? '✅ Checked out' : '📸 Check Out'}</button>
      ${!checkedIn ? '<button class="streak-btn secondary" id="btn-rest">Rest day</button>' : ''}
    `;
  }

  const tierClass = streaks.current >= 30 ? 'tier-gold' : streaks.current >= 7 ? 'tier-silver' : '';
  const litClass = streaks.current > 0 ? 'lit' : '';
  const freezeBalance = Math.max(0, Math.min(3, (profile.freezesEarned || 0) - Object.keys(freezeUses).length));

  el.innerHTML = `
    <div class="streak-widget ${litClass} ${tierClass}">
      <div class="streak-flame-wrap">
        <div class="streak-flame ${litClass}">🔥</div>
      </div>
      <div class="streak-nums">
        <div class="streak-current">${streaks.current}</div>
        <div class="streak-lbl">day streak · best ${streaks.best}${freezeBalance > 0 ? ` · 🧊×${freezeBalance}` : ''}</div>
      </div>
      <div class="streak-actions">${actionsHtml}</div>
    </div>
  `;
  const inBtn = document.getElementById('btn-checkin');
  const outBtn = document.getElementById('btn-checkout');
  const restBtn = document.getElementById('btn-rest');
  if (inBtn) inBtn.onclick = handleCheckIn;
  if (outBtn) outBtn.onclick = handleCheckOut;
  if (restBtn) restBtn.onclick = handleRestDay;
}

/* ============ PR FEED (derived from exercise_log — no new table) ============ */
let prFeed = []; // most recent first

function computePRFeed() {
  const sorted = [...exerciseLog]
    .filter(e => e.weight != null)
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const runningMax = {};
  const prs = [];
  sorted.forEach(e => {
    const prevMax = runningMax[e.exercise_name];
    if (prevMax === undefined || e.weight > prevMax) {
      prs.push({ exercise_name: e.exercise_name, entry_date: e.entry_date, weight: e.weight, reps: e.reps });
      runningMax[e.exercise_name] = e.weight;
    }
  });
  prFeed = prs.reverse().slice(0, 8);
}

function renderPRFeedCard() {
  if (!prFeed.length) return null;
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="card-title">🏆 Recent PRs</div>
    ${prFeed.slice(0, 4).map(p => `
      <div class="log-entry">
        <span>${p.exercise_name}</span>
        <span><b style="color:var(--gold)">${p.weight}kg</b>${p.reps ? ` x ${p.reps}` : ''} <span class="date">${p.entry_date}</span></span>
      </div>
    `).join('')}
  `;
  return card;
}

/* ============ XP / LEVELS (derived from existing data — no new table) ============ */
const LEVELS = [
  { name: 'Recruit', xp: 0 },
  { name: 'Grinder', xp: 150 },
  { name: 'Builder', xp: 400 },
  { name: 'Machine', xp: 800 },
  { name: 'Beast', xp: 1500 },
  { name: 'Titan', xp: 2600 },
  { name: 'Legend', xp: 4200 }
];
let xp = { total: 0, level: 1, levelName: 'Recruit', currentFloor: 0, nextCeil: 150 };

function computeXP() {
  const completedDays = Object.keys(gymCheckins).filter(d => isDayCompleted(gymCheckins[d])).length
                      + Object.keys(freezeUses).length;
  const exercisesLogged = exerciseLog.filter(e => e.weight != null || e.reps != null).length;
  const weighIns = weightLog.length;
  const prCount = prFeed.length;
  const milestoneBonus = Math.floor(streaks.best / 7) * 50;

  const total = completedDays * 10 + exercisesLogged * 5 + weighIns * 5 + prCount * 50 + milestoneBonus;

  let levelIdx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (total >= LEVELS[i].xp) levelIdx = i;
  }
  xp = {
    total,
    level: levelIdx + 1,
    levelName: LEVELS[levelIdx].name,
    currentFloor: LEVELS[levelIdx].xp,
    nextCeil: LEVELS[levelIdx + 1] ? LEVELS[levelIdx + 1].xp : null
  };
}

function renderXPWidget() {
  const el = document.getElementById('xp-widget');
  if (!el) return;
  const pct = xp.nextCeil
    ? Math.min(100, Math.round(((xp.total - xp.currentFloor) / (xp.nextCeil - xp.currentFloor)) * 100))
    : 100;
  const nextLabel = xp.nextCeil ? `${xp.total}/${xp.nextCeil} XP` : `${xp.total} XP · Max level`;
  el.innerHTML = `
    <div class="xp-widget">
      <div class="xp-top">
        <span class="xp-level">Lvl ${xp.level} · ${xp.levelName}</span>
        <span class="xp-count">${nextLabel}</span>
      </div>
      <div class="xp-bar-bg"><div class="xp-bar-fill" style="width:${pct}%"></div></div>
    </div>
  `;
}

/* ============ YOU VS. AVERAGE GYM-GOER ============ */
// Benchmark from published 2024-2025 industry survey data (HFA 2025 Benchmarking Report,
// gitnux/market.us aggregation): average gym member trains ~1.5x/week; only an estimated
// 18-20% of members hit 3+ sessions/week, and roughly 5% sustain 5+ sessions/week.
// This is a rough motivational comparison, not a precise personal ranking.
const BENCHMARK_WEEKLY_AVG = 1.5;

function computeVsAverage() {
  const today = new Date();
  let last7 = 0, last28 = 0;
  for (let i = 0; i < 28; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (isDateCompleted(ds)) {
      last28++;
      if (i < 7) last7++;
    }
  }
  return { last7, weeklyAvg28: last28 / 4 };
}

function percentileLine(weeklyAvg) {
  if (weeklyAvg >= 5) return "training more than an estimated 95% of gym members 🚀";
  if (weeklyAvg >= 3) return "training more than an estimated 80% of gym members 💪";
  if (weeklyAvg >= BENCHMARK_WEEKLY_AVG) return "already ahead of the average gym member";
  if (weeklyAvg >= 1) return "right around the average gym member";
  return "just getting started — average members train ~1.5x/week";
}

function renderVsAverageWidget() {
  const el = document.getElementById('vs-avg-widget');
  if (!el) return;
  const { last7, weeklyAvg28 } = computeVsAverage();
  el.innerHTML = `
    <div class="vs-avg-widget">
      <div class="vs-avg-top">
        <span class="vs-avg-title">📊 You vs. Average</span>
        <span class="vs-avg-stat">${last7}x this week · ${weeklyAvg28.toFixed(1)}/wk (4-wk avg)</span>
      </div>
      <div class="vs-avg-line">You're ${percentileLine(weeklyAvg28)}<span class="vs-avg-src"> · avg gym member trains ~1.5x/week</span></div>
    </div>
  `;
}

/* ============ MAIN NAV ============ */
function renderMainNav() {
  const nav = document.getElementById('main-nav');
  nav.innerHTML = '';
  const views = [
    { id: 'workout', label: 'Workout' },
    { id: 'weight', label: 'Weight Log' },
    { id: 'calories', label: 'Calories' },
    { id: 'backup', label: 'Backup' }
  ];
  views.forEach(v => {
    const btn = document.createElement('div');
    btn.className = 'main-nav-btn' + (currentView === v.id ? ' active' : '');
    btn.textContent = v.label;
    btn.onclick = () => { currentView = v.id; renderMainNav(); renderView(); };
    nav.appendChild(btn);
  });
}

function renderView() {
  if (currentView === 'workout') renderWorkoutView();
  else if (currentView === 'weight') renderWeightView();
  else if (currentView === 'calories') renderCaloriesView();
  else if (currentView === 'backup') renderBackupView();
}

/* ============ WORKOUT VIEW ============ */
async function renderWorkoutView() {
  await loadExerciseLog();
  const root = document.getElementById('view-root');
  root.innerHTML = '';

  const progressWrap = document.createElement('div');
  progressWrap.className = 'progress-wrap';
  progressWrap.innerHTML = `
    <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
      <span id="progress-label">Today: 0/0 done</span>
      <span id="progress-pct">0%</span>
    </div>
    <div class="progress-bar-bg"><div class="progress-bar-fill" id="progress-fill"></div></div>
  `;
  root.appendChild(progressWrap);

  const prCard = renderPRFeedCard();
  if (prCard) root.appendChild(prCard);

  const tabsEl = document.createElement('div');
  tabsEl.className = 'tabs';
  plan.forEach((d, i) => {
    const tab = document.createElement('div');
    tab.className = 'tab' + (i === currentDay ? ' active' : '');
    tab.textContent = d.day;
    tab.onclick = () => { currentDay = i; renderWorkoutView(); };
    tabsEl.appendChild(tab);
  });
  root.appendChild(tabsEl);

  const dayContent = document.createElement('div');
  dayContent.id = 'day-content';
  root.appendChild(dayContent);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'reset-btn';
  resetBtn.textContent = "Reset today's checkmarks";
  resetBtn.onclick = () => { dayState[currentDay] = new Set(); renderWorkoutView(); };
  root.appendChild(resetBtn);

  renderDayContent();
}

function isCardioExercise(ex) {
  return /min,/.test(ex.sets) || /walk|cycle|treadmill|cardio/i.test(ex.name);
}

function renderDayContent() {
  const d = plan[currentDay];
  const checked = loadDayState(currentDay);
  const content = document.getElementById('day-content');
  content.innerHTML = '';

  const titleEl = document.createElement('div');
  titleEl.className = 'day-title';
  titleEl.textContent = d.title;
  content.appendChild(titleEl);

  const focusEl = document.createElement('div');
  focusEl.className = 'day-focus';
  focusEl.textContent = d.focus;
  content.appendChild(focusEl);

  d.exercises.forEach((ex, i) => {
    const row = document.createElement('div');
    row.className = 'exercise' + (checked.has(i) ? ' checked' : '');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = checked.has(i);
    cb.onchange = () => {
      if (cb.checked) {
        checked.add(i);
        startRestTimer(ex.name);
      } else {
        checked.delete(i);
      }
      renderDayContent();
      updateProgress();
    };

    const info = document.createElement('div');
    info.style.flex = '1';
    const name = document.createElement('div');
    name.className = 'ex-name';
    name.textContent = ex.name;
    const sets = document.createElement('div');
    sets.className = 'ex-sets';
    sets.textContent = ex.sets;
    info.appendChild(name);
    info.appendChild(sets);

    const link = document.createElement('a');
    link.href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.name + ' proper form tutorial');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'video-link';
    link.textContent = '▶ Watch tutorial';
    info.appendChild(link);

    if (!isCardioExercise(ex)) {
      const last = getLastLog(ex.name);
      const logWrap = document.createElement('div');
      logWrap.style.cssText = 'margin-top:8px; display:flex; gap:6px; align-items:center; flex-wrap:wrap;';
      logWrap.innerHTML = `
        <input type="number" step="0.5" placeholder="kg" style="width:60px; background:#1e222b; border:1px solid var(--border); color:var(--text); border-radius:6px; padding:6px; font-size:0.78rem;" class="log-weight-input">
        <span style="color:var(--muted); font-size:0.75rem;">x</span>
        <input type="number" placeholder="reps" style="width:56px; background:#1e222b; border:1px solid var(--border); color:var(--text); border-radius:6px; padding:6px; font-size:0.78rem;" class="log-reps-input">
        <button class="log-save-btn" style="background:transparent; border:1px solid var(--border); color:var(--accent2); border-radius:6px; padding:6px 10px; font-size:0.72rem; font-weight:700; cursor:pointer;">Save</button>
        <span class="log-last-note" style="color:var(--muted); font-size:0.7rem; width:100%;">${last ? `Last: ${last.weight ?? '-'}kg x ${last.reps ?? '-'} (${last.entry_date})` : 'No history yet'}</span>
      `;
      const weightInput = logWrap.querySelector('.log-weight-input');
      const repsInput = logWrap.querySelector('.log-reps-input');
      const saveBtn = logWrap.querySelector('.log-save-btn');
      const lastNote = logWrap.querySelector('.log-last-note');
      saveBtn.onclick = async () => {
        if (!currentUserId) { alert("Not connected yet — tap Retry at the top, then try again."); return; }
        const w = parseFloat(weightInput.value);
        const r = parseInt(repsInput.value, 10);
        if (!w && !r) return;
        const dateStr = new Date().toISOString().slice(0, 10);
        const prevBest = Math.max(0, ...exerciseLog
          .filter(e => e.exercise_name === ex.name && e.weight != null)
          .map(e => e.weight));
        await saveExerciseLog(ex.name, dateStr, w || null, r || null);
        await loadExerciseLog();
        computePRFeed();
        computeXP();
        renderXPWidget();
        lastNote.textContent = `Last: ${w || '-'}kg x ${r || '-'} (${dateStr})`;
        weightInput.value = '';
        repsInput.value = '';
        if (w && w > prevBest) {
          celebratePR(ex.name, w);
          renderWorkoutView();
        }
      };
      info.appendChild(logWrap);
    }

    row.appendChild(cb);
    row.appendChild(info);
    content.appendChild(row);
  });

  const note = document.createElement('div');
  note.className = 'cardio-note';
  note.textContent = 'Tip: keep rest between sets to 45-60 sec to keep this a fat-loss session, not just strength.';
  content.appendChild(note);

  updateProgress();
}

function updateProgress() {
  const d = plan[currentDay];
  const checked = loadDayState(currentDay);
  const total = d.exercises.length;
  const done = checked.size;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const lbl = document.getElementById('progress-label');
  const pctEl = document.getElementById('progress-pct');
  const fill = document.getElementById('progress-fill');
  if (lbl) lbl.textContent = `Today: ${done}/${total} done`;
  if (pctEl) pctEl.textContent = pct + '%';
  if (fill) fill.style.width = pct + '%';
}

/* ============ REST TIMER ============ */
let restTimerInterval = null;
function startRestTimer(exerciseName) {
  if (isCardioExercise({ name: exerciseName, sets: '' })) return;
  const existing = document.getElementById('rest-timer-overlay');
  if (existing) existing.remove();
  if (restTimerInterval) clearInterval(restTimerInterval);

  let seconds = 75; // default rest between sets
  const overlay = document.createElement('div');
  overlay.id = 'rest-timer-overlay';
  overlay.style.cssText = 'position:fixed; bottom:16px; left:16px; right:16px; background:var(--card); border:1px solid var(--accent); border-radius:12px; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; z-index:9998; box-shadow:0 4px 20px rgba(0,0,0,0.4);';
  overlay.innerHTML = `
    <div>
      <div style="font-size:0.72rem; color:var(--muted);">Rest before next set</div>
      <div id="rest-timer-count" style="font-size:1.3rem; font-weight:700; color:var(--accent2);">01:15</div>
    </div>
    <button id="rest-timer-skip" style="background:var(--accent); color:#fff; border:none; border-radius:8px; padding:8px 14px; font-size:0.78rem; font-weight:700; cursor:pointer;">Skip</button>
  `;
  document.body.appendChild(overlay);

  const countEl = document.getElementById('rest-timer-count');
  const skipBtn = document.getElementById('rest-timer-skip');
  const render = () => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    if (countEl) countEl.textContent = `${m}:${s}`;
  };
  render();

  restTimerInterval = setInterval(() => {
    seconds--;
    render();
    if (seconds <= 0) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
      overlay.remove();
    }
  }, 1000);

  skipBtn.onclick = () => {
    clearInterval(restTimerInterval);
    restTimerInterval = null;
    overlay.remove();
  };
}

/* ============ PROFILE (for calorie calc) ============ */
let profile = { age: '', sex: 'male', activity: '1.375', currentWeight: 75, height: 176, freezesEarned: 0, lastFreezeMilestone: 0 };

async function loadProfile() {
  if (!currentUserId) return;
  const { data, error } = await sb
    .from('profile')
    .select('*')
    .eq('user_id', currentUserId)
    .maybeSingle();
  if (error) { console.error('loadProfile failed', error); return; }
  if (data) {
    profile = {
      age: data.age ?? '',
      sex: data.sex ?? 'male',
      currentWeight: data.current_weight ?? 75,
      height: data.height ?? 176,
      activity: String(data.activity ?? 1.375),
      freezesEarned: data.freezes_earned ?? 0,
      lastFreezeMilestone: data.last_freeze_milestone ?? 0
    };
  }
}

async function saveProfile() {
  if (!currentUserId) return;
  const { error } = await sb.from('profile').upsert({
    user_id: currentUserId,
    age: profile.age ? parseInt(profile.age, 10) : null,
    sex: profile.sex,
    current_weight: profile.currentWeight,
    height: profile.height,
    activity: parseFloat(profile.activity),
    updated_at: new Date().toISOString()
  });
  if (error) console.error('saveProfile failed', error);
}

/* ============ WEIGHT LOG VIEW ============ */
let weightLog = [];

async function loadWeightLog() {
  if (!currentUserId) { weightLog = []; return; }
  const { data, error } = await sb
    .from('weight_log')
    .select('entry_date, weight')
    .eq('user_id', currentUserId)
    .order('entry_date', { ascending: true });
  if (error) { console.error('loadWeightLog failed', error); weightLog = []; return; }
  weightLog = (data || []).map(r => ({ date: r.entry_date, weight: r.weight }));
}

async function addWeightEntry(dateStr, val) {
  const { error } = await sb
    .from('weight_log')
    .upsert({ user_id: currentUserId, entry_date: dateStr, weight: val }, { onConflict: 'user_id,entry_date' });
  if (error) console.error('addWeightEntry failed', error);
}

async function deleteWeightEntry(dateStr) {
  const { error } = await sb
    .from('weight_log')
    .delete()
    .eq('user_id', currentUserId)
    .eq('entry_date', dateStr);
  if (error) console.error('deleteWeightEntry failed', error);
}

async function renderWeightView() {
  await loadWeightLog();
  await loadProfile();
  const root = document.getElementById('view-root');
  root.innerHTML = '';

  const entryCard = document.createElement('div');
  entryCard.className = 'card';
  const todayStr = new Date().toISOString().slice(0, 10);
  entryCard.innerHTML = `
    <div class="card-title">Log your weight</div>
    <div class="field-row">
      <div class="field">
        <label>Weight (kg)</label>
        <input type="number" step="0.1" id="weight-input" placeholder="e.g. 74.5" value="${profile.currentWeight || ''}">
      </div>
      <div class="field">
        <label>Date</label>
        <input type="date" id="weight-date-input" value="${todayStr}" max="${todayStr}">
      </div>
    </div>
    <button class="btn" id="log-weight-btn">Add entry</button>
  `;
  root.appendChild(entryCard);

  // Latest / start / target stats
  const latest = weightLog.length ? weightLog[weightLog.length - 1].weight : profile.currentWeight;
  const start = weightLog.length ? weightLog[0].weight : profile.currentWeight;
  const lost = (start - latest).toFixed(1);

  const statCard = document.createElement('div');
  statCard.className = 'card';
  statCard.innerHTML = `
    <div class="card-title">Progress</div>
    <div class="stat-grid">
      <div class="stat-box"><div class="val">${latest ? latest.toFixed(1) : '-'}</div><div class="lbl">Current (kg)</div></div>
      <div class="stat-box"><div class="val">${lost >= 0 ? lost : 0}</div><div class="lbl">Lost so far (kg)</div></div>
      <div class="stat-box"><div class="val">65-68</div><div class="lbl">Target range (kg)</div></div>
      <div class="stat-box"><div class="val">${latest ? Math.max(0, (latest - 66.5)).toFixed(1) : '-'}</div><div class="lbl">To go (kg, approx)</div></div>
    </div>
  `;
  root.appendChild(statCard);

  // Simple line chart via SVG
  const chartCard = document.createElement('div');
  chartCard.className = 'card';
  chartCard.innerHTML = `<div class="card-title">Weight trend</div>`;
  const chartWrap = document.createElement('div');
  chartWrap.className = 'chart-wrap';
  if (weightLog.length >= 2) {
    chartWrap.appendChild(buildWeightChart(weightLog));
  } else {
    chartWrap.innerHTML = '<div class="empty-note">Log at least 2 entries to see your trend line.</div>';
  }
  chartCard.appendChild(chartWrap);
  root.appendChild(chartCard);

  // Log list
  const logCard = document.createElement('div');
  logCard.className = 'card';
  logCard.innerHTML = `<div class="card-title">History</div>`;
  if (weightLog.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-note';
    empty.textContent = 'No entries yet.';
    logCard.appendChild(empty);
  } else {
    [...weightLog].reverse().forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'log-entry';
      row.innerHTML = `
        <div>
          <div>${entry.weight.toFixed(1)} kg</div>
          <div class="date">${entry.date}</div>
        </div>
        <div class="del" data-ts="${entry.date}">✕</div>
      `;
      row.querySelector('.del').onclick = async () => {
        await deleteWeightEntry(entry.date);
        await loadWeightLog();
        renderWeightView();
      };
      logCard.appendChild(row);
    });
  }
  root.appendChild(logCard);

  document.getElementById('log-weight-btn').onclick = async () => {
    const val = parseFloat(document.getElementById('weight-input').value);
    if (!val || val <= 0) return;
    if (!currentUserId) { alert("Not connected yet — tap Retry at the top, then try again."); return; }
    const chosenDate = document.getElementById('weight-date-input').value || new Date().toISOString().slice(0, 10);
    await addWeightEntry(chosenDate, val);
    const todayStr = new Date().toISOString().slice(0, 10);
    if (chosenDate === todayStr) {
      profile.currentWeight = val;
      await saveProfile();
    }
    await loadWeightLog();
    computeXP();
    renderXPWidget();
    renderWeightView();
  };
}

function buildWeightChart(log) {
  const w = 300, h = 120, pad = 20;
  const weights = log.map(e => e.weight);
  const min = Math.min(...weights) - 1;
  const max = Math.max(...weights) + 1;
  const xStep = (w - pad * 2) / (log.length - 1);
  const yScale = v => h - pad - ((v - min) / (max - min)) * (h - pad * 2);

  let points = log.map((e, i) => `${pad + i * xStep},${yScale(e.weight)}`).join(' ');

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', h);

  const polyline = document.createElementNS(svgNS, 'polyline');
  polyline.setAttribute('points', points);
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', '#3ddc97');
  polyline.setAttribute('stroke-width', '2');
  svg.appendChild(polyline);

  log.forEach((e, i) => {
    const cx = pad + i * xStep;
    const cy = yScale(e.weight);
    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', 3);
    circle.setAttribute('fill', '#ff6a3d');
    svg.appendChild(circle);
  });

  return svg;
}

/* ============ CALORIE TRACKER VIEW ============ */
let calorieLog = [];

async function loadCalorieLog() {
  if (!currentUserId) { calorieLog = []; return; }
  const { data, error } = await sb
    .from('calorie_log')
    .select('entry_date, calories')
    .eq('user_id', currentUserId)
    .order('entry_date', { ascending: true });
  if (error) { console.error('loadCalorieLog failed', error); calorieLog = []; return; }
  calorieLog = (data || []).map(r => ({ date: r.entry_date, calories: r.calories }));
}

async function addCalorieEntry(dateStr, val) {
  const { error } = await sb
    .from('calorie_log')
    .upsert({ user_id: currentUserId, entry_date: dateStr, calories: val }, { onConflict: 'user_id,entry_date' });
  if (error) console.error('addCalorieEntry failed', error);
}

async function deleteCalorieEntry(dateStr) {
  const { error } = await sb
    .from('calorie_log')
    .delete()
    .eq('user_id', currentUserId)
    .eq('entry_date', dateStr);
  if (error) console.error('deleteCalorieEntry failed', error);
}

function calcBMR(p) {
  const age = parseFloat(p.age) || 30;
  const weight = parseFloat(p.currentWeight) || 75;
  const height = parseFloat(p.height) || 176;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return p.sex === 'female' ? base - 161 : base + 5;
}

function calcTDEE(p) {
  return calcBMR(p) * parseFloat(p.activity);
}

async function renderCaloriesView() {
  await loadCalorieLog();
  await loadProfile();
  const root = document.getElementById('view-root');
  root.innerHTML = '';

  // Profile inputs for auto calc
  const profileCard = document.createElement('div');
  profileCard.className = 'card';
  profileCard.innerHTML = `
    <div class="card-title">Your details (for calorie calculation)</div>
    <div class="field-row">
      <div class="field">
        <label>Age</label>
        <input type="number" id="p-age" value="${profile.age || ''}" placeholder="e.g. 28">
      </div>
      <div class="field">
        <label>Sex</label>
        <select id="p-sex">
          <option value="male" ${profile.sex === 'male' ? 'selected' : ''}>Male</option>
          <option value="female" ${profile.sex === 'female' ? 'selected' : ''}>Female</option>
        </select>
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Current weight (kg)</label>
        <input type="number" step="0.1" id="p-weight" value="${profile.currentWeight || 75}">
      </div>
      <div class="field">
        <label>Height (cm)</label>
        <input type="number" id="p-height" value="${profile.height || 176}">
      </div>
    </div>
    <div class="field">
      <label>Activity level</label>
      <select id="p-activity">
        <option value="1.2" ${profile.activity == '1.2' ? 'selected' : ''}>Sedentary (desk job, little exercise)</option>
        <option value="1.375" ${profile.activity == '1.375' ? 'selected' : ''}>Lightly active (this 6-day plan)</option>
        <option value="1.55" ${profile.activity == '1.55' ? 'selected' : ''}>Moderately active</option>
        <option value="1.725" ${profile.activity == '1.725' ? 'selected' : ''}>Very active</option>
      </select>
    </div>
    <button class="btn" id="save-profile-btn">Update calculation</button>
  `;
  root.appendChild(profileCard);

  // Auto calc results
  const bmr = Math.round(calcBMR(profile));
  const tdee = Math.round(calcTDEE(profile));
  const deficit = 500; // moderate, ~0.5kg/week
  const target = tdee - deficit;

  const calcCard = document.createElement('div');
  calcCard.className = 'card';
  calcCard.innerHTML = `
    <div class="card-title">Auto-calculated targets</div>
    <div class="stat-grid">
      <div class="stat-box"><div class="val">${bmr}</div><div class="lbl">BMR (kcal/day)</div></div>
      <div class="stat-box"><div class="val">${tdee}</div><div class="lbl">Maintenance (TDEE)</div></div>
      <div class="stat-box"><div class="val">-${deficit}</div><div class="lbl">Daily deficit</div></div>
      <div class="stat-box"><div class="val">${target}</div><div class="lbl">Target intake (kcal)</div></div>
    </div>
    <div class="deficit-note">This gives roughly 0.5 kg/week of fat loss — a pace that preserves muscle while still moving the scale. Recalculates automatically as your weight drops (update your weight in the Weight Log tab).</div>
  `;
  root.appendChild(calcCard);

  // Calorie entry
  const entryCard = document.createElement('div');
  entryCard.className = 'card';
  entryCard.innerHTML = `
    <div class="card-title">Add calories eaten (adds to today's total)</div>
    <div class="field-row">
      <div class="field">
        <label>Calories (kcal)</label>
        <input type="number" id="cal-input" placeholder="e.g. 1800">
      </div>
    </div>
    <button class="btn" id="log-cal-btn">Add entry</button>
  `;
  root.appendChild(entryCard);

  // Today's status vs target
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = calorieLog.find(e => e.date === today);
  if (todayEntry) {
    const diff = target - todayEntry.calories;
    const statusCard = document.createElement('div');
    statusCard.className = 'card';
    statusCard.innerHTML = `
      <div class="card-title">Today vs target</div>
      <div class="stat-grid">
        <div class="stat-box"><div class="val">${todayEntry.calories}</div><div class="lbl">Eaten today</div></div>
        <div class="stat-box"><div class="val">${diff >= 0 ? diff : 0}</div><div class="lbl">${diff >= 0 ? 'Remaining' : 'Over target'}</div></div>
      </div>
    `;
    root.appendChild(statusCard);
  }

  // Log list
  const logCard = document.createElement('div');
  logCard.className = 'card';
  logCard.innerHTML = `<div class="card-title">History</div>`;
  if (calorieLog.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-note';
    empty.textContent = 'No entries yet.';
    logCard.appendChild(empty);
  } else {
    [...calorieLog].reverse().forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'log-entry';
      row.innerHTML = `
        <div>
          <div>${entry.calories} kcal</div>
          <div class="date">${entry.date}</div>
        </div>
        <div class="del">✕</div>
      `;
      row.querySelector('.del').onclick = async () => {
        await deleteCalorieEntry(entry.date);
        await loadCalorieLog();
        renderCaloriesView();
      };
      logCard.appendChild(row);
    });
  }
  root.appendChild(logCard);

  document.getElementById('save-profile-btn').onclick = async () => {
    profile.age = document.getElementById('p-age').value;
    profile.sex = document.getElementById('p-sex').value;
    profile.currentWeight = parseFloat(document.getElementById('p-weight').value) || profile.currentWeight;
    profile.height = parseFloat(document.getElementById('p-height').value) || profile.height;
    profile.activity = document.getElementById('p-activity').value;
    await saveProfile();
    renderCaloriesView();
  };

  document.getElementById('log-cal-btn').onclick = async () => {
    const val = parseInt(document.getElementById('cal-input').value, 10);
    if (!val || val <= 0) return;
    if (!currentUserId) { alert("Not connected yet — tap Retry at the top, then try again."); return; }
    const existing = calorieLog.find(e => e.date === today);
    const newTotal = (existing ? existing.calories : 0) + val;
    await addCalorieEntry(today, newTotal);
    await loadCalorieLog();
    renderCaloriesView();
  };
}

/* ============ BACKUP VIEW ============ */
async function renderBackupView() {
  const root = document.getElementById('view-root');
  root.innerHTML = '';

  const statusCard = document.createElement('div');
  statusCard.className = 'card';
  statusCard.innerHTML = `
    <div class="card-title">Connection</div>
    <div class="empty-note" style="text-align:left;">
      ${navigator.onLine ? '🟢 Online' : '🔴 Offline — reconnect before backing up or restoring'}
      ${currentUserId ? '<br>🟢 Connected to database' : '<br>🟠 Not connected — tap Retry on the Workout tab first'}
    </div>
  `;
  root.appendChild(statusCard);

  const exportCard = document.createElement('div');
  exportCard.className = 'card';
  exportCard.innerHTML = `
    <div class="card-title">Export backup</div>
    <div class="empty-note" style="text-align:left; padding:0 0 10px;">Downloads a JSON file with your profile, weight log, and calorie log. Keep it somewhere safe (email it to yourself, save to Drive, etc).</div>
    <button class="btn" id="export-btn">Download backup</button>
  `;
  root.appendChild(exportCard);

  const importCard = document.createElement('div');
  importCard.className = 'card';
  importCard.innerHTML = `
    <div class="card-title">Restore from backup</div>
    <div class="empty-note" style="text-align:left; padding:0 0 10px;">Restoring merges the backup into your current data — entries with the same date get overwritten by the backup's version.</div>
    <input type="file" id="import-file" accept="application/json" style="color:var(--muted); font-size:0.8rem; margin-bottom:10px; width:100%;">
    <button class="btn" id="import-btn">Restore backup</button>
  `;
  root.appendChild(importCard);

  document.getElementById('export-btn').onclick = async () => {
    if (!currentUserId) { alert("Not connected — tap Retry on the Workout tab first."); return; }
    await loadWeightLog();
    await loadCalorieLog();
    await loadProfile();
    const backup = {
      exported_at: new Date().toISOString(),
      profile,
      weight_log: weightLog,
      calorie_log: calorieLog
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fatloss-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  document.getElementById('import-btn').onclick = async () => {
    if (!currentUserId) { alert("Not connected — tap Retry on the Workout tab first."); return; }
    const fileInput = document.getElementById('import-file');
    const file = fileInput.files[0];
    if (!file) { alert('Choose a backup file first.'); return; }
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.weight_log || !backup.calorie_log) {
        alert('This file doesn\'t look like a valid backup.');
        return;
      }
      if (!confirm(`Restore ${backup.weight_log.length} weight entries and ${backup.calorie_log.length} calorie entries? This will overwrite any matching dates.`)) return;

      for (const entry of backup.weight_log) {
        await addWeightEntry(entry.date, entry.weight);
      }
      for (const entry of backup.calorie_log) {
        await addCalorieEntry(entry.date, entry.calories);
      }
      if (backup.profile) {
        profile = { ...profile, ...backup.profile };
        await saveProfile();
      }
      alert('Restore complete!');
      renderBackupView();
    } catch (e) {
      console.error('Restore failed:', e);
      alert('Could not read that file — make sure it\'s a backup exported from this app.');
    }
  };
}

/* ============ INIT ============ */
async function startApp() {
  try {
    authFailed = false;
    await ensureAuth();
    if (currentUserId) {
      await loadProfile();
      await loadGymCheckins();
      await loadFreezeUses();
      await loadExerciseLog();
      await loadWeightLog();
      await applyStreakFreezes();
      computeStreaks();
      await checkFreezeAward();
      computePRFeed();
      computeXP();
    }
    renderMainNav();
    renderView();
    renderStreakWidget();
    renderXPWidget();
    renderVsAverageWidget();
    if (pendingFreezeToast) { celebrateFreezeUsed(); pendingFreezeToast = false; }
    if (authFailed) {
      const banner = document.createElement('div');
      banner.style.cssText = 'background:rgba(255,106,61,0.15);border:1px solid rgba(255,106,61,0.4);color:#ffb08a;border-radius:8px;padding:10px 12px;font-size:0.78rem;margin-bottom:12px;';
      banner.textContent = "Couldn't connect to the database — your entries won't be saved right now. ";
      const retryBtn = document.createElement('button');
      retryBtn.textContent = 'Retry';
      retryBtn.style.cssText = 'background:#ff6a3d;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:0.75rem;font-weight:700;margin-left:6px;cursor:pointer;';
      retryBtn.onclick = () => startApp();
      banner.appendChild(retryBtn);
      const root = document.getElementById('view-root');
      root.parentNode.insertBefore(banner, root);
    }
  } catch (e) {
    console.error('App failed to start:', e);
    const root = document.getElementById('view-root');
    if (root) {
      root.innerHTML = '<div style="padding:20px;color:#ffb08a;">Something went wrong loading the app. Open browser dev tools console for details, or check that Supabase is reachable.</div>';
    }
  }
}
startApp();

/* ============ OFFLINE DETECTION ============ */
window.addEventListener('offline', () => {
  if (document.getElementById('offline-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff6a3d;color:#fff;text-align:center;padding:8px;font-size:0.78rem;font-weight:700;z-index:9999;';
  banner.textContent = "You're offline — entries won't save until you reconnect.";
  document.body.insertBefore(banner, document.body.firstChild);
});
window.addEventListener('online', () => {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.remove();
  startApp();
});
