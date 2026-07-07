// Data layer. Abstracts persistence behind one interface with two backends:
//   • Firebase (real login + realtime wife-sync) once config.js is filled in
//   • localStorage "demo mode" so the app works instantly with zero setup
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
  role: 'owner', user: null, hid: null, household: null,
  priv: defaultPriv(), shared: null, prayers: null, date: new Date(),
  demo: !FIREBASE_READY, ready: false, error: '',
};

let fb = null;
let saveTimer = null;
const listeners = new Set();
export const onChange = (cb) => { listeners.add(cb); return () => listeners.delete(cb); };
const emit = () => listeners.forEach((cb) => cb());

// ---- localStorage demo backend --------------------------------------------
const LS = {
  privKey: 'ayyub:priv',
  sharedKey: 'ayyub:shared',
  loadPriv: () => JSON.parse(localStorage.getItem(LS.privKey) || 'null'),
  savePriv: (p) => localStorage.setItem(LS.privKey, JSON.stringify(p)),
  loadShared: () => JSON.parse(localStorage.getItem(LS.sharedKey) || 'null'),
  saveShared: (s) => localStorage.setItem(LS.sharedKey, JSON.stringify(s)),
};

// ---- auth ------------------------------------------------------------------
export async function initAuth(onUser) {
  if (state.demo) {
    state.user = { uid: 'demo-user', email: 'demo (no login)' };
    onUser(state.user);
    return;
  }
  fb = (await import('./firebase.js')).fb;
  fb.onAuth((u) => { state.user = u; onUser(u); });
}
export async function signIn(email, pw) { if (!state.demo) return fb.signIn(email, pw); }
export async function signUp(email, pw) { if (!state.demo) return fb.signUp(email, pw); }
export async function signOutUser() { if (!state.demo) return fb.signOut(); }
export const myUid = () => state.user?.uid;

// ---- owner data ------------------------------------------------------------
export async function loadOwner(date) {
  state.role = 'owner';
  state.hid = state.demo ? 'demo-user' : state.user.uid;
  if (state.demo) {
    state.priv = { ...defaultPriv(), ...(LS.loadPriv() || {}) };
  } else {
    const hhRef = fb.ownerDoc(state.hid);
    const hh = await fb.getDoc(hhRef);
    if (!hh.exists()) await fb.setDoc(hhRef, { ownerUid: state.hid, wifeUid: '', whyLine: WHY_DEFAULT, config: CONFIG });
    state.household = (await fb.getDoc(hhRef)).data();
    const snap = await fb.getDoc(fb.privateDoc(state.hid));
    state.priv = snap.exists() ? { ...defaultPriv(), ...snap.data() } : defaultPriv();
  }
  ensureWeek(date);
  state.ready = true;
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (state.demo) LS.savePriv(state.priv);
    else fb.setDoc(fb.privateDoc(state.hid), state.priv).catch((e) => (state.error = e.message));
  }, 250);
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

// ---- shared status (owner writes, wife reads) ------------------------------
export function writeShared(patch) {
  const next = { ...(state.shared || {}), ...patch, updatedAt: Date.now() };
  state.shared = next;
  if (state.demo) LS.saveShared(next);
  else fb.setDoc(fb.sharedDoc(state.hid), next).catch((e) => (state.error = e.message));
}
export async function linkWife(wifeUid) {
  if (state.demo) return;
  await fb.setDoc(fb.ownerDoc(state.hid), { wifeUid });
  state.household.wifeUid = wifeUid;
}

// ---- wife view -------------------------------------------------------------
export async function loadWife(onShared) {
  state.role = 'wife';
  if (state.demo) {
    const tick = () => onShared(LS.loadShared());
    tick();
    window.addEventListener('storage', (e) => { if (e.key === LS.sharedKey) tick(); });
    setInterval(tick, 4000);
    return { linked: true };
  }
  const hh = await fb.findWifeHousehold(state.user.uid);
  if (!hh) return { linked: false };
  state.hid = hh.id;
  fb.watch(fb.sharedDoc(hh.id), onShared);
  return { linked: true };
}
