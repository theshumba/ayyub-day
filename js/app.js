// Owner app — no login. Opens straight to the day. Tab router + settings.
import { state, initOwner, save, shareLink, exportData, importData } from './store.js';
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

function showApp() {
  $('#app').classList.remove('hidden');
  $('#sync-note').classList.toggle('hidden', state.cloud);
  buildTabbar();
  const wanted = new URLSearchParams(location.search).get('tab');
  showTab(TABS.some((t) => t[0] === wanted) ? wanted : 'today');
}

async function shareWithWife() {
  const link = shareLink();
  if (navigator.share) { try { await navigator.share({ title: 'Ayyub’s Day', text: 'My day, for you.', url: link }); return; } catch (_e) { /* cancelled */ } }
  try { await navigator.clipboard.writeText(link); alert('Link copied — send it to your wife once.'); }
  catch (_e) { prompt('Copy this link and send it to your wife:', link); }
}

function backup() {
  const blob = new Blob([exportData()], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: 'ayyub-day-backup.json' });
  a.click(); URL.revokeObjectURL(a.href);
}
function restore() {
  const inp = el('input', { type: 'file', accept: 'application/json' });
  inp.addEventListener('change', () => {
    const f = inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { importData(r.result); alert('Restored ✓'); location.reload(); } catch (_e) { alert('Could not read that backup file.'); } };
    r.readAsText(f);
  });
  inp.click();
}

function openSettings() {
  const m = $('#settings');
  const why = el('textarea.rev', { placeholder: 'Your why…' }); why.value = state.priv.whyLine || '';
  why.addEventListener('input', () => { state.priv.whyLine = why.value; save(); });

  const body = el('div', {}, [
    el('h3', { style: 'font-family:var(--serif);font-size:22px' }, 'Settings'),
    el('label', {}, 'Your “why” (shown on Today)'), why,
    el('label', {}, 'Wife’s view'),
    el('button.btn', { onclick: shareWithWife }, 'Share my day with my wife'),
    el('p.hint', {}, 'Send her the link once. Her view updates automatically after that — no login for either of you.'),
    el('label', {}, 'Your data (kept only on this phone)'),
    el('div.row', {}, [
      el('button.btn.ghost', { onclick: backup, style: 'flex:1' }, 'Back up'),
      el('button.btn.ghost', { onclick: restore, style: 'flex:1' }, 'Restore'),
    ]),
    installPrompt ? el('button.btn.ghost', { onclick: () => { installPrompt.prompt(); installPrompt = null; } }, 'Install app') : null,
    el('button.btn.ghost', { onclick: () => m.classList.add('hidden') }, 'Close'),
  ]);
  clear(m); m.append(el('div.modal-card', {}, body));
  m.classList.remove('hidden');
  m.onclick = (e) => { if (e.target === m) m.classList.add('hidden'); };
}

async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
  $('#btn-settings').innerHTML = svg('gear', 22);
  $('#btn-settings').onclick = openSettings;
  await initOwner(activeDate());
  showApp();
}

boot();
