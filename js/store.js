// Data layer — no accounts, no passwords, no emails.
//   • Ayyub's private data lives only on his device (localStorage). Never uploaded.
//   • Only his reassurance status syncs, under a random unguessable household id.
//   • His wife pairs once via a share link (…/wife.html#h=<id>) — then reads that status.
import { CONFIG, FIREBASE_READY, WHY_DEFAULT } from './config.js';
import { isoWeekKey } from './engine.js';

export function defaultPriv() {
  return {
    pinHash: null,
    whyLine: WHY_DEFAULT,
    savings: { balance: 0, goalAmount: 0, goalLabel: '', deposits: [] },
    weight: { startKg: 86, goalKg: 75, logs: [] },
    week: emptyWeek(''),
    streaks: { prayerOnTime: 0, gym: 0, weeklyGoals: 0, lastPrayerDate: '' },
    faith: { quran: {}, kahf: {}, mondayFast: {}, prayerOnTime: {} },
    content: [], deals: [], reviews: [], keyDates: [], ideas: [],
    ticks: {},
    health: { nutrition: {}, water: {}, steps: {}, waterTarget: 2000, stepTarget: 8000, proteinTarget: 150 },
    trips: {},
  };
}
const emptyWeek = (key) => ({
  isoWeek: key, barber: [false, false, false], cfy: [false, false, false, false],
  taxi: [false], gym: [false, false, false, false], dateNight: false, dateNote: '',
});

export const state = {
  role: 'owner', priv: defaultPriv(), shared: null, hid: null,
  prayers: null, prayersDate: null, date: new Date(),
  cloud: FIREBASE_READY, ready: false, error: '',
};

let fb = null;
let saveTimer = null;
const listeners = new Set();
export const onChange = (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
const emit = () => listeners.forEach((cb) => cb());
const useCloud = () => FIREBASE_READY && !globalThis.__SMOKE__;

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'h' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function ownerHid() {
  let h = localStorage.getItem('ayyub:hid');
  if (!h) { h = newId(); localStorage.setItem('ayyub:hid', h); }
  return h;
}

// ---- owner ----
export async function initOwner(date) {
  state.role = 'owner';
  state.hid = ownerHid();
  state.priv = { ...defaultPriv(), ...(JSON.parse(localStorage.getItem('ayyub:priv') || 'null') || {}) };
  // Load Firebase in the background — the app is fully usable offline (private data is
  // local); the cloud is only for pushing the shared status. Sync the latest once ready.
  if (useCloud()) {
    import('./firebase.js')
      .then((m) => { fb = m.fb; if (state.shared) fb.setShared(state.hid, state.shared).catch(() => {}); })
      .catch((e) => { state.error = e.message; });
  }
  ensureWeek(date);
  state.ready = true;
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => localStorage.setItem('ayyub:priv', JSON.stringify(state.priv)), 250);
  emit();
}

export function ensureWeek(date) {
  const key = isoWeekKey(date);
  const w = state.priv.week;
  if (w.isoWeek === key) return;
  if (w.isoWeek) {
    const gymCount = w.gym.filter(Boolean).length;
    const hit = w.barber.every(Boolean) && w.cfy.every(Boolean) && w.taxi.every(Boolean) && gymCount >= 3 && w.dateNight;
    state.priv.streaks.weeklyGoals = hit ? (state.priv.streaks.weeklyGoals || 0) + 1 : 0;
  }
  state.priv.week = emptyWeek(key);
  save();
}

export function writeShared(patch) {
  const next = { ...(state.shared || {}), ...patch, updatedAt: Date.now() };
  state.shared = next;
  localStorage.setItem('ayyub:shared', JSON.stringify(next));
  if (useCloud() && fb) fb.setShared(state.hid, next).catch((e) => { state.error = e.message; });
}

export function shareLink() {
  const url = new URL('wife.html', location.href);
  url.hash = 'h=' + state.hid;
  return url.href;
}

// Back up / restore the on-device private data (JSON).
export function exportData() { return JSON.stringify(state.priv, null, 2); }
export function importData(json) {
  const data = JSON.parse(json);
  state.priv = { ...defaultPriv(), ...data };
  localStorage.setItem('ayyub:priv', JSON.stringify(state.priv));
}

// ---- wife ----
export async function initWife(onShared) {
  state.role = 'wife';
  let hid = null;
  const m = location.hash.match(/h=([^&]+)/);
  if (m) {
    hid = decodeURIComponent(m[1]);
    localStorage.setItem('ayyub:wife-hid', hid);
    history.replaceState(null, '', location.pathname + location.search);
  } else {
    hid = localStorage.getItem('ayyub:wife-hid');
  }
  state.hid = hid;
  if (!hid) return { paired: false };

  if (useCloud()) {
    try { fb = (await import('./firebase.js')).fb; fb.watchShared(hid, onShared); }
    catch (e) { state.error = e.message; localWifeFallback(onShared); }
  } else {
    localWifeFallback(onShared);
  }
  return { paired: true };
}

function localWifeFallback(onShared) {
  const tick = () => onShared(JSON.parse(localStorage.getItem('ayyub:shared') || 'null'));
  tick();
  window.addEventListener('storage', (e) => { if (e.key === 'ayyub:shared') tick(); });
  setInterval(tick, 4000);
}

// Accept a pasted share link or a raw id.
export function pairWife(input) {
  let hid = (input || '').trim();
  const m = hid.match(/h=([^&\s]+)/);
  if (m) hid = decodeURIComponent(m[1]);
  if (!hid) return false;
  localStorage.setItem('ayyub:wife-hid', hid);
  location.reload();
  return true;
}
