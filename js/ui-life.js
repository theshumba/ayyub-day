// Life tab — Faith, Marriage & family, and Business ops.
import { state, save } from './store.js';
import { el, clear, todayKey, uid, daysUntilAnnual, activeDate } from './util.js';

const CONTENT_STAGES = ['filmed', 'edited', 'posted'];
const DEAL_STAGES = ['lead', 'toCollect', 'collected', 'listed', 'sold'];

export function renderLife(root) {
  clear(root);
  root.append(faithSection(root));
  root.append(marriageSection(root));
  root.append(opsSection(root));
}

// ---------- FAITH ----------
function prayerStreak() {
  const m = state.priv.faith.prayerOnTime; const d = activeDate();
  if (!m[todayKey(d)]) d.setDate(d.getDate() - 1);
  let s = 0; for (;;) { const k = todayKey(d); if (m[k]) { s++; d.setDate(d.getDate() - 1); } else break; }
  return s;
}

function faithSection(root) {
  const f = state.priv.faith;
  const d = activeDate();
  const k = todayKey(d);
  const dow = d.getDay();
  const card = el('div.card', {}, [
    el('h2', {}, '🕌 Faith'),
    el('p.streak', {}, `🔥 Prayed-on-time streak: ${prayerStreak()} day${prayerStreak() === 1 ? '' : 's'}`),
    toggle('Prayed all 5 on time today', !!f.prayerOnTime[k], () => { f.prayerOnTime[k] = !f.prayerOnTime[k]; save(); renderLife(root); }),
    toggle('Qur’an / dhikr today', !!f.quran[k], () => { f.quran[k] = !f.quran[k]; save(); renderLife(root); }),
  ]);
  if (dow === 5) card.append(toggle('📖 Surah Al-Kahf (Friday)', !!f.kahf[k], () => { f.kahf[k] = !f.kahf[k]; save(); renderLife(root); }));
  if (dow === 1) card.append(toggle('🌙 Sunnah fast (Monday) — also great for the 75kg goal', !!f.mondayFast[k], () => { f.mondayFast[k] = !f.mondayFast[k]; save(); renderLife(root); }));
  return card;
}

// ---------- MARRIAGE & FAMILY ----------
function marriageSection(root) {
  const ideaInput = el('input.note-input', { placeholder: 'add a date-night spot' });
  const addIdea = () => { if (ideaInput.value.trim()) { state.priv.ideas.push(ideaInput.value.trim()); save(); renderLife(root); } };
  ideaInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addIdea(); });

  const dateLabel = el('input.note-input', { placeholder: 'occasion (e.g. Anniversary)' });
  const dateWhen = el('input.note-input', { type: 'date' });
  const addDate = () => {
    if (!dateLabel.value || !dateWhen.value) return;
    const mmdd = dateWhen.value.slice(5);
    state.priv.keyDates.push({ id: uid(), label: dateLabel.value, date: mmdd });
    save(); renderLife(root);
  };

  return el('div.card', {}, [
    el('h2', {}, '❤️ Marriage & family'),
    el('h4', {}, 'Date-night ideas'),
    el('div.chips', {}, state.priv.ideas.map((t, i) =>
      el('span.chip', {}, [t, el('button.chip-x', { onclick: () => { state.priv.ideas.splice(i, 1); save(); renderLife(root); } }, '×')]))),
    el('div.row', {}, [ideaInput, el('button.btn.mini', { onclick: addIdea }, 'Add')]),
    el('h4', {}, 'Key dates'),
    ...state.priv.keyDates.map((kd) =>
      el('div.keydate', {}, [
        el('span', {}, `${kd.label} — in ${daysUntilAnnual(kd.date)} day(s)`),
        el('button.chip-x', { onclick: () => { state.priv.keyDates = state.priv.keyDates.filter((x) => x.id !== kd.id); save(); renderLife(root); } }, '×'),
      ])),
    el('div.row', {}, [dateLabel, dateWhen, el('button.btn.mini', { onclick: addDate }, 'Add')]),
  ]);
}

// ---------- BUSINESS OPS ----------
function opsSection(root) {
  const cIdea = el('input.note-input', { placeholder: 'video idea' });
  const cBiz = el('select.note-input', {}, [el('option', {}, 'Barber'), el('option', {}, 'CFY')]);
  const addContent = () => {
    if (!cIdea.value.trim()) return;
    state.priv.content.push({ id: uid(), business: cBiz.value, idea: cIdea.value.trim(), status: 'filmed' });
    save(); renderLife(root);
  };

  const dItem = el('input.note-input', { placeholder: 'console / deal (no prices)' });
  const addDeal = () => {
    if (!dItem.value.trim()) return;
    state.priv.deals.push({ id: uid(), item: dItem.value.trim(), stage: 'lead' });
    save(); renderLife(root);
  };

  return el('div.card', {}, [
    el('h2', {}, '🎬 Business ops'),
    el('h4', {}, 'Content ideas bank'),
    ...state.priv.content.map((c) =>
      el('div.ops-item', {}, [
        el('span', {}, `${c.business}: ${c.idea}`),
        el('button.stage-btn', { onclick: () => { c.status = CONTENT_STAGES[(CONTENT_STAGES.indexOf(c.status) + 1) % CONTENT_STAGES.length]; save(); renderLife(root); } }, c.status),
        el('button.chip-x', { onclick: () => { state.priv.content = state.priv.content.filter((x) => x.id !== c.id); save(); renderLife(root); } }, '×'),
      ])),
    el('div.row', {}, [cBiz, cIdea, el('button.btn.mini', { onclick: addContent }, 'Add')]),
    el('h4', {}, 'CFY deal pipeline'),
    ...state.priv.deals.map((d) =>
      el('div.ops-item', {}, [
        el('span', {}, d.item),
        el('button.stage-btn', { onclick: () => { d.stage = DEAL_STAGES[(DEAL_STAGES.indexOf(d.stage) + 1) % DEAL_STAGES.length]; save(); renderLife(root); } }, d.stage),
        el('button.chip-x', { onclick: () => { state.priv.deals = state.priv.deals.filter((x) => x.id !== d.id); save(); renderLife(root); } }, '×'),
      ])),
    el('div.row', {}, [dItem, el('button.btn.mini', { onclick: addDeal }, 'Add')]),
  ]);
}

function toggle(label, on, onclick) {
  return el('div.quota', {}, [el('span.quota-label', {}, label), el('button.box' + (on ? '.on' : ''), { onclick }, on ? '✓' : '')]);
}
