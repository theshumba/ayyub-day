// Week tab — quota tracker, completion %, the week's plan, and the Sunday review.
import { isoWeekKey, taxiTaskForWeek, weeklyPlan } from './engine.js';
import { state, save } from './store.js';
import { el, clear, uid, activeDate } from './util.js';

export function renderWeek(root) {
  clear(root);
  const w = state.priv.week;

  const gymDone = Math.min(3, w.gym.filter(Boolean).length);
  const done = w.barber.filter(Boolean).length + w.cfy.filter(Boolean).length
    + w.taxi.filter(Boolean).length + gymDone + (w.dateNight ? 1 : 0);
  const pct = Math.round((done / 12) * 100);

  root.append(el('div.card.progress-card', {}, [
    el('h2', {}, 'This week'),
    el('div.bar', {}, [el('div.bar-fill', { style: `width:${pct}%` })]),
    el('p.pct', {}, `${pct}% of your weekly goals`),
    el('p.streak', {}, `🔥 Weekly-goals streak: ${state.priv.streaks.weeklyGoals || 0}`),
  ]));

  const tracker = el('div.card');
  tracker.append(quotaRow('✂️ Barber videos', w.barber, root));
  tracker.append(quotaRow('🎮 CFY videos', w.cfy, root));
  tracker.append(quotaRow('🚕 Taxi growth task', w.taxi, root));
  tracker.append(quotaRow('🏋️ Gym (min 3)', w.gym, root, 3));
  tracker.append(dateNightRow(root));
  root.append(tracker);

  // The week's assignments
  const key = isoWeekKey(activeDate());
  const plan = weeklyPlan(key);
  root.append(el('div.card', {}, [
    el('h3', {}, 'The plan this week'),
    el('p.taxi-task', {}, `This week's taxi task: ${taxiTaskForWeek(key)}`),
    dayList('Mon', plan.Mon), dayList('Tue · Thu · Sun', ['Film 1 barber video at the chair each shift']),
    dayList('Wed', plan.Wed), dayList('Fri', plan.Fri), dayList('Sat', plan.Sat),
  ]));

  root.append(reviewCard(root, key));
}

function quotaRow(label, arr, root, requiredCount) {
  const boxes = el('div.boxes');
  arr.forEach((v, i) => {
    const bonus = requiredCount != null && i >= requiredCount;
    boxes.append(el('button.box' + (v ? '.on' : '') + (bonus ? '.bonus' : ''), {
      title: bonus ? 'bonus' : '',
      onclick: () => { arr[i] = !arr[i]; save(); renderWeek(root); },
    }, v ? '✓' : ''));
  });
  return el('div.quota', {}, [el('span.quota-label', {}, label), boxes]);
}

function dateNightRow(root) {
  const w = state.priv.week;
  const note = el('input.note-input', { placeholder: 'where / how long (optional)', value: w.dateNote || '' });
  note.addEventListener('input', () => { w.dateNote = note.value; save(); });
  return el('div.quota.datenight', {}, [
    el('span.quota-label', {}, '🍽️ Date night (1×/week)'),
    el('button.box' + (w.dateNight ? '.on' : ''), {
      onclick: () => { w.dateNight = !w.dateNight; save(); renderWeek(root); },
    }, w.dateNight ? '✓' : ''),
    note,
  ]);
}

function dayList(day, items) {
  return el('div.day-plan', {}, [
    el('span.day-plan-name', {}, day),
    el('ul', {}, items.map((t) => el('li', {}, t))),
  ]);
}

function reviewCard(root, key) {
  const existing = state.priv.reviews.find((r) => r.isoWeek === key) || {};
  const hit = el('textarea.rev', { placeholder: 'What went well?' }); hit.value = existing.hit || '';
  const slip = el('textarea.rev', { placeholder: 'What slipped?' }); slip.value = existing.slipped || '';
  const lesson = el('textarea.rev', { placeholder: 'One lesson for next week' }); lesson.value = existing.lesson || '';
  const saveBtn = el('button.btn', {
    onclick: () => {
      const rest = state.priv.reviews.filter((r) => r.isoWeek !== key);
      rest.push({ id: existing.id || uid(), isoWeek: key, hit: hit.value, slipped: slip.value, lesson: lesson.value });
      state.priv.reviews = rest; save();
      saveBtn.textContent = 'Saved ✓'; setTimeout(() => (saveBtn.textContent = 'Save review'), 1200);
    },
  }, 'Save review');
  return el('div.card', {}, [
    el('h3', {}, 'Sunday review (2 min)'),
    el('p.hint', {}, 'What hit, what slipped, one lesson.'),
    hit, slip, lesson, saveBtn,
  ]);
}
