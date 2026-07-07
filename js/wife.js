// Wife view — read-only, calm, "heart at ease". Only ever reads shared/current.
import { state, initAuth, loadWife, signIn, signUp, myUid } from './store.js';
import { $, el, clear, niceTime } from './util.js';
import { icon, svg, sectionTitle } from './ui-kit.js';

function statusBits(s) {
  if (s.status === 'away') return { ic: 'van', line: `Away collecting — back by ${s.awayBackBy || 'later'}` };
  if (s.status === 'working') return { ic: 'scissors', line: 'At work right now' };
  return { ic: 'heart', line: 'At home' };
}

function render(shared) {
  const root = $('#wife-root');
  clear(root);
  if (!shared) {
    root.append(el('div.card', {}, [
      sectionTitle('moon', 'Nothing yet today'),
      el('p.hint', {}, 'Once Ayyub opens his planner today, his schedule appears here.'),
    ]));
    return;
  }
  const s = shared;
  const b = statusBits(s);
  root.append(el('div.status-hero', {}, [
    el('div.sh-ic', { html: svg(b.ic, 26) }),
    el('h2', {}, b.line),
    el('p', {}, s.todaySummary || ''),
  ]));

  root.append(el('div.card', {}, [
    sectionTitle('heart', 'Time together'),
    el('div.li-row', {}, [el('span.grow', {}, 'Today, just the two of you'), el('span.n-time tnum', {}, s.wifeTimeBlock || 'soon')]),
    el('div.li-row', {}, [el('span.grow', {}, 'This week’s date night'), el('span.n-time', {}, s.dateNight?.done ? `Booked${s.dateNight.note ? ' · ' + s.dateNight.note : ''}` : 'Not yet')]),
  ]));

  if (s.prayerTimes) {
    const P = s.prayerTimes;
    root.append(el('div.card', {}, [
      sectionTitle('dome', 'Today’s prayers', 'gold'),
      el('div.trend', {}, [['Fajr', P.fajr], ['Dhuhr', P.dhuhr], ['Asr', P.asr], ['Maghrib', P.maghrib], ['Isha', P.isha]]
        .map(([n, t]) => el('span.trend-item', {}, [el('b tnum', {}, niceTime(t)), el('div', {}, n)]))),
    ]));
  }

  if (s.dayAtAGlance?.length) {
    root.append(el('div.card', {}, [
      sectionTitle('sun', 'His day at a glance'),
      ...s.dayAtAGlance.map((x) => el('div.li-row', {}, [el('span.grow', {}, x.label), el('span.n-time tnum', {}, x.time)])),
    ]));
  }
}

function notLinked() {
  clear($('#wife-root'));
  $('#wife-root').append(el('div.card', {}, [
    sectionTitle('heart', 'Almost there'),
    el('p', {}, 'Ask Ayyub to link you. Show him this ID:'),
    el('p', { style: 'margin:8px 0' }, el('code', {}, myUid() || '—')),
    el('p.hint', {}, 'He pastes it into Settings → Link your wife. Then his day appears here automatically.'),
  ]));
}

function wireLogin() {
  $('#btn-signin').onclick = async () => { try { await signIn($('#login-email').value, $('#login-pw').value); } catch (e) { $('#login-err').textContent = e.message; } };
  $('#btn-signup').onclick = async () => { try { await signUp($('#login-email').value, $('#login-pw').value); } catch (e) { $('#login-err').textContent = e.message; } };
}

async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  wireLogin();
  await initAuth(async (user) => {
    if (!user) { $('#login').classList.remove('hidden'); $('#app').classList.add('hidden'); return; }
    $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
    $('#demo-banner').classList.toggle('hidden', !state.demo);
    const { linked } = await loadWife(render);
    if (!linked) notLinked();
  });
}

boot();
