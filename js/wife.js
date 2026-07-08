// Wife view — no login. Pairs once via Ayyub's share link, then reads his status.
// Urdu (default) or English, RTL-aware. Never sees his private data (it's not in the cloud).
import { state, initWife, pairWife } from './store.js';
import { $, el, clear, niceTime } from './util.js';
import { svg, sectionTitle } from './ui-kit.js';
import { t, prayerName, toggleLang, otherLangLabel, applyDir, setLang } from './i18n.js';

let lastShared = null;
let paired = true;

const SAMPLE = {
  status: 'working', awayBackBy: '', dayType: 'barber',
  shift: { startHm: '10:00', endHm: '18:00' }, wifeTime: { startHm: '21:15', endHm: '22:45' },
  dateNight: { done: true, note: 'Indian, ~1.5h' },
  prayerTimes: { fajr: '03:10', dhuhr: '13:05', asr: '17:20', maghrib: '21:15', isha: '22:40' },
  glance: [
    { kind: 'prayer', startHm: '03:10', name: 'Fajr' }, { kind: 'shift', startHm: '10:00', name: 'Menspire' },
    { kind: 'prayer', startHm: '13:05', name: 'Dhuhr' }, { kind: 'prayer', startHm: '17:20', name: 'Asr' },
    { kind: 'prayer', startHm: '21:15', name: 'Maghrib' }, { kind: 'wife', startHm: '21:15', name: 'wife' },
    { kind: 'prayer', startHm: '22:40', name: 'Isha' },
  ],
};

function statusBits(s) {
  if (s.status === 'away') return { ic: 'van', line: t('status_away', { x: s.awayBackBy || '' }) };
  if (s.status === 'working') return { ic: 'scissors', line: t('status_working') };
  return { ic: 'heart', line: t('status_home') };
}
function summaryText(s) {
  if (s.dayType === 'barber') return s.shift ? t('summary_barber', { start: niceTime(s.shift.startHm), end: niceTime(s.shift.endHm) }) : t('summary_off');
  if (s.dayType === 'friday') return t('summary_friday');
  if (s.dayType === 'trip') return t('summary_trip');
  return t('summary_off');
}
function glanceLabel(g) {
  if (g.kind === 'prayer') return prayerName(g.name);
  return { shift: t('k_shift'), wife: t('k_wife'), jumuah: t('k_jumuah'), trip: t('k_trip') }[g.kind] || g.name;
}

function render(shared) {
  lastShared = shared; paired = true;
  const root = $('#wife-root');
  clear(root);
  if (!shared) {
    root.append(el('div.card', {}, [sectionTitle('moon', t('empty_title')), el('p.hint', {}, t('empty_body'))]));
    return;
  }
  const s = shared;
  const b = statusBits(s);
  root.append(el('div.status-hero', {}, [
    el('div.sh-ic', { html: svg(b.ic, 26) }),
    el('h2', {}, b.line),
    el('p', {}, summaryText(s)),
  ]));
  root.append(el('div.card', {}, [
    sectionTitle('heart', t('sec_together')),
    el('div.li-row', {}, [el('span.grow', {}, t('together_today')), el('span.n-time tnum', {}, s.wifeTime ? `${niceTime(s.wifeTime.startHm)}–${niceTime(s.wifeTime.endHm)}` : t('together_soon'))]),
    el('div.li-row', {}, [el('span.grow', {}, t('datenight_label')), el('span.n-time', {}, s.dateNight?.done ? (t('datenight_booked') + (s.dateNight.note ? ` · ${s.dateNight.note}` : '')) : t('datenight_no'))]),
  ]));
  if (s.prayerTimes) {
    const P = s.prayerTimes;
    root.append(el('div.card', {}, [
      sectionTitle('dome', t('sec_prayers'), 'gold'),
      el('div.trend', {}, ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((k) =>
        el('span.trend-item', {}, [el('b.tnum', {}, niceTime(P[k.toLowerCase()])), el('div', {}, prayerName(k))]))),
    ]));
  }
  if (s.glance?.length) {
    root.append(el('div.card', {}, [
      sectionTitle('sun', t('sec_glance')),
      ...s.glance.map((g) => el('div.li-row', {}, [el('span.grow', {}, glanceLabel(g)), el('span.n-time tnum', {}, niceTime(g.startHm))])),
    ]));
  }
}

function renderPair() {
  paired = false;
  const input = el('input.input', { placeholder: t('pair_placeholder') });
  clear($('#wife-root'));
  $('#wife-root').append(el('div.card', {}, [
    sectionTitle('heart', t('pair_title')),
    el('p', {}, t('pair_body')),
    el('div.row', {}, [input, el('button.btn.mini', { onclick: () => pairWife(input.value) }, t('pair_button'))]),
  ]));
}

function applyStatic() {
  $('#w-title').textContent = t('topbar_title');
  $('#sync-note').textContent = t('demo_banner');
  $('#btn-lang').innerHTML = `${svg('globe', 16)}<span>${otherLangLabel()}</span>`;
}

function rerender() { paired ? render(lastShared) : renderPair(); }
function onToggle() { toggleLang(); applyStatic(); rerender(); }

async function boot() {
  const q = new URLSearchParams(location.search);
  if (q.get('lang')) setLang(q.get('lang'));
  applyDir();
  applyStatic();
  $('#btn-lang').onclick = onToggle;
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  $('#sync-note').classList.toggle('hidden', state.cloud);

  if (q.has('preview')) { render(SAMPLE); return; }
  const { paired: isPaired } = await initWife(render);
  if (!isPaired) renderPair();
}

boot();
