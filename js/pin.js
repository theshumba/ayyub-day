// PIN gate for Health & Money — a real numeric keypad with 4 dots.
import { state, save } from './store.js';
import { sha256, el, clear } from './util.js';
import { svg } from './ui-kit.js';

let unlocked = sessionStorage.getItem('pin:unlocked') === '1';
function unlock() { unlocked = true; sessionStorage.setItem('pin:unlocked', '1'); }

export async function pinGate(container, renderProtected) {
  if (unlocked) { renderProtected(); return; }
  clear(container);
  const setting = !state.priv.pinHash;
  container.append(keypad(setting, async (code, fail) => {
    if (setting) { state.priv.pinHash = await sha256(code); save(); unlock(); renderProtected(); }
    else if ((await sha256(code)) === state.priv.pinHash) { unlock(); renderProtected(); }
    else fail();
  }));
}

function keypad(setting, onComplete) {
  let code = '';
  const dots = el('div.pin-dots', {}, [0, 1, 2, 3].map(() => el('span.pin-dot')));
  const err = el('div.pin-err');
  const refresh = () => { [...dots.children].forEach((d, i) => { d.className = 'pin-dot' + (i < code.length ? ' filled' : ''); }); };
  const fail = () => { err.textContent = 'Wrong PIN'; err.className = 'pin-err shake'; code = ''; refresh(); setTimeout(() => { err.className = 'pin-err'; }, 420); };
  const press = (d) => { if (code.length >= 4) return; code += d; refresh(); if (code.length === 4) setTimeout(() => onComplete(code, fail), 130); };
  const del = () => { code = code.slice(0, -1); refresh(); err.textContent = ''; };

  const keys = el('div.keypad');
  ['1', '2', '3', '4', '5', '6', '7', '8', '9'].forEach((n) => keys.append(el('button.key', { onclick: () => press(n) }, n)));
  keys.append(el('span.key.blank'));
  keys.append(el('button.key', { onclick: () => press('0') }, '0'));
  keys.append(el('button.key.act', { onclick: del }, 'Del'));

  return el('div.card.pin-wrap', {}, [
    el('div.pin-lock', { html: svg('lock', 26) }),
    el('div.pin-label', {}, setting ? 'Set a 4-digit PIN for Health & Money' : 'Enter your PIN'),
    dots, err, keys,
  ]);
}
