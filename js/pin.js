// 4-digit PIN gate for the Health & Money tabs. Soft gate (deters a glance at an
// unlocked phone); the PIN hash lives in the owner's private doc.
import { state, save } from './store.js';
import { sha256, el, clear } from './util.js';

let unlocked = sessionStorage.getItem('pin:unlocked') === '1';

function unlock() { unlocked = true; sessionStorage.setItem('pin:unlocked', '1'); }

function pinForm(label, onOk) {
  const input = el('input.pin-input', { type: 'password', inputmode: 'numeric', maxlength: '4', placeholder: '••••' });
  const err = el('p.pin-err');
  const submit = () => {
    if (!/^\d{4}$/.test(input.value)) { err.textContent = 'Enter 4 digits'; return; }
    onOk(input.value, err);
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  return el('div.card.pin-card', {}, [
    el('p.pin-label', {}, label), input, err,
    el('button.btn', { onclick: submit }, 'Unlock'),
  ]);
}

// Renders `renderProtected()` into `container` once the PIN passes.
export async function pinGate(container, renderProtected) {
  if (unlocked) { renderProtected(); return; }
  clear(container);
  if (!state.priv.pinHash) {
    container.append(pinForm('Set a 4-digit PIN to protect Health & Money', async (v) => {
      state.priv.pinHash = await sha256(v); save(); unlock(); renderProtected();
    }));
  } else {
    container.append(pinForm('Enter your PIN', async (v, err) => {
      if ((await sha256(v)) === state.priv.pinHash) { unlock(); renderProtected(); }
      else err.textContent = 'Wrong PIN';
    }));
  }
}
