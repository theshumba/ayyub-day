// Today tab — the auto-generated, prayer-anchored day.
import { CONFIG } from './config.js';
import { generateDay } from './engine.js';
import { getPrayerTimes } from './prayer.js';
import { state, save, writeShared } from './store.js';
import { el, clear, niceTime, todayKey, nowHm, activeDate } from './util.js';

const ICON = {
  prayer: '🕌', shift: '✂️', commute: '🚗', wife: '❤️', gym: '🏋️',
  work: '🎬', rest: '☕', jumuah: '🕌', trip: '🚐', note: '📍',
};

export async function renderToday(root) {
  clear(root);
  const date = activeDate();
  state.date = date;
  const dateKey = todayKey(date);
  const trip = state.priv.trips[dateKey] || null;

  if (!state.prayers || state.prayersDate !== dateKey) {
    state.prayers = await getPrayerTimes(date, CONFIG.location, CONFIG.prayerMethod);
    state.prayersDate = dateKey;
  }
  const prayers = state.prayers;
  const plan = generateDay({ date, prayers, config: CONFIG, trip: !!trip });

  // Header
  root.append(el('div.why', {}, ['🌟 ', state.priv.whyLine]));
  const dstr = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  root.append(el('div.day-head', {}, [
    el('h2', {}, dstr),
    el('p.summary', {}, plan.summary),
    prayers.stale ? el('p.stale', {}, '⚠︎ using saved prayer times (offline)') : null,
  ]));

  // Collection-trip control
  root.append(tripControl(dateKey, trip, root));

  // Timeline
  const now = nowHm();
  const list = el('div.timeline');
  const ticks = state.priv.ticks[dateKey] || (state.priv.ticks[dateKey] = {});
  let nowMarked = false;
  plan.blocks.forEach((b, i) => {
    const isNow = !nowMarked && b.start <= now && (i + 1 >= plan.blocks.length || plan.blocks[i + 1].start > now);
    if (isNow) nowMarked = true;
    list.append(blockCard(b, i, ticks, isNow, root));
  });
  root.append(list);

  // Publish reassurance status for the wife view
  const inShift = plan.blocks.some((b) => (b.kind === 'shift' || b.kind === 'jumuah') && b.start <= now && (b.end || '99:99') > now);
  const wifeBlock = plan.blocks.find((b) => b.kind === 'wife');
  writeShared({
    status: trip ? 'away' : (inShift ? 'working' : 'home'),
    awayBackBy: trip ? trip.back : '',
    todaySummary: plan.summary,
    wifeTimeBlock: wifeBlock ? `${niceTime(wifeBlock.start)}–${niceTime(wifeBlock.end)}` : '',
    dateNight: { done: state.priv.week.dateNight, note: state.priv.week.dateNote },
    prayerTimes: prayers,
    dayAtAGlance: plan.blocks
      .filter((b) => ['prayer', 'shift', 'jumuah', 'wife', 'trip'].includes(b.kind))
      .map((b) => ({ time: niceTime(b.start), label: b.label })),
  });
}

function blockCard(b, i, ticks, isNow, root) {
  const done = !!ticks[i];
  const tickable = b.kind !== 'commute' && b.kind !== 'note';
  const card = el('div.block', { 'data-kind': b.kind });
  if (b.prayer) card.classList.add('is-prayer');
  if (isNow) card.classList.add('now');
  if (done) card.classList.add('done');

  const time = el('div.block-time', {}, [
    el('span.t1', {}, niceTime(b.start)),
    b.end ? el('span.t2', {}, niceTime(b.end)) : null,
  ]);
  const body = el('div.block-body', {}, [
    el('div.block-title', {}, [`${ICON[b.kind] || '•'} `, b.label, b.tags.includes('film-barber') ? el('span.pill', {}, 'film') : null]),
    b.note ? el('div.block-note', {}, b.note) : null,
    isNow ? el('span.badge', {}, 'now') : null,
  ]);
  const check = tickable
    ? el('button.tick', { 'aria-label': 'done', onclick: () => { ticks[i] = !ticks[i]; save(); renderToday(root); } }, done ? '✓' : '')
    : el('span.tick-spacer');
  card.append(time, body, check);
  return card;
}

function tripControl(dateKey, trip, root) {
  if (trip) {
    return el('div.card.trip-card', {}, [
      el('div', {}, [`🚐 On a collection trip — back by ${trip.back || '—'}${trip.city ? ' · ' + trip.city : ''}`]),
      el('button.btn.ghost', {
        onclick: () => { delete state.priv.trips[dateKey]; save(); renderToday(root); },
      }, 'End trip'),
    ]);
  }
  return el('button.btn.ghost.wide', {
    onclick: () => {
      const back = prompt('Back by when? (e.g. 21:00, or "tomorrow")', '21:00');
      if (back === null) return;
      const city = prompt('Which town/city are you travelling to? (optional — for local prayer times)', '') || '';
      state.priv.trips[dateKey] = { back, city };
      save(); renderToday(root);
    },
  }, '🚐 Going on a collection trip today');
}
