// Owner app: auth guard, tab router, settings.
import { state, initAuth, loadOwner, signIn, signUp, signOutUser, myUid, linkWife, save } from './store.js';
import { renderToday } from './ui-today.js';
import { renderWeek } from './ui-week.js';
import { renderLife } from './ui-life.js';
import { renderHealth, renderMoney } from './ui-private.js';
import { $, el, clear, activeDate } from './util.js';

const TABS = [
  ['today', 'Today', '📅', renderToday],
  ['week', 'Week', '✅', renderWeek],
  ['life', 'Life', '🌙', renderLife],
  ['health', 'Health', '⚖️', renderHealth],
  ['money', 'Money', '💷', renderMoney],
];
let active = 'today';
let installPrompt = null;

function showTab(id) {
  active = id;
  const root = $('#tab-root');
  clear(root);
  const tab = TABS.find((t) => t[0] === id);
  tab[3](root);
  [...$('#tabbar').children].forEach((b) => b.classList.toggle('active', b.dataset.id === id));
  root.scrollTop = 0;
}

function buildTabbar() {
  const bar = $('#tabbar');
  clear(bar);
  for (const [id, label, icon] of TABS) {
    bar.append(el('button.tab', { 'data-id': id, onclick: () => showTab(id) }, [
      el('span.tab-ic', {}, icon), el('span.tab-lb', {}, label),
    ]));
  }
}

function showLogin(errMsg) {
  $('#login').classList.remove('hidden');
  $('#app').classList.add('hidden');
  if (errMsg) $('#login-err').textContent = errMsg;
}

function showApp() {
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#demo-banner').classList.toggle('hidden', !state.demo);
  buildTabbar();
  showTab('today');
}

function wireLogin() {
  const email = $('#login-email');
  const pw = $('#login-pw');
  $('#btn-signin').onclick = async () => {
    try { await signIn(email.value, pw.value); } catch (e) { showLogin(e.message); }
  };
  $('#btn-signup').onclick = async () => {
    try { await signUp(email.value, pw.value); } catch (e) { showLogin(e.message); }
  };
}

function openSettings() {
  const m = $('#settings');
  const why = el('textarea.rev', { placeholder: 'Your why…' }); why.value = state.priv.whyLine || '';
  why.addEventListener('input', () => { state.priv.whyLine = why.value; save(); });

  const body = el('div', {}, [
    el('h3', {}, 'Settings'),
    el('label', {}, 'Your “why” (shown on Today)'), why,
    state.demo ? el('p.hint', {}, 'Demo mode — add Firebase in js/config.js to enable real login + the wife view. See README.') : idBlock(),
    el('button.btn.ghost', { onclick: () => m.classList.add('hidden') }, 'Close'),
    installPrompt ? el('button.btn', { onclick: doInstall }, '📲 Install app') : null,
    state.demo ? null : el('button.btn.ghost', { onclick: async () => { await signOutUser(); location.reload(); } }, 'Sign out'),
  ]);
  clear(m); m.append(el('div.modal-card', {}, body));
  m.classList.remove('hidden');
}

function idBlock() {
  const wifeInput = el('input.note-input', { placeholder: "paste wife's ID" });
  return el('div', {}, [
    el('p.hint', {}, ['Your ID: ', el('code', {}, myUid() || '—')]),
    el('label', {}, "Link your wife (paste the ID from her screen)"),
    el('div.row', {}, [wifeInput, el('button.btn.mini', {
      onclick: async () => { if (wifeInput.value.trim()) { await linkWife(wifeInput.value.trim()); alert('Linked ✓'); } },
    }, 'Link')]),
  ]);
}

function doInstall() { if (installPrompt) { installPrompt.prompt(); installPrompt = null; } }

async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
  $('#btn-settings').onclick = openSettings;
  wireLogin();
  await initAuth(async (user) => {
    if (!user) { showLogin(); return; }
    await loadOwner(activeDate());
    showApp();
  });
}

boot();
