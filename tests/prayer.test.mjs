import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAladhan } from '../js/prayer.js';

test('parseAladhan maps timings and strips timezone suffix', () => {
  const sample = {
    data: {
      timings: {
        Fajr: '03:10 (BST)', Sunrise: '04:50 (BST)', Dhuhr: '13:05 (BST)',
        Asr: '17:20 (BST)', Sunset: '21:13 (BST)', Maghrib: '21:15 (BST)', Isha: '22:40 (BST)',
      },
    },
  };
  assert.deepEqual(parseAladhan(sample), {
    fajr: '03:10', sunrise: '04:50', dhuhr: '13:05', asr: '17:20', maghrib: '21:15', isha: '22:40',
  });
});
