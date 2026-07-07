// Ayyub's Life Planner — configuration.
// Everything Ayyub-specific lives here so it is easy to tweak in one place.

export const CONFIG = {
  // Home location (Chesham, UK). Prayer times are fetched for this by default.
  location: { lat: 51.708, lng: -0.612, name: 'Chesham' },

  // Aladhan calculation method. 3 = Muslim World League. Change to match
  // Ayyub's local mosque if their printed timetable differs.
  prayerMethod: 3,

  // Fixed Menspire barber shifts, keyed by JS weekday (Sun=0 … Sat=6).
  // [startHour, endHour] in 24h.
  shifts: { 0: [10, 16], 2: [10, 18], 4: [10, 20] }, // Sun 10–16, Tue 10–18, Thu 10–20

  commuteMin: 20,        // Chesham ↔ Beaconsfield, each way
  wakingStart: '07:00',  // work blocks never scheduled before this…
  wakingEnd: '23:00',    // …or after this (early UK Fajr still shows as an anchor)
  wifeTimeMin: 90,       // protected daily time together
  gymMin: 60,
  gymDays: [1, 3, 6],    // Mon, Wed, Sat (core 3; Fri optional 4th)
  jumuahTime: '13:00',   // adjust to Ayyub's masjid
};

// Paste the Firebase web-app config here after creating the project (see README).
export const FIREBASE_CONFIG = {
  apiKey: 'PASTE_API_KEY',
  authDomain: 'PASTE_PROJECT.firebaseapp.com',
  projectId: 'PASTE_PROJECT_ID',
  storageBucket: 'PASTE_PROJECT.appspot.com',
  messagingSenderId: 'PASTE_SENDER_ID',
  appId: 'PASTE_APP_ID',
};

export const WHY_DEFAULT =
  'Build the three businesses · reach a healthy 75kg · be present for my wife · draw closer to Allah';

// True once real Firebase details have been pasted in.
export const FIREBASE_READY = !FIREBASE_CONFIG.apiKey.startsWith('PASTE_');
