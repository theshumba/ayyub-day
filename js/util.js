// Tiny DOM + formatting helpers shared across the UI modules.

export const pad = (n) => String(n).padStart(2, '0');
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// el('div.card', { onclick }, [children | strings])
export function el(spec, props = {}, kids = []) {
  const [tag, ...cls] = spec.split('.');
  const node = document.createElement(tag || 'div');
  if (cls.length) node.className = cls.join(' ');
  for (const [k, v] of Object.entries(props)) {
    if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
  }
  for (const kid of [].concat(kids)) {
    if (kid == null) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

export const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };

// '13:05' -> '1:05 pm'
export function niceTime(hm) {
  if (!hm) return '';
  let [h, m] = hm.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${pad(m)} ${ap}`;
}

export const todayKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function nowHm(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Days until a MM-DD each year (for anniversaries/birthdays). Returns integer >= 0.
export function daysUntilAnnual(mmdd) {
  const [m, d] = mmdd.split('-').map(Number);
  const now = new Date();
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next = new Date(now.getFullYear() + 1, m - 1, d);
  }
  return Math.round((next - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
}

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

// Read ?date=YYYY-MM-DD override (for testing any weekday); else today.
export function activeDate() {
  const q = new URLSearchParams(location.search).get('date');
  if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return new Date(q + 'T12:00:00');
  return new Date();
}

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => pad(b.toString(16))).join('');
}
