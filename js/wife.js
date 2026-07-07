// Wife view — read-only, calm, "heart at ease". Only ever reads shared/current.
import { state, initAuth, loadWife, signIn, signUp, myUid } from './store.js';
import { $, el, clear, niceTime } from './util.js';

function statusLine(s) {
  if (s.status === 'away') return `🚐 Away collecting — back by ${s.awayBackBy || 'later'}`;
  if (s.status === 'working') return '✂️ At work right now';
  return '🏠 At home';
}

function render(shared) {
  const root = $('#wife-root');
  clear(root);
  if (!shared) {
    root.append(el('div.card', {}, [
      el('h2', {}, 'Nothing yet today'),
      el('p.hint', {}, 'Once Ayyub opens his planner today, his schedule will appear here.'),
    ]));
    return;
  }
  const s = shared;
  root.append(el('div.card', {}, [
    el('div.why', {}, '“Be present for my wife.”'),
    el('h2', {}, statusLine(s)),
    el('p.summary', {}, s.todaySummary || ''),
  ]));

  root.append(el('div.card', {}, [
    el('h3', {}, '❤️ Time together today'),
    el('p', {}, s.wifeTimeBlock ? `Set aside: ${s.wifeTimeBlock}` : 'Being arranged around today.'),
    el('h3', {}, '🍽️ This week’s date night'),
    el('p', {}, s.dateNight?.done ? `Booked ✓ ${s.dateNight.note ? '· ' + s.dateNight.note : ''}` : 'Not yet this week.'),
  ]));

  if (s.prayerTimes) {
    const P = s.prayerTimes;
    root.append(el('div.card', {}, [
      el('h3', {}, '🕌 Today’s prayers'),
      el('div.trend', {}, [['Fajr', P.fajr], ['Dhuhr', P.dhuhr], ['Asr', P.asr], ['Maghrib', P.maghrib], ['Isha', P.isha]]
        .map(([n, t]) => el('span.trend-item', {}, [el('b', {}, n), ' ', niceTime(t)]))),
    ]));
  }

  if (s.dayAtAGlance?.length) {
    root.append(el('div.card', {}, [
      el('h3', {}, 'His day at a glance'),
      el('div.timeline', {}, s.dayAtAGlance.map((b) =>
        el('div.block', {}, [el('div.block-time', {}, [el('span.t1', {}, b.time)]), el('div.block-body', {}, [el('div.block-title', {}, b.label)]), el('span.tick-spacer')]))),
    ]));
  }
}

function notLinked() {
  clear($('#wife-root'));
  $('#wife-root').append(el('div.card', {}, [
    el('h2', {}, 'Almost there'),
    el('p', {}, 'Ask Ayyub to link you. Show him this ID:'),
    el('p', {}, el('code', {}, myUid() || '—')),
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
