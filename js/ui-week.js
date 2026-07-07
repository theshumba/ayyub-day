// Week — completion ring, bead quota trackers, the week's plan, Sunday review.
import { isoWeekKey, taxiTaskForWeek, weeklyPlan } from './engine.js';
import { state, save } from './store.js';
import { el, clear, uid, activeDate } from './util.js';
import { icon, svg, bead } from './ui-kit.js';

const RING_R = 58, RING_C = 2 * Math.PI * RING_R;

export function renderWeek(root) {
  clear(root);
  const w = state.priv.week;
  const gymDone = Math.min(3, w.gym.filter(Boolean).length);
  const done = w.barber.filter(Boolean).length + w.cfy.filter(Boolean).length
    + w.taxi.filter(Boolean).length + gymDone + (w.dateNight ? 1 : 0);
  const pct = Math.round((done / 12) * 100);

  // Ring card
  const ring = el('div.metric', { html:
    `<svg width="132" height="132" viewBox="0 0 132 132">
       <circle class="m-track" cx="66" cy="66" r="${RING_R}" fill="none" stroke-width="9"/>
       <circle class="m-fill" cx="66" cy="66" r="${RING_R}" fill="none" stroke-width="9"
         stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${(RING_C * (1 - pct / 100)).toFixed(1)}"/>
     </svg>` });
  ring.append(el('div.metric-center', {}, [el('b', {}, `${pct}%`), el('span', {}, 'this week')]));
  root.append(el('div.card.ring-card', {}, [
    ring,
    el('div', {}, el('span.streak-chip', {}, [icon('flame', 16), `${state.priv.streaks.weeklyGoals || 0} week streak`])),
  ]));

  // Trackers
  const tracker = el('div.card');
  tracker.append(quotaRow('scissors', 'Barber videos', w.barber, root));
  tracker.append(quotaRow('film', 'CFY videos', w.cfy, root));
  tracker.append(quotaRow('car', 'Taxi growth task', w.taxi, root));
  tracker.append(quotaRow('dumbbell', 'Gym', w.gym, root, 3, 'min 3'));
  tracker.append(dateNightRow(root));
  root.append(tracker);

  // The plan
  const key = isoWeekKey(activeDate());
  const plan = weeklyPlan(key);
  root.append(el('div.card', {}, [
    el('h4.mini-h', {}, 'The plan this week'),
    el('div.taxi-banner', {}, [icon('car', 18), el('span', {}, ['Taxi task: ', el('b', {}, taxiTaskForWeek(key))])]),
    planDay('Tue · Thu · Sun', ['Film 1 barber video at the chair each shift']),
    planDay('Mon', plan.Mon), planDay('Wed', plan.Wed), planDay('Fri', plan.Fri), planDay('Sat', plan.Sat),
  ]));

  root.append(reviewCard(root, key));
}

function quotaRow(ic, label, arr, root, required, sub) {
  const beads = el('div.beads', {}, arr.map((v, i) =>
    bead(v, () => { arr[i] = !arr[i]; save(); renderWeek(root); }, required != null && i >= required)));
  return el('div.quota', {}, [
    el('span.q-ic', { html: svg(ic, 18) }),
    el('span.q-label', {}, [label, sub ? el('small', {}, ` · ${sub}`) : null]),
    beads,
  ]);
}

function dateNightRow(root) {
  const w = state.priv.week;
  const note = el('input.input datenight-note', { placeholder: 'where / how long (optional)', value: w.dateNote || '' });
  note.addEventListener('input', () => { w.dateNote = note.value; save(); });
  return el('div', {}, [
    el('div.quota', {}, [
      el('span.q-ic', { html: svg('heart', 18) }),
      el('span.q-label', {}, 'Date night'),
      el('div.beads', {}, [bead(w.dateNight, () => { w.dateNight = !w.dateNight; save(); renderWeek(root); })]),
    ]),
    note,
  ]);
}

function planDay(day, items) {
  return el('div.plan-day', {}, [el('span.plan-name', {}, day), el('ul', {}, items.map((t) => el('li', {}, t)))]);
}

function reviewCard(root, key) {
  const ex = state.priv.reviews.find((r) => r.isoWeek === key) || {};
  const hit = el('textarea.rev', { placeholder: 'What went well?' }); hit.value = ex.hit || '';
  const slip = el('textarea.rev', { placeholder: 'What slipped?' }); slip.value = ex.slipped || '';
  const lesson = el('textarea.rev', { placeholder: 'One lesson for next week' }); lesson.value = ex.lesson || '';
  const btn = el('button.btn', {
    onclick: () => {
      const rest = state.priv.reviews.filter((r) => r.isoWeek !== key);
      rest.push({ id: ex.id || uid(), isoWeek: key, hit: hit.value, slipped: slip.value, lesson: lesson.value });
      state.priv.reviews = rest; save();
      btn.textContent = 'Saved ✓'; setTimeout(() => { btn.textContent = 'Save review'; }, 1200);
    },
  }, 'Save review');
  return el('div.card', {}, [
    el('h4.mini-h', {}, 'Sunday review · 2 min'),
    hit, slip, lesson, btn,
  ]);
}
