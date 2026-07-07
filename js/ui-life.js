// Life — Faith, Marriage & family, Business ops.
import { state, save } from './store.js';
import { el, clear, todayKey, uid, daysUntilAnnual, activeDate } from './util.js';
import { icon, svg, bead, sectionTitle } from './ui-kit.js';

const CONTENT_STAGES = ['filmed', 'edited', 'posted'];
const DEAL_STAGES = ['lead', 'to collect', 'collected', 'listed', 'sold'];

export function renderLife(root) {
  clear(root);
  root.append(faithCard(root));
  root.append(marriageCard(root));
  root.append(opsCard(root));
}

function toggleRow(ic, label, on, onclick, sub) {
  return el('div.li-row', {}, [
    el('span.q-ic', { html: svg(ic, 18) }),
    el('span.grow', {}, [label, sub ? el('div.sub', {}, sub) : null]),
    bead(on, onclick),
  ]);
}

// ---------- FAITH ----------
function prayerStreak() {
  const m = state.priv.faith.prayerOnTime; const d = activeDate();
  if (!m[todayKey(d)]) d.setDate(d.getDate() - 1);
  let s = 0; for (;;) { const k = todayKey(d); if (m[k]) { s++; d.setDate(d.getDate() - 1); } else break; }
  return s;
}

function faithCard(root) {
  const f = state.priv.faith;
  const d = activeDate(); const k = todayKey(d); const dow = d.getDay();
  const streak = prayerStreak();
  const card = el('div.card', {}, [
    sectionTitle('moon', 'Faith', 'gold'),
    el('div', { style: 'margin-bottom:6px' }, el('span.streak-chip', {}, [icon('flame', 15), `${streak} day${streak === 1 ? '' : 's'} on time`])),
    toggleRow('dome', 'Prayed all 5 on time', !!f.prayerOnTime[k], () => { f.prayerOnTime[k] = !f.prayerOnTime[k]; save(); renderLife(root); }),
    toggleRow('book', 'Qur’an / dhikr', !!f.quran[k], () => { f.quran[k] = !f.quran[k]; save(); renderLife(root); }),
  ]);
  if (dow === 5) card.append(toggleRow('book', 'Surah Al-Kahf', !!f.kahf[k], () => { f.kahf[k] = !f.kahf[k]; save(); renderLife(root); }, 'Friday sunnah'));
  if (dow === 1) card.append(toggleRow('moon', 'Sunnah fast', !!f.mondayFast[k], () => { f.mondayFast[k] = !f.mondayFast[k]; save(); renderLife(root); }, 'Monday — also helps the 75kg goal'));
  return card;
}

// ---------- MARRIAGE ----------
function marriageCard(root) {
  const ideaInput = el('input.input', { placeholder: 'add a date-night spot' });
  const addIdea = () => { const v = ideaInput.value.trim(); if (v) { state.priv.ideas.push(v); save(); renderLife(root); } };
  ideaInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addIdea(); });

  const dLabel = el('input.input', { placeholder: 'occasion' });
  const dWhen = el('input.input', { type: 'date' });
  const addDate = () => {
    if (!dLabel.value || !dWhen.value) return;
    state.priv.keyDates.push({ id: uid(), label: dLabel.value, date: dWhen.value.slice(5) });
    save(); renderLife(root);
  };

  return el('div.card', {}, [
    sectionTitle('heart', 'Marriage & family'),
    el('h4.mini-h', {}, 'Date-night ideas'),
    el('div.chips', {}, state.priv.ideas.length ? state.priv.ideas.map((t, i) =>
      el('span.chip-tag', {}, [t, el('button.chip-x', { html: svg('close', 14), onclick: () => { state.priv.ideas.splice(i, 1); save(); renderLife(root); } })]))
      : [el('span.hint', {}, 'Add a few go-to spots so choosing is easy.')]),
    el('div.row', {}, [ideaInput, el('button.btn.mini', { html: svg('plus', 18), onclick: addIdea })]),
    el('h4.mini-h', {}, 'Key dates'),
    ...state.priv.keyDates.map((kd) => el('div.li-row', {}, [
      el('span.q-ic', { html: svg('calendar', 18) }),
      el('span.grow', {}, [kd.label, el('div.sub', {}, `in ${daysUntilAnnual(kd.date)} day(s)`)]),
      el('button.chip-x', { html: svg('close', 16), onclick: () => { state.priv.keyDates = state.priv.keyDates.filter((x) => x.id !== kd.id); save(); renderLife(root); } }),
    ])),
    el('div.row', {}, [dLabel, dWhen, el('button.btn.mini', { html: svg('plus', 18), onclick: addDate })]),
  ]);
}

// ---------- OPS ----------
function opsCard(root) {
  const cIdea = el('input.input', { placeholder: 'video idea' });
  const cBiz = el('select.input', {}, [el('option', {}, 'Barber'), el('option', {}, 'CFY')]);
  const addContent = () => { const v = cIdea.value.trim(); if (!v) return; state.priv.content.push({ id: uid(), business: cBiz.value, idea: v, status: 'filmed' }); save(); renderLife(root); };

  const dItem = el('input.input', { placeholder: 'console / deal (no prices)' });
  const addDeal = () => { const v = dItem.value.trim(); if (!v) return; state.priv.deals.push({ id: uid(), item: v, stage: 'lead' }); save(); renderLife(root); };

  return el('div.card', {}, [
    sectionTitle('film', 'Business ops'),
    el('h4.mini-h', {}, 'Content ideas'),
    ...state.priv.content.map((c) => el('div.li-row', {}, [
      el('span.grow', {}, `${c.business}: ${c.idea}`),
      el('button.stage-btn', { onclick: () => { c.status = CONTENT_STAGES[(CONTENT_STAGES.indexOf(c.status) + 1) % CONTENT_STAGES.length]; save(); renderLife(root); } }, c.status),
      el('button.chip-x', { html: svg('close', 16), onclick: () => { state.priv.content = state.priv.content.filter((x) => x.id !== c.id); save(); renderLife(root); } }),
    ])),
    el('div.row', {}, [cBiz, cIdea, el('button.btn.mini', { html: svg('plus', 18), onclick: addContent })]),
    el('h4.mini-h', {}, 'CFY deal pipeline'),
    ...state.priv.deals.map((dl) => el('div.li-row', {}, [
      el('span.grow', {}, dl.item),
      el('button.stage-btn', { onclick: () => { dl.stage = DEAL_STAGES[(DEAL_STAGES.indexOf(dl.stage) + 1) % DEAL_STAGES.length]; save(); renderLife(root); } }, dl.stage),
      el('button.chip-x', { html: svg('close', 16), onclick: () => { state.priv.deals = state.priv.deals.filter((x) => x.id !== dl.id); save(); renderLife(root); } }),
    ])),
    el('div.row', {}, [dItem, el('button.btn.mini', { html: svg('plus', 18), onclick: addDeal })]),
  ]);
}
