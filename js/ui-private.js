// Health + Money — behind the PIN. No income fields.
import { state, save } from './store.js';
import { pinGate } from './pin.js';
import { el, clear, todayKey } from './util.js';
import { icon, svg, bead, sectionTitle } from './ui-kit.js';

export function renderHealth(root) { clear(root); pinGate(root, () => drawHealth(root)); }
export function renderMoney(root) { clear(root); pinGate(root, () => drawMoney(root)); }

// ---------- HEALTH ----------
function drawHealth(root) {
  clear(root);
  const wt = state.priv.weight;
  const current = wt.logs.length ? wt.logs[wt.logs.length - 1].kg : wt.startKg;
  const lost = Math.max(0, wt.startKg - current);
  const toGo = Math.max(0, current - wt.goalKg);
  const pct = Math.min(100, Math.round((lost / (wt.startKg - wt.goalKg)) * 100));

  const input = el('input.input', { type: 'number', step: '0.1', inputmode: 'decimal', placeholder: 'weight in kg' });
  const logBtn = el('button.btn.mini', { onclick: () => { const kg = parseFloat(input.value); if (!kg) return; wt.logs.push({ date: todayKey(), kg }); save(); drawHealth(root); } }, 'Log');

  root.append(el('div.card', {}, [
    sectionTitle('gauge', 'Weight'),
    el('div.figure', {}, [el('b tnum', {}, `${current}`), el('span.goal', {}, `kg  ·  goal ${wt.goalKg}`)]),
    el('div.bar', {}, [el('div.bar-fill green', { style: `width:${pct}%` })]),
    el('p.pace', {}, paceMessage(wt, current, toGo)),
    el('div.row', {}, [input, logBtn]),
    trendList(wt.logs),
  ]));
  root.append(gymCard(root));
  root.append(dailyCard(root));
}

function paceMessage(wt, current, toGo) {
  if (toGo <= 0) return `You’ve reached ${wt.goalKg} kg — maintain gently. Alhamdulillah.`;
  if (wt.logs.length < 2) return `Healthy pace is ~0.5 kg/week — about ${Math.ceil((wt.startKg - wt.goalKg) / 0.5)} weeks. No deadline: slow and steady.`;
  const weeks = Math.max(1, (Date.now() - new Date(wt.logs[0].date).getTime()) / (7 * 864e5));
  const expected = wt.startKg - 0.5 * weeks;
  return current <= expected + 0.3 ? 'On (or ahead of) a healthy ~0.5 kg/week pace. Keep going.' : 'A touch behind the gentle 0.5 kg/week line — no rush, health first.';
}

function trendList(logs) {
  if (!logs.length) return el('p.hint', {}, 'Log your weight to see the trend.');
  return el('div.trend', {}, logs.slice(-6).map((l) => el('span.trend-item', {}, [el('b tnum', {}, `${l.kg}`), ' ', el('small', {}, l.date.slice(5))])));
}

function gymCard(root) {
  const w = state.priv.week;
  const count = w.gym.filter(Boolean).length;
  return el('div.card', {}, [
    sectionTitle('dumbbell', 'Gym this week'),
    el('div.figure', {}, [el('b', {}, `${count}`), el('span.goal', {}, `of 3 minimum${count >= 4 ? '  ·  bonus!' : ''}`)]),
    el('button.btn', { onclick: () => { const i = w.gym.findIndex((v) => !v); if (i >= 0) { w.gym[i] = true; save(); drawHealth(root); } } }, 'Log a session'),
  ]);
}

function dailyCard(root) {
  const h = state.priv.health; const k = todayKey();
  const water = h.water[k] || 0;
  const steps = el('input.input', { type: 'number', inputmode: 'numeric', placeholder: `target ${h.stepTarget}`, value: h.steps[k] || '' });
  steps.addEventListener('change', () => { h.steps[k] = parseInt(steps.value, 10) || 0; save(); });
  return el('div.card', {}, [
    sectionTitle('pulse', 'Today'),
    el('div.li-row', {}, [
      el('span.q-ic', { html: svg('heart', 18) }),
      el('span.grow', {}, ['Ate on-plan', el('div.sub', {}, `protein target ~${h.proteinTarget}g`)]),
      bead(!!h.nutrition[k], () => { h.nutrition[k] = !h.nutrition[k]; save(); drawHealth(root); }),
    ]),
    el('div.li-row', {}, [
      el('span.q-ic', { html: svg('drop', 18) }),
      el('span.grow', {}, [`Water`, el('div.sub tnum', {}, `${water} / ${h.waterTarget} ml`)]),
      el('button.btn.mini', { onclick: () => { h.water[k] = (h.water[k] || 0) + 250; save(); drawHealth(root); } }, '+250'),
    ]),
    el('div.li-row', {}, [
      el('span.q-ic', { html: svg('steps', 18) }),
      el('span.grow', {}, 'Steps'),
      steps,
    ]),
  ]);
}

// ---------- MONEY ----------
function drawMoney(root) {
  clear(root);
  const s = state.priv.savings;
  const pct = s.goalAmount > 0 ? Math.min(100, Math.round((s.balance / s.goalAmount) * 100)) : 0;
  const zakat = (s.balance * 0.025).toFixed(2);

  const amt = el('input.input', { type: 'number', inputmode: 'decimal', placeholder: '£ amount' });
  const addBtn = el('button.btn.mini', { onclick: () => { const v = parseFloat(amt.value); if (!v) return; s.balance = +(s.balance + v).toFixed(2); s.deposits.push({ date: todayKey(), amount: v }); save(); drawMoney(root); } }, 'Add');

  const goalAmt = el('input.input', { type: 'number', placeholder: 'goal £', value: s.goalAmount || '' });
  const goalLbl = el('input.input', { placeholder: 'what for? (e.g. Umrah)', value: s.goalLabel || '' });
  goalAmt.addEventListener('change', () => { s.goalAmount = parseFloat(goalAmt.value) || 0; save(); drawMoney(root); });
  goalLbl.addEventListener('input', () => { s.goalLabel = goalLbl.value; save(); });

  root.append(el('div.card', {}, [
    sectionTitle('wallet', 'Savings', 'gold'),
    el('div.figure', {}, [el('b tnum', {}, `£${s.balance.toFixed(2)}`), s.goalLabel ? el('span.goal', {}, s.goalLabel) : null]),
    s.goalAmount > 0 ? el('div.bar', {}, [el('div.bar-fill gold', { style: `width:${pct}%` })]) : null,
    s.goalAmount > 0 ? el('p.pct tnum', {}, `${pct}% toward £${s.goalAmount}`) : null,
    el('div.row', {}, [amt, addBtn]),
    el('div.goal-set', {}, [goalAmt, goalLbl]),
    el('div.zakat', {}, [icon('dome', 16), el('span', {}, `Zakat: 2.5% of your savings ≈ £${zakat} (check once a lunar year).`)]),
    el('p.big-note', {}, 'Savings only — this never asks what the businesses earn.'),
  ]));
}
