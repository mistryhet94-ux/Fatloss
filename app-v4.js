/* ============ SUPABASE SETUP ============ */
/* Fill these in from Supabase Dashboard → Settings → API.
   The anon/public key is safe to put here — it only works within
   the Row Level Security rules set up in sb-schema.sql. */
const SUPABASE_URL = 'https://oirjnoacgbhoagmsxabh.sb.co';
const SUPABASE_ANON_KEY = 'sb_publishable_2AyCN-aOE39a06mkV3h9Lg_XPUzp5wC';

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
    day: "Day 1", title: "Push (Chest, Shoulders, Triceps)",
    focus: "Machine chest/shoulder/tricep work + 20 min incline walk",
    exercises: [
      { name: "Chest Press Machine", sets: "3 sets x 12-15 reps" },
      { name: "Incline Chest Press Machine", sets: "3 sets x 12-15 reps" },
      { name: "Shoulder Press Machine", sets: "3 sets x 12-15 reps" },
      { name: "Lateral Raise Machine", sets: "3 sets x 15 reps" },
      { name: "Pec Deck / Chest Fly Machine", sets: "3 sets x 15 reps" },
      { name: "Triceps Pushdown (cable/machine)", sets: "3 sets x 15 reps" },
      { name: "Incline Treadmill Walk", sets: "20 min, moderate pace" }
    ]
  },
  {
    day: "Day 2", title: "Pull (Back, Biceps)",
    focus: "Machine back/bicep work + 20 min incline walk",
    exercises: [
      { name: "Lat Pulldown Machine", sets: "3 sets x 12-15 reps" },
      { name: "Seated Row Machine", sets: "3 sets x 12-15 reps" },
      { name: "Assisted Pull-up Machine (if available)", sets: "3 sets x 10-12 reps" },
      { name: "Rear Delt Fly Machine", sets: "3 sets x 15 reps" },
      { name: "Bicep Curl Machine", sets: "3 sets x 15 reps" },
      { name: "Cable Bicep Curl", sets: "2 sets x 15 reps" },
      { name: "Incline Treadmill Walk", sets: "20 min, moderate pace" }
    ]
  },
  {
    day: "Day 3", title: "Legs + Core",
    focus: "Machine leg work + core + 15 min walk",
    exercises: [
      { name: "Leg Press Machine", sets: "4 sets x 12-15 reps" },
      { name: "Leg Extension Machine", sets: "3 sets x 15 reps" },
      { name: "Leg Curl Machine (hamstrings)", sets: "3 sets x 15 reps" },
      { name: "Hip Abductor/Adductor Machine", sets: "2 sets each x 15 reps" },
      { name: "Standing/Seated Calf Raise Machine", sets: "3 sets x 20 reps" },
      { name: "Cable Crunch or Ab Machine", sets: "3 sets x 15-20 reps" },
      { name: "Incline Treadmill Walk", sets: "15 min, moderate pace" }
    ]
  },
  {
    day: "Day 4", title: "Push (Chest, Shoulders, Triceps) — Volume 2",
    focus: "Repeat push day with slightly different angles + 25 min cardio",
    exercises: [
      { name: "Incline Chest Press Machine", sets: "3 sets x 12-15 reps" },
      { name: "Chest Press Machine", sets: "3 sets x 12-15 reps" },
      { name: "Shoulder Press Machine", sets: "3 sets x 12-15 reps" },
      { name: "Cable Lateral Raise", sets: "3 sets x 15 reps" },
      { name: "Pec Deck / Chest Fly Machine", sets: "3 sets x 15 reps" },
      { name: "Overhead Triceps Extension Machine", sets: "3 sets x 15 reps" },
      { name: "Cardio: Cycle or Treadmill", sets: "25 min, steady pace" }
    ]
  },
  {
    day: "Day 5", title: "Pull (Back, Biceps) — Volume 2",
    focus: "Repeat pull day + 25 min cardio",
    exercises: [
      { name: "Seated Row Machine", sets: "3 sets x 12-15 reps" },
      { name: "Lat Pulldown Machine (wide grip)", sets: "3 sets x 12-15 reps" },
      { name: "Assisted Pull-up Machine (if available)", sets: "3 sets x 10-12 reps" },
      { name: "Rear Delt Fly Machine", sets: "3 sets x 15 reps" },
      { name: "Preacher Curl Machine", sets: "3 sets x 15 reps" },
      { name: "Hammer Curl (dumbbell, light)", sets: "2 sets x 15 reps" },
      { name: "Cardio: Cycle or Treadmill", sets: "25 min, steady pace" }
    ]
  },
  {
    day: "Day 6", title: "Legs + Core + Full Body Cardio",
    focus: "Legs, core, and longer cardio finisher",
    exercises: [
      { name: "Leg Press Machine", sets: "4 sets x 12-15 reps" },
      { name: "Leg Extension Machine", sets: "3 sets x 15 reps" },
      { name: "Leg Curl Machine", sets: "3 sets x 15 reps" },
      { name: "Glute Kickback Machine", sets: "3 sets x 15 reps" },
      { name: "Calf Raise Machine", sets: "3 sets x 20 reps" },
      { name: "Ab/Core Machine", sets: "3 sets x 15-20 reps" },
      { name: "Cardio: Incline Walk or Cycle", sets: "30 min, steady pace" }
    ]
  },
  {
    day: "Cardio", title: "Weekly Cardio Guide",
    focus: "Total weekly cardio target: ~2 hr 15 min - 2 hr 30 min",
    exercises: [
      { name: "Day 1 (Push) — Incline Treadmill Walk", sets: "20 min, moderate pace, HR ~60-70% max" },
      { name: "Day 2 (Pull) — Incline Treadmill Walk", sets: "20 min, moderate pace, HR ~60-70% max" },
      { name: "Day 3 (Legs) — Incline Walk", sets: "15 min, moderate pace" },
      { name: "Day 4 (Push Vol.2) — Cycle or Treadmill", sets: "25 min, steady pace" },
      { name: "Day 5 (Pull Vol.2) — Cycle or Treadmill", sets: "25 min, steady pace" },
      { name: "Day 6 (Legs) — Incline Walk or Cycle", sets: "30 min, steady pace" },
      { name: "Rest Day (optional) — Light walk outdoors", sets: "20-30 min, easy pace, purely for recovery" }
    ]
  }
];

let currentView = 'workout'; // 'workout' | 'weight' | 'calories'
let currentDay = 0;
const dayState = {}; // dayIndex -> Set of checked exercise indices

function loadDayState(day) {
  if (!dayState[day]) dayState[day] = new Set();
  return dayState[day];
}

/* ============ MAIN NAV ============ */
function renderMainNav() {
  const nav = document.getElementById('main-nav');
  nav.innerHTML = '';
  const views = [
    { id: 'workout', label: 'Workout' },
    { id: 'weight', label: 'Weight Log' },
    { id: 'calories', label: 'Calories' }
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
}

/* ============ WORKOUT VIEW ============ */
function renderWorkoutView() {
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
      if (cb.checked) checked.add(i); else checked.delete(i);
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

/* ============ PROFILE (for calorie calc) ============ */
let profile = { age: '', sex: 'male', activity: '1.375', currentWeight: 75, height: 176 };

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
      activity: String(data.activity ?? 1.375)
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
  entryCard.innerHTML = `
    <div class="card-title">Log today's weight</div>
    <div class="field-row">
      <div class="field">
        <label>Weight (kg)</label>
        <input type="number" step="0.1" id="weight-input" placeholder="e.g. 74.5" value="${profile.currentWeight || ''}">
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
    const today = new Date().toISOString().slice(0, 10);
    await addWeightEntry(today, val);
    profile.currentWeight = val;
    await saveProfile();
    await loadWeightLog();
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
    <div class="card-title">Log today's calories eaten</div>
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
    await addCalorieEntry(today, val);
    await loadCalorieLog();
    renderCaloriesView();
  };
}

/* ============ INIT ============ */
async function startApp() {
  try {
    authFailed = false;
    await ensureAuth();
    if (currentUserId) {
      await loadProfile();
    }
    renderMainNav();
    renderView();
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
