// Owner app: auth guard, tab router, settings.
import { state, initAuth, loadOwner, signIn, signUp, signOutUser, myUid, linkWife, save } from './store.js';
import { renderToday } from './ui-today.js';
import { renderWeek } from './ui-week.js';
import { renderLife } from './ui-life.js';
import { renderHealth, renderMoney } from './ui-private.js';
import { $, el, clear, activeDate } from './util.js';
import { svg } from './ui-kit.js';

const TABS = [
  ['today', 'Today', 'sun', renderToday],
  ['week', 'Week', 'target', renderWeek],
  ['life', 'Life', 'moon', renderLife],
  ['health', 'Body', 'pulse', renderHealth],
  ['money', 'Money', 'wallet', renderMoney],
];
let installPrompt = null;

function showTab(id) {
  const root = $('#tab-root');
  clear(root);
  TABS.find((t) => t[0] === id)[3](root);
  root.classList.remove('enter'); void root.offsetWidth; root.classList.add('enter');
  [...$('#tabbar').children].forEach((b) => b.classList.toggle('active', b.dataset.id === id));
}

function buildTabbar() {
  const bar = $('#tabbar');
  clear(bar);
  for (const [id, label, ic] of TABS) {
    bar.append(el('button.tab', { 'data-id': id, onclick: () => showTab(id) }, [
      el('span.ic', { html: svg(ic, 23) }), el('span', {}, label), el('span.tab-dot'),
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
  const wanted = new URLSearchParams(location.search).get('tab');
  showTab(TABS.some((t) => t[0] === wanted) ? wanted : 'today');
}

function wireLogin() {
  $('#btn-signin').onclick = async () => { try { await signIn($('#login-email').value, $('#login-pw').value); } catch (e) { showLogin(e.message); } };
  $('#btn-signup').onclick = async () => { try { await signUp($('#login-email').value, $('#login-pw').value); } catch (e) { showLogin(e.message); } };
}

function openSettings() {
  const m = $('#settings');
  const why = el('textarea.rev', { placeholder: 'Your why…' }); why.value = state.priv.whyLine || '';
  why.addEventListener('input', () => { state.priv.whyLine = why.value; save(); });

  const body = el('div', {}, [
    el('h3', { style: 'font-family:var(--serif);font-size:22px' }, 'Settings'),
    el('label', {}, 'Your “why” (shown on Today)'), why,
    state.demo ? el('p.hint', {}, 'Demo mode — add Firebase in js/config.js to enable real login and the wife view. See the README.') : linkBlock(),
    installPrompt ? el('button.btn', { onclick: () => { installPrompt.prompt(); installPrompt = null; } }, 'Install app') : null,
    state.demo ? null : el('button.btn.ghost', { onclick: async () => { await signOutUser(); location.reload(); } }, 'Sign out'),
    el('button.btn.ghost', { onclick: () => m.classList.add('hidden') }, 'Close'),
  ]);
  clear(m); m.append(el('div.modal-card', {}, body));
  m.classList.remove('hidden');
  m.onclick = (e) => { if (e.target === m) m.classList.add('hidden'); };
}

function linkBlock() {
  const wifeInput = el('input.input', { placeholder: "paste wife's ID" });
  return el('div', {}, [
    el('p.hint', {}, ['Your ID: ', el('code', {}, myUid() || '—')]),
    el('label', {}, 'Link your wife (paste the ID from her screen)'),
    el('div.row', {}, [wifeInput, el('button.btn.mini', { onclick: async () => { if (wifeInput.value.trim()) { await linkWife(wifeInput.value.trim()); alert('Linked ✓'); } } }, 'Link')]),
  ]);
}

async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
  $('#btn-settings').innerHTML = svg('gear', 22);
  $('#btn-settings').onclick = openSettings;
  wireLogin();
  await initAuth(async (user) => {
    if (!user) { showLogin(); return; }
    await loadOwner(activeDate());
    showApp();
  });
}

boot();
