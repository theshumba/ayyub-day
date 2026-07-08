// Headless smoke test: stub a minimal DOM, then render every tab in demo mode
// and assert each produces content without throwing. Catches typos / bad refs
// in the UI that the pure-engine tests can't. Run: node tools/smoke.mjs
import assert from 'node:assert/strict';

// ---- minimal fake DOM ----
function makeText(t) { return { nodeType: 3, textContent: t }; }
function makeNode(tag) {
  if (/\s/.test(tag)) throw new Error(`invalid tag name "${tag}" (spaces not allowed — did you mean a class?)`);
  const n = {
    tagName: tag, nodeType: 1, children: [], attrs: {}, _cls: new Set(),
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; },
    addEventListener() {}, removeChild(c) { this.children = this.children.filter((x) => x !== c); },
    append(...ks) { for (const k of ks) { if (k == null) continue; this.children.push(k.nodeType ? k : makeText(String(k))); } },
    appendChild(k) { this.append(k); return k; },
    querySelector() { return null; }, scrollTop: 0,
    classList: {
      add: (...c) => c.forEach((x) => n._cls.add(x)),
      remove: (...c) => c.forEach((x) => n._cls.delete(x)),
      toggle: (c, f) => { const on = f === undefined ? !n._cls.has(c) : f; on ? n._cls.add(c) : n._cls.delete(c); },
      contains: (c) => n._cls.has(c),
    },
    get firstChild() { return this.children[0] || null; },
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html || ''; },
    set textContent(v) { this._text = v; this.children = []; },
    get textContent() { return this._text != null ? this._text : this.children.map((c) => c.textContent || '').join(''); },
  };
  Object.defineProperty(n, 'className', { set(v) { n._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }, get() { return [...n._cls].join(' '); } });
  return n;
}
const store = {};
const memStore = (bag) => ({ getItem: (k) => (k in bag ? bag[k] : null), setItem: (k, v) => { bag[k] = String(v); }, removeItem: (k) => { delete bag[k]; } });

globalThis.__SMOKE__ = true;
globalThis.document = { createElement: makeNode, createTextNode: makeText, querySelector: () => null, getElementById: () => null };
globalThis.window = { addEventListener() {} };
globalThis.location = { search: '' };
globalThis.localStorage = memStore(store);
globalThis.sessionStorage = memStore({ 'pin:unlocked': '1' }); // pre-unlock Health/Money
globalThis.alert = () => {}; globalThis.prompt = () => null;
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({ data: { timings: { Fajr: '03:10', Sunrise: '04:50', Dhuhr: '13:05', Asr: '17:20', Sunset: '21:13', Maghrib: '21:15', Isha: '22:40' } } }),
});

// ---- boot store (no auth) ----
const s = await import('../js/store.js');
await s.initOwner(new Date('2026-07-07T12:00:00')); // a Tuesday (barber day)
assert.equal(s.state.ready, true, 'store ready');
assert.ok(s.state.hid, 'household id generated');

// ---- render every tab ----
const { renderToday } = await import('../js/ui-today.js');
const { renderWeek } = await import('../js/ui-week.js');
const { renderLife } = await import('../js/ui-life.js');
const { renderHealth, renderMoney } = await import('../js/ui-private.js');

async function check(name, fn, root) { await fn(root); assert.ok(root.children.length > 0, `${name} rendered content`); console.log(`  ✓ ${name} (${root.children.length} nodes)`); }

const R = () => makeNode('main');
await check('Today', renderToday, R());
await check('Week', (r) => renderWeek(r), R());
await check('Life', (r) => renderLife(r), R());
await check('Health', (r) => renderHealth(r), R());
await check('Money', (r) => renderMoney(r), R());

// shared status was published for the wife view (semantic payload)
const shared = JSON.parse(localStorage.getItem('ayyub:shared'));
assert.ok(shared.status && shared.dayType && Array.isArray(shared.glance) && shared.glance.length, 'wife shared status written');
console.log('  ✓ wife shared status published (status + dayType + glance)');
console.log('\nSmoke test passed ✓');
