import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDay, isoWeekKey, taxiTaskForWeek, weeklyPlan, generateDay } from '../js/engine.js';

const CONFIG = {
  shifts: { 0: [10, 16], 2: [10, 18], 4: [10, 20] },
  commuteMin: 20, wakingStart: '07:00', wakingEnd: '23:00',
  wifeTimeMin: 90, gymMin: 60, gymDays: [1, 3, 6], jumuahTime: '13:00',
};
// Deliberately extreme UK-summer prayer times.
const P = { fajr: '03:10', sunrise: '04:50', dhuhr: '13:05', asr: '17:20', maghrib: '21:15', isha: '22:40' };
const d = (s) => new Date(s + 'T12:00:00');

test('Tue is a barber day 10-18', () => {
  const r = classifyDay(d('2026-07-07'), CONFIG);
  assert.equal(r.type, 'barber');
  assert.deepEqual([r.shift.startH, r.shift.endH], [10, 18]);
});

test('Sun is a barber day 10-16', () => {
  assert.deepEqual(classifyDay(d('2026-07-05'), CONFIG).shift, { startH: 10, endH: 16 });
});

test('Friday is friday type', () => assert.equal(classifyDay(d('2026-07-10'), CONFIG).type, 'friday'));
test('Monday is off', () => assert.equal(classifyDay(d('2026-07-06'), CONFIG).type, 'off'));
test('isoWeekKey format', () => assert.match(isoWeekKey(d('2026-07-07')), /^2026-W\d{2}$/));

test('taxi task rotates deterministically', () => {
  const a = taxiTaskForWeek('2026-W28');
  const b = taxiTaskForWeek('2026-W29');
  assert.notEqual(a, b);
  assert.equal(a, taxiTaskForWeek('2026-W28'));
});

test('weeklyPlan embeds the rotating taxi task on Wed', () => {
  const plan = weeklyPlan('2026-W28');
  assert.ok(plan.Wed.some((t) => t.startsWith('Taxi:')));
});

test('barber day: film tag, prayers-inside-shift flagged, wife-time after maghrib, no pre-waking work', () => {
  const { blocks } = generateDay({ date: d('2026-07-07'), prayers: P, config: CONFIG });
  const shift = blocks.find((b) => b.kind === 'shift');
  assert.ok(shift.tags.includes('film-barber'));
  const dhuhr = blocks.find((b) => b.label === 'Dhuhr');
  assert.equal(dhuhr.note, 'Pray on your break at the chair');
  const wife = blocks.find((b) => b.kind === 'wife');
  assert.ok(wife.start >= P.maghrib);
  assert.ok(!blocks.some((b) => b.kind === 'work' && b.start < CONFIG.wakingStart));
  assert.ok(blocks.some((b) => b.prayer));
});

test('off day Monday: morning wife-time + gym', () => {
  const { blocks } = generateDay({ date: d('2026-07-06'), prayers: P, config: CONFIG });
  assert.ok(blocks.some((b) => b.kind === 'wife' && b.start < P.dhuhr));
  assert.ok(blocks.some((b) => b.kind === 'gym'));
});

test('friday has a jumuah block and no gym by default', () => {
  const { blocks } = generateDay({ date: d('2026-07-10'), prayers: P, config: CONFIG });
  assert.ok(blocks.some((b) => b.kind === 'jumuah'));
  assert.ok(!blocks.some((b) => b.kind === 'gym'));
});

test('trip mode swaps to on-the-road blocks, no gym', () => {
  const { blocks } = generateDay({ date: d('2026-07-11'), prayers: P, config: CONFIG, trip: true });
  assert.ok(blocks.some((b) => b.kind === 'trip'));
  assert.ok(!blocks.some((b) => b.kind === 'gym'));
});

test('blocks are time-sorted', () => {
  const { blocks } = generateDay({ date: d('2026-07-06'), prayers: P, config: CONFIG });
  const starts = blocks.map((b) => b.start);
  assert.deepEqual(starts, [...starts].sort());
});
