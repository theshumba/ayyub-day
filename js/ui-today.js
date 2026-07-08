// Today — greeting, live next-prayer hero, "now" strip, and the prayer spine.
import { CONFIG } from './config.js';
import { generateDay } from './engine.js';
import { getPrayerTimes } from './prayer.js';
import { state, save, writeShared } from './store.js';
import { el, clear, niceTime, todayKey, nowHm, activeDate } from './util.js';
import { icon, svg, check } from './ui-kit.js';

const ORDER = [['fajr', 'Fajr'], ['dhuhr', 'Dhuhr'], ['asr', 'Asr'], ['maghrib', 'Maghrib'], ['isha', 'Isha']];
const RING_R = 40, RING_C = 2 * Math.PI * RING_R;
let clockTimer = null;

function kindIcon(b) {
  if (b.kind === 'work') {
    if (/video|film|barber|edit|post/i.test(b.label)) return 'film';
    if (/sourc/i.test(b.label)) return 'route';
    return 'briefcase';
  }
  return { prayer: 'dome', shift: 'scissors', commute: 'car', wife: 'heart', gym: 'dumbbell', rest: 'moon', jumuah: 'dome', trip: 'van', note: 'pin' }[b.kind] || 'dome';
}

function fmtRemaining(min) {
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function computeNext(prayers, now) {
  const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  const n = toMin(now);
  const list = ORDER.map(([k, label]) => ({ label, t: prayers[k], m: toMin(prayers[k]) })).sort((a, b) => a.m - b.m);
  let prev = null, next = null;
  for (const p of list) { if (p.m > n) { next = p; break; } prev = p; }
  if (!next) { next = { ...list[0], m: list[0].m + 1440 }; prev = list[list.length - 1]; }
  if (!prev) prev = { ...list[list.length - 1], m: list[list.length - 1].m - 1440 };
  const span = Math.max(1, next.m - prev.m);
  return { name: next.label, time: next.t, remaining: next.m - n, frac: Math.max(0, Math.min(1, (n - prev.m) / span)) };
}

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
  const now = nowHm();

  // Greeting
  root.append(el('div.greet', {}, [
    el('div.greet-h', {}, 'Assalamu ʿalaykum'),
    el('div.greet-d', {}, date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })),
  ]));

  // Hero — next prayer + countdown ring
  const nx = computeNext(prayers, now);
  root.append(heroEl(nx));
  if (prayers.stale) root.append(el('p.stale', {}, 'Using saved prayer times (offline)'));

  // Now strip
  const nowBlock = plan.blocks.find((b, i) => b.start <= now && (i + 1 >= plan.blocks.length || plan.blocks[i + 1].start > now));
  root.append(el('div.nowstrip', {}, [
    el('span.pulse-dot'),
    el('div.ns-body', {}, [
      el('div.ns-label', {}, 'Now'),
      el('div.ns-title', {}, nowBlock ? nowBlock.label : 'A moment to breathe'),
    ]),
    icon('chevron', 18),
  ]));

  // Why line
  root.append(el('div.why', {}, `“${state.priv.whyLine}”`));

  // Collection-trip control
  root.append(tripControl(dateKey, trip, root));

  // The prayer spine
  root.append(el('div.spine-head', {}, [el('span.line'), el('span.lbl', {}, 'the day'), el('span.line')]));
  const spine = el('div.spine');
  const ticks = state.priv.ticks[dateKey] || (state.priv.ticks[dateKey] = {});
  plan.blocks.forEach((b, i) => {
    const isNow = nowBlock && b === nowBlock;
    spine.append(nodeEl(b, i, ticks, isNow, root));
  });
  root.append(spine);

  publishShared(plan, prayers, trip, now, nowBlock);
  startClock();
}

function heroEl(nx) {
  const ring = el('div.ring', { html:
    `<svg width="92" height="92" viewBox="0 0 92 92">
       <circle class="ring-track" cx="46" cy="46" r="${RING_R}" fill="none" stroke-width="6"/>
       <circle id="ring-fill" class="ring-fill" cx="46" cy="46" r="${RING_R}" fill="none" stroke-width="6"
         stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${(RING_C * (1 - nx.frac)).toFixed(1)}"/>
     </svg>` });
  ring.append(el('div.ring-center', {}, [el('b', { id: 'ring-remaining' }, fmtRemaining(nx.remaining)), el('span', {}, 'remaining')]));
  return el('div.hero', {}, [
    el('div.hero-eyebrow', {}, 'Next prayer'),
    el('div.hero-main', {}, [
      el('div', {}, [el('div.hero-name', { id: 'hero-name' }, nx.name), el('div.hero-time tnum', { id: 'hero-time' }, niceTime(nx.time))]),
      ring,
    ]),
  ]);
}

function nodeEl(b, i, ticks, isNow, root) {
  const done = !!ticks[i];
  const tickable = b.kind !== 'commute' && b.kind !== 'note';
  const cls = `node ${b.kind === 'prayer' || b.kind === 'jumuah' ? 'prayer' : 'act'}${done ? ' done' : ''}${isNow ? ' now' : ''}`;
  const title = el('div.n-title', {}, [b.label, b.tags.includes('film-barber') ? el('span.pill', {}, 'film') : null]);
  const body = el('div.n-body', {}, [title, b.note ? el('div.n-note', {}, b.note) : null]);
  const time = el('div.n-time tnum', {}, b.end ? [niceTime(b.start), el('small', {}, niceTime(b.end))] : [niceTime(b.start)]);
  const card = el('div.node-card', {}, [
    el('span.n-ic', { html: svg(kindIcon(b), 20) }),
    body, time,
    tickable ? check(done, () => { ticks[i] = !ticks[i]; save(); renderToday(root); }) : el('span', { style: 'width:2px' }),
  ]);
  return el('div', { class: cls }, [el('div.rail', {}, [el('span.dot')]), card]);
}

function tripControl(dateKey, trip, root) {
  if (trip) {
    return el('div.card.trip-active', {}, [
      el('span.n-ic', { html: svg('van', 20) }),
      el('div.ns-body', {}, [el('div.ns-label', {}, 'Collection trip'), el('div.ns-title', {}, `Back by ${trip.back || '—'}${trip.city ? ' · ' + trip.city : ''}`)]),
      el('button.btn.mini.ghost', { onclick: () => { delete state.priv.trips[dateKey]; save(); renderToday(root); } }, 'End'),
    ]);
  }
  return el('button.trip-toggle', {
    onclick: () => {
      const back = prompt('Back by when? (e.g. 21:00, or "tomorrow")', '21:00');
      if (back === null) return;
      const city = prompt('Which town/city? (optional — for local prayer times)', '') || '';
      state.priv.trips[dateKey] = { back, city };
      save(); renderToday(root);
    },
  }, [svgSpan('van'), 'Going on a collection trip today']);
}
const svgSpan = (n) => el('span.ic', { html: svg(n, 18) });

function publishShared(plan, prayers, trip, now, nowBlock) {
  const inShift = !!nowBlock && (nowBlock.kind === 'shift' || nowBlock.kind === 'jumuah');
  const wifeBlock = plan.blocks.find((b) => b.kind === 'wife');
  const shiftBlock = plan.blocks.find((b) => b.kind === 'shift');
  // Semantic (language-agnostic) payload so the wife view can render in Urdu or English.
  writeShared({
    status: trip ? 'away' : (inShift ? 'working' : 'home'),
    awayBackBy: trip ? trip.back : '',
    dayType: trip ? 'trip' : plan.dayType,
    shift: shiftBlock ? { startHm: shiftBlock.start, endHm: shiftBlock.end } : null,
    wifeTime: wifeBlock ? { startHm: wifeBlock.start, endHm: wifeBlock.end } : null,
    dateNight: { done: state.priv.week.dateNight, note: state.priv.week.dateNote },
    prayerTimes: prayers,
    glance: plan.blocks.filter((b) => ['prayer', 'shift', 'jumuah', 'wife', 'trip'].includes(b.kind))
      .map((b) => ({ kind: b.kind, startHm: b.start, name: b.label })),
  });
}

function startClock() {
  if (clockTimer) clearInterval(clockTimer);
  if (globalThis.__SMOKE__ || typeof document === 'undefined') return;
  clockTimer = setInterval(() => {
    if (!state.prayers) return;
    const nx = computeNext(state.prayers, nowHm());
    const set = (id, t) => { const n = document.getElementById(id); if (n) n.textContent = t; };
    set('hero-name', nx.name); set('hero-time', niceTime(nx.time)); set('ring-remaining', fmtRemaining(nx.remaining));
    const rf = document.getElementById('ring-fill');
    if (rf) rf.setAttribute('stroke-dashoffset', (RING_C * (1 - nx.frac)).toFixed(1));
  }, 30000);
  clockTimer.unref?.();
}
