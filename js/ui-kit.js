// Shared visual vocabulary: an inline-SVG icon set + a few composable pieces
// (icon chips, section headers, check circles, beads) used across every tab.
import { el } from './util.js';

const P = {
  dome: '<path d="M12 3c2.4 1.6 3.8 3.6 3.8 6H8.2C8.2 6.6 9.6 4.6 12 3z"/><path d="M6 21v-8l6-2.6 6 2.6v8"/><path d="M3.5 21h17"/><path d="M10 21v-3a2 2 0 0 1 4 0v3"/>',
  scissors: '<circle cx="6" cy="6.5" r="2.4"/><circle cx="6" cy="17.5" r="2.4"/><path d="M8 8l11 8"/><path d="M8 16l11-8"/>',
  car: '<path d="M6 16.5l1-5.3A2 2 0 0 1 9 9.5h6a2 2 0 0 1 2 1.7l1 5.3"/><rect x="4" y="15.5" width="16" height="3.5" rx="1.4"/><circle cx="8" cy="19.2" r="1.1"/><circle cx="16" cy="19.2" r="1.1"/>',
  heart: '<path d="M12 20.5s-6.6-4.3-8.6-8.2A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.6 5.3c-2 3.9-8.6 8.2-8.6 8.2z"/>',
  dumbbell: '<path d="M4 9.5v5M20 9.5v5M7 7v10M17 7v10M7 12h10"/>',
  briefcase: '<rect x="3" y="8" width="18" height="12" rx="2.2"/><path d="M8.5 8V6.4A2 2 0 0 1 10.5 4.4h3A2 2 0 0 1 15.5 6.4V8"/><path d="M3 13h18"/>',
  moon: '<path d="M20 14.6A8 8 0 1 1 9.4 4 6.6 6.6 0 0 0 20 14.6z"/>',
  van: '<path d="M3 16.5V8.5a1 1 0 0 1 1-1h8v9"/><path d="M12 10.5h4l4 3.5v2.5h-8"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="17" cy="17" r="1.5"/><path d="M3 16.5h2.5M9 16.5h6.5"/>',
  pin: '<path d="M12 21.5s-6-5.4-6-10.2A6 6 0 0 1 18 11.3c0 4.8-6 10.2-6 10.2z"/><circle cx="12" cy="11" r="2.1"/>',
  sun: '<circle cx="12" cy="12" r="3.6"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M5.9 5.9l1.4 1.4M16.7 16.7l1.4 1.4M18.1 5.9l-1.4 1.4M7.3 16.7l-1.4 1.4"/>',
  target: '<circle cx="12" cy="12" r="8"/><path d="M8.4 12.4l2.5 2.5 4.7-5.3"/>',
  pulse: '<path d="M3 12h4l2.2-5.2 3.6 10.4L15 12h6"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2.6"/><path d="M3 10.5h18"/><circle cx="16.5" cy="14" r="1.15"/>',
  gear: '<path d="M4 8h8.5M17 8h3"/><circle cx="14.5" cy="8" r="2.3"/><path d="M4 16h3M11.5 16h8.5"/><circle cx="9" cy="16" r="2.3"/>',
  flame: '<path d="M12 3c2.6 2.7 4.2 4.8 4.2 7.6a4.2 4.2 0 1 1-8.4 0c0-1.4.6-2.6 1.5-3.6.3 1 1.1 1.5 1.8 1.3C10.8 5.8 11 4.4 12 3z"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  chevron: '<path d="M9.5 6l6 6-6 6"/>',
  drop: '<path d="M12 3.5c3.4 3.9 5.8 6.3 5.8 9.2A5.8 5.8 0 0 1 6.2 12.7C6.2 9.8 8.6 7.4 12 3.5z"/>',
  steps: '<path d="M8 14c1.2 0 1.8-1.1 1.8-3.2C9.8 8 9 6.5 7.7 6.5S5.9 8.2 6.2 10.4C6.5 12.6 6.9 14 8 14z"/><path d="M16.4 17.5c1.1 0 1.6-1.2 1.4-3.2-.2-1.9-1-3-2.1-2.8-1.2.2-1.6 1.6-1.4 3.4.2 1.8.9 2.6 2.1 2.6z"/>',
  book: '<path d="M4 5.2A2 2 0 0 1 6 3.2h8.6a1 1 0 0 1 1 1v13.4a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2z"/><path d="M4 20.6a2 2 0 0 1 2-2h9.6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.4"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  gauge: '<path d="M4.5 16a7.5 7.5 0 0 1 15 0"/><path d="M12 16l3.2-4.2"/><circle cx="12" cy="16" r="1.1"/>',
  lock: '<rect x="5" y="10.2" width="14" height="9.8" rx="2.2"/><path d="M8 10.2V7.2a4 4 0 0 1 8 0v3"/>',
  film: '<rect x="3.2" y="5" width="17.6" height="14" rx="2.2"/><path d="M8 5v14M16 5v14M3.2 9.5h4.8M16 9.5h4.8M3.2 14.5h4.8M16 14.5h4.8"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8 17h6a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.4 4 5.5 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.5-4-9s1.4-6.6 4-9z"/>',
};

export const svg = (name, size = 22) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

export const icon = (name, size) => el('span.ic', { html: svg(name, size) });

// A tinted rounded-square holding an icon. tone: emerald | gold | plain
export const chip = (name, tone = 'emerald') => el(`span.chip.chip-${tone}`, { html: svg(name, 20) });

export function sectionTitle(name, title, tone = 'emerald') {
  return el('div.sec', {}, [chip(name, tone), el('h2.sec-title', {}, title)]);
}

export function check(done, onclick) {
  return el('button.check' + (done ? '.on' : ''), { 'aria-label': done ? 'done' : 'mark done', onclick },
    done ? el('span.ic', { html: svg('check', 16) }) : null);
}

// A single bead in a bead-track. filled = done. bonus = dashed/gold.
export function bead(on, onclick, bonus = false) {
  return el('button.bead' + (on ? '.on' : '') + (bonus ? '.bonus' : ''), { onclick },
    on ? el('span.ic', { html: svg('check', 14) }) : null);
}
