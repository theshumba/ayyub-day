// Pure day-generation engine. No I/O, no DOM — fully unit-testable.
// A "block" = { start:'HH:MM', end:'HH:MM'|null, kind, label, tags:[], prayer?, note? }

const pad = (n) => String(n).padStart(2, '0');
const hm2min = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const min2hm = (m) => { m = Math.max(0, Math.min(1439, Math.round(m))); return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
const addMin = (s, m) => min2hm(hm2min(s) + m);
const laterOf = (a, b) => (hm2min(a) >= hm2min(b) ? a : b);
const within = (t, a, b) => hm2min(t) >= hm2min(a) && hm2min(t) <= hm2min(b);

const TAXI_TASKS = [
  'Run ads', 'Check bookings growth', 'Chase reviews', 'Refresh photos', 'Update listings',
];

const PRAYERS = [
  ['fajr', 'Fajr'], ['dhuhr', 'Dhuhr'], ['asr', 'Asr'], ['maghrib', 'Maghrib'], ['isha', 'Isha'],
];

export function classifyDay(date, config) {
  const day = date.getDay();
  if (day === 5) return { type: 'friday' };
  if (config.shifts[day]) {
    const [startH, endH] = config.shifts[day];
    return { type: 'barber', shift: { startH, endH } };
  }
  return { type: 'off' };
}

// ISO-8601 week key, e.g. "2026-W28". Year follows the week's Thursday.
export function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;         // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3);       // move to Thursday of this week
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstThuNum = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - firstThuNum + 3);
  const week = 1 + Math.round((d - firstThu) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}-W${pad(week)}`;
}

export function taxiTaskForWeek(isoKey) {
  const wk = parseInt(isoKey.slice(-2), 10) || 0;
  return TAXI_TASKS[wk % TAXI_TASKS.length];
}

export function weeklyPlan(isoKey) {
  return {
    barberDays: [0, 2, 4],
    Mon: ['CFY sourcing (scout · pickups · photos · sellers)', 'Film + edit + post 1 CFY video'],
    Wed: ['Film + edit + post 2 CFY videos', `Taxi: ${taxiTaskForWeek(isoKey)}`],
    Fri: ['Jumuʿah', 'Film + edit + post 1 CFY video', 'Edit + upload the barber videos'],
    Sat: ['CFY sourcing', 'Buffer / catch up any missed goals'],
  };
}

export function generateDay({ date, prayers, config, trip = false }) {
  const info = classifyDay(date, config);
  const friday = info.type === 'friday';
  const blocks = [];
  const ws = config.wakingStart;
  const we = config.wakingEnd;
  const clamp = (s) => laterOf(s, ws);

  // Prayer anchors always show (even a 03:10 summer Fajr), no work is placed on them.
  const anchors = friday ? PRAYERS.filter(([k]) => k !== 'dhuhr') : PRAYERS;
  for (const [k, label] of anchors) {
    if (!prayers[k]) continue;
    blocks.push({ start: prayers[k], end: null, kind: 'prayer', label, prayer: true, tags: [] });
  }
  if (friday) {
    blocks.push({
      start: config.jumuahTime, end: addMin(config.jumuahTime, 75), kind: 'jumuah',
      label: 'Jumuʿah', tags: [], note: 'Leave for the masjid ~30 min before',
    });
  }

  if (trip) {
    const summary = 'Away on a collection trip';
    blocks.push({ start: clamp(ws), end: null, kind: 'trip', label: 'On the road — sourcing & collections', tags: [], note: 'Grab extra content while out' });
    blocks.push({ start: clamp(addMin(ws, 180)), end: null, kind: 'trip', label: 'Meet sellers · collect · photograph', tags: [] });
    blocks.push({ start: clamp(addMin(ws, 360)), end: null, kind: 'note', label: 'Check local prayer times where you are', tags: [] });
    return finalize(blocks, info.type, summary);
  }

  let summary;
  if (info.type === 'barber') {
    const { startH, endH } = info.shift;
    const shiftStart = `${pad(startH)}:00`;
    const shiftEnd = `${pad(endH)}:00`;
    summary = `Barbering at Menspire ${shiftStart}–${shiftEnd}`;
    blocks.push({ start: addMin(shiftStart, -config.commuteMin), end: shiftStart, kind: 'commute', label: 'Drive to Beaconsfield', tags: [] });
    blocks.push({ start: shiftStart, end: shiftEnd, kind: 'shift', label: 'Menspire — barbering', tags: ['film-barber'], note: 'Film 1 barber video at the chair' });
    for (const b of blocks) {
      if (b.prayer && within(b.start, shiftStart, shiftEnd)) b.note = 'Pray on your break at the chair';
    }
    const home = addMin(shiftEnd, config.commuteMin);
    blocks.push({ start: shiftEnd, end: home, kind: 'commute', label: 'Drive home', tags: [] });
    const wifeStart = laterOf(prayers.maghrib, home);
    blocks.push({ start: wifeStart, end: addMin(wifeStart, config.wifeTimeMin), kind: 'wife', label: 'Time with your wife (1.5h)', tags: [] });
  } else {
    summary = friday ? 'Off + Jumuʿah — CFY, editing & goals' : 'Off day — CFY, sourcing & goals';
    const wifeStart = clamp(ws);
    const wifeEnd = addMin(wifeStart, config.wifeTimeMin);
    blocks.push({ start: wifeStart, end: wifeEnd, kind: 'wife', label: 'Time with your wife (1.5h)', tags: [] });
    let cursor = hm2min(wifeEnd);
    const day = date.getDay();
    if (config.gymDays.includes(day)) {
      const gStart = min2hm(cursor);
      const gEnd = addMin(gStart, config.gymMin);
      blocks.push({ start: gStart, end: gEnd, kind: 'gym', label: 'Gym', tags: [] });
      cursor = hm2min(gEnd);
    }
    const key = isoWeekKey(date);
    const plan = weeklyPlan(key);
    const dayName = { 1: 'Mon', 3: 'Wed', 5: 'Fri', 6: 'Sat' }[day];
    const tasks = (plan[dayName] || []).filter((t) => t !== 'Jumuʿah');
    for (const t of tasks) {
      const start = min2hm(Math.min(cursor, hm2min(we) - 30));
      blocks.push({ start, end: null, kind: 'work', label: t, tags: [] });
      cursor += 150; // ~2.5h stagger; he ticks off, exact timing is guidance
    }
    blocks.push({ start: prayers.maghrib, end: null, kind: 'rest', label: 'Buffer / rest', tags: [] });
  }
  return finalize(blocks, info.type, summary);
}

function finalize(blocks, dayType, summary) {
  blocks.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return { dayType, summary, blocks };
}
