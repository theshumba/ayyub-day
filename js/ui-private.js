// Health + Money tabs — both behind the PIN. No income fields anywhere.
import { state, save } from './store.js';
import { pinGate } from './pin.js';
import { el, clear, todayKey } from './util.js';

export function renderHealth(root) { clear(root); pinGate(root, () => drawHealth(root)); }
export function renderMoney(root) { clear(root); pinGate(root, () => drawMoney(root)); }

// ---------- HEALTH ----------
function drawHealth(root) {
  clear(root);
  const wt = state.priv.weight;
  const last = wt.logs[wt.logs.length - 1];
  const current = last ? last.kg : wt.startKg;
  const lost = Math.max(0, wt.startKg - current);
  const toGo = Math.max(0, current - wt.goalKg);
  const pct = Math.min(100, Math.round((lost / (wt.startKg - wt.goalKg)) * 100));

  const input = el('input.kg-input', { type: 'number', step: '0.1', inputmode: 'decimal', placeholder: 'kg' });
  const logBtn = el('button.btn', {
    onclick: () => {
      const kg = parseFloat(input.value);
      if (!kg) return;
      wt.logs.push({ date: todayKey(), kg });
      save(); drawHealth(root);
    },
  }, 'Log weight');

  root.append(el('div.card', {}, [
    el('h2', {}, '⚖️ Weight'),
    el('div.weight-now', {}, [el('span.big', {}, `${current} kg`), el('span.goal', {}, `goal ${wt.goalKg} kg`)]),
    el('div.bar', {}, [el('div.bar-fill.green', { style: `width:${pct}%` })]),
    el('p.pace', {}, paceMessage(wt, current, toGo)),
    el('div.row', {}, [input, logBtn]),
    trendList(wt.logs),
  ]));

  root.append(gymCard(root));
  root.append(dailyHealthCard(root));
}

function paceMessage(wt, current, toGo) {
  if (toGo <= 0) return `🎉 You've reached ${wt.goalKg} kg — maintain gently.`;
  if (wt.logs.length < 2) return `Healthy pace is ~0.5 kg/week — that's ${wt.goalKg} kg in roughly ${Math.ceil((wt.startKg - wt.goalKg) / 0.5)} weeks. No deadline: slow and steady wins.`;
  const first = wt.logs[0];
  const weeks = Math.max(1, (Date.now() - new Date(first.date).getTime()) / (7 * 864e5));
  const expected = wt.startKg - 0.5 * weeks;
  if (current <= expected + 0.3) return '✅ On (or ahead of) a healthy ~0.5 kg/week pace. Keep going.';
  return '🌱 A touch behind the gentle 0.5 kg/week line — no rush, health first.';
}

function trendList(logs) {
  if (!logs.length) return el('p.hint', {}, 'Log your weight to see the trend.');
  const recent = logs.slice(-6);
  return el('div.trend', {}, recent.map((l) => el('span.trend-item', {}, [el('b', {}, `${l.kg}`), ' ', el('small', {}, l.date.slice(5))])));
}

function gymCard(root) {
  const w = state.priv.week;
  const count = w.gym.filter(Boolean).length;
  return el('div.card', {}, [
    el('h3', {}, '🏋️ Gym this week'),
    el('p', {}, `${count} / 3 minimum${count >= 4 ? ' · bonus done!' : ''}`),
    el('button.btn', {
      onclick: () => { const i = w.gym.findIndex((v) => !v); if (i >= 0) { w.gym[i] = true; save(); drawHealth(root); } },
    }, 'Log a gym session'),
  ]);
}

function dailyHealthCard(root) {
  const h = state.priv.health;
  const k = todayKey();
  const water = h.water[k] || 0;
  return el('div.card', {}, [
    el('h3', {}, 'Today'),
    toggleRow('🍽️ Ate on-plan', !!h.nutrition[k], () => { h.nutrition[k] = !h.nutrition[k]; save(); drawHealth(root); },
      `protein target ~${h.proteinTarget}g`),
    el('div.quota', {}, [
      el('span.quota-label', {}, `💧 Water ${water}/${h.waterTarget} ml`),
      el('button.btn.mini', { onclick: () => { h.water[k] = (h.water[k] || 0) + 250; save(); drawHealth(root); } }, '+250'),
    ]),
    el('div.quota', {}, [
      el('span.quota-label', {}, `👟 Steps (target ${h.stepTarget})`),
      stepInput(h, k),
    ]),
  ]);
}

function stepInput(h, k) {
  const input = el('input.note-input', { type: 'number', inputmode: 'numeric', placeholder: 'steps', value: h.steps[k] || '' });
  input.addEventListener('change', () => { h.steps[k] = parseInt(input.value, 10) || 0; save(); });
  return input;
}

function toggleRow(label, on, onclick, sub) {
  return el('div.quota', {}, [
    el('span.quota-label', {}, [label, sub ? el('small.sub', {}, ` · ${sub}`) : null]),
    el('button.box' + (on ? '.on' : ''), { onclick }, on ? '✓' : ''),
  ]);
}

// ---------- MONEY ----------
function drawMoney(root) {
  clear(root);
  const s = state.priv.savings;
  const pct = s.goalAmount > 0 ? Math.min(100, Math.round((s.balance / s.goalAmount) * 100)) : 0;
  const zakat = (s.balance * 0.025).toFixed(2);

  const amt = el('input.kg-input', { type: 'number', inputmode: 'decimal', placeholder: '£ amount' });
  const addBtn = el('button.btn', {
    onclick: () => {
      const v = parseFloat(amt.value); if (!v) return;
      s.balance = +(s.balance + v).toFixed(2);
      s.deposits.push({ date: todayKey(), amount: v });
      save(); drawMoney(root);
    },
  }, 'Add to savings');

  const goalAmt = el('input.note-input', { type: 'number', placeholder: 'goal £', value: s.goalAmount || '' });
  const goalLbl = el('input.note-input', { placeholder: 'what for? (e.g. Umrah)', value: s.goalLabel || '' });
  goalAmt.addEventListener('change', () => { s.goalAmount = parseFloat(goalAmt.value) || 0; save(); drawMoney(root); });
  goalLbl.addEventListener('input', () => { s.goalLabel = goalLbl.value; save(); });

  root.append(el('div.card', {}, [
    el('h2', {}, '💷 Savings'),
    el('div.weight-now', {}, [el('span.big', {}, `£${s.balance.toFixed(2)}`), s.goalLabel ? el('span.goal', {}, s.goalLabel) : null]),
    s.goalAmount > 0 ? el('div.bar', {}, [el('div.bar-fill.gold', { style: `width:${pct}%` })]) : null,
    s.goalAmount > 0 ? el('p.pct', {}, `${pct}% toward £${s.goalAmount}`) : null,
    el('div.row', {}, [amt, addBtn]),
    el('div.goal-set', {}, [el('span', {}, 'Goal:'), goalAmt, goalLbl]),
    el('p.zakat', {}, `🕋 Zakat reminder: 2.5% of your savings ≈ £${zakat} (check once a lunar year).`),
    el('p.hint', {}, 'Savings only — this never asks what the businesses earn.'),
  ]));
}
