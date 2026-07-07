// Prayer times via the Aladhan API, with a localStorage cache fallback so the
// app never shows a blank day when offline.
import { pad } from './util.js';

const FALLBACK = { fajr: '04:00', sunrise: '05:30', dhuhr: '13:00', asr: '17:00', maghrib: '21:00', isha: '22:30' };

// Pure: map an Aladhan response to our prayers shape. Strips "(BST)" etc.
export function parseAladhan(json) {
  const t = json.data.timings;
  const clean = (v) => String(v).split(' ')[0].trim();
  return {
    fajr: clean(t.Fajr), sunrise: clean(t.Sunrise), dhuhr: clean(t.Dhuhr),
    asr: clean(t.Asr), maghrib: clean(t.Maghrib), isha: clean(t.Isha),
  };
}

export async function getPrayerTimes(date, location, method) {
  const dd = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
  const key = `prayers:${location.lat},${location.lng}:${dd}`;
  const url = `https://api.aladhan.com/v1/timings/${dd}?latitude=${location.lat}&longitude=${location.lng}&method=${method}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const prayers = parseAladhan(await res.json());
    localStorage.setItem(key, JSON.stringify(prayers));
    localStorage.setItem('prayers:last', JSON.stringify(prayers));
    return prayers;
  } catch (_e) {
    const cached = localStorage.getItem(key) || localStorage.getItem('prayers:last');
    if (cached) return { ...JSON.parse(cached), stale: true };
    return { ...FALLBACK, stale: true, fallback: true };
  }
}
