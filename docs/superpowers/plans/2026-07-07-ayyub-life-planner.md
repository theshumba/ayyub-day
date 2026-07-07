# Ayyub's Life Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a prayer-anchored personal-OS PWA for Ayyub — auto-generated daily plan, weekly goal tracking, health/money/faith/marriage modules, PIN-locked private data, and a read-only wife view with live status — backed by Firebase.

**Architecture:** Static vanilla-JS ES-module PWA (no build step) on GitHub Pages. A pure `engine.js` generates each day from live Aladhan prayer times + fixed rules. Firebase (Firestore + Auth) holds data and syncs the shared status to the wife's read-only view. Owner and wife each have their own login; security rules — not UI hiding — enforce that the wife cannot read private data.

**Tech Stack:** HTML/CSS/vanilla JS (ES modules), Firebase v10 modular SDK (via gstatic CDN), Aladhan prayer-times API, service worker + web manifest, Node `--test` for engine unit tests.

## Global Constraints

- **No build step / no bundler** — plain ES modules loaded by the browser; Firebase from CDN.
- **No income/revenue fields anywhere** — savings only.
- **Wife account must be denied read on `private/**`** — enforced in `firestore.rules`, verified.
- **Work blocks clamped to the waking window** (`~07:00–23:00`) — an early UK Fajr shows as an anchor but never spawns a pre-dawn work block.
- **Location default:** Chesham ≈ lat `51.708`, lng `-0.612`. **Prayer `method`** is a config constant to match Ayyub's mosque.
- **Shifts (fixed):** Tue 10–18, Thu 10–20, Sun 10–16. Commute buffer 20 min.
- **Weekly quotas:** Barber 3 · CFY 4 · Taxi 1 · Gym 3 (+1 optional) · Date Night 1. Reset Monday (ISO week).
- **Weight goal:** 86 → 75 kg, gentle ~0.5 kg/week reference line, **no deadline**.
- Firestore is source of truth; localStorage only for the PIN-session flag and offline prayer cache.

---

## File Structure

```
index.html              Owner app shell (login + 4 tabs)
wife.html               Wife read-only view (own login)
manifest.webmanifest    PWA manifest
sw.js                   Service worker: offline shell + prayer cache
css/styles.css          All styles, mobile-first
js/config.js            Constants + Firebase web config (placeholders) + LOCATION/SHIFTS/etc.
js/engine.js            PURE day-generation logic (unit-tested)
js/prayer.js            Aladhan fetch + localStorage cache fallback
js/firebase.js          Firebase init, Auth (sign in/up/out/observe), Firestore handles
js/store.js             Data layer: household link, load/save private, read/write shared, week reset
js/ui-today.js          Today tab: render blocks + Now/Next + tick-offs
js/ui-week.js           Week tab: tracker + completion % + Sunday review
js/ui-private.js        Health + Money tabs (behind PIN) + pin gate
js/ui-life.js           Marriage + Faith + Business-ops modules
js/trip.js              Collection-trip mode: reshape day + set away-status
js/app.js               Owner bootstrap: auth guard, tab router, wire modules
js/wife.js              Wife bootstrap: auth guard, subscribe shared/current, render
firestore.rules         Security rules
tests/engine.test.mjs   Node --test suite for engine.js
README.md               Firebase setup guide (the 6 one-time steps) + deploy
```

Interface contracts (used across tasks):

```js
// prayers object (24h strings): { fajr, sunrise, dhuhr, asr, maghrib, isha }
// config: { location:{lat,lng,name}, shifts:{0:[10,16],2:[10,18],4:[10,20]},
//   commuteMin:20, wakingStart:'07:00', wakingEnd:'23:00', wifeTimeMin:90,
//   gymMin:60, gymDays:[1,3,6], jumuahTime:'13:00', prayerMethod:3 }

// engine.js exports:
classifyDay(date, config) -> { type:'barber'|'off'|'friday', shift?:{startH,endH} }
isoWeekKey(date) -> 'YYYY-Www'
taxiTaskForWeek(isoWeekKey) -> string
weeklyPlan(isoWeekKey) -> { barberDays:[0,2,4], Mon:[..], Wed:[..], Fri:[..], Sat:[..] }
generateDay({ date, prayers, config, trip? }) ->
  { dayType, summary, blocks:[{ start, end, kind, label, tags:[], prayer?:bool, note? }] }

// prayer.js exports:
getPrayerTimes(date, location, method) -> Promise<prayers>   // cache-fallback on failure
parseAladhan(json) -> prayers                                 // pure, testable

// store.js exports (all async unless noted):
watchAuth(cb) ; signIn(email,pw) ; signUp(email,pw) ; signOutUser()
myUid() (sync) ; getHousehold() ; createHousehold() ; linkWife(uid)
loadPrivate() ; savePrivate(patch) ; readShared(cb subscribe) ; writeShared(patch)
ensureWeek(isoWeekKey) -> weekState   // resets quotas if week changed
```

---

### Task 1: Scaffold + shell + config

**Files:** Create `index.html`, `css/styles.css`, `js/config.js`, `js/app.js` (stub).

- [ ] **Step 1:** Write `js/config.js` — export `CONFIG` (constants above) and `FIREBASE_CONFIG` with clearly-marked `"PASTE_..."` placeholder strings + the day/prayer constants.
- [ ] **Step 2:** Write `index.html` — meta viewport, link manifest, a `#login` view and a `#app` view with a bottom tab bar (Today · Week · Health · Money) and empty `<section>` per tab; module script `js/app.js`.
- [ ] **Step 3:** Write `css/styles.css` — mobile-first, CSS variables for palette (calm, deen-appropriate — deep green/ink/sand), tab bar, cards, prayer-anchor row style. Light/dark via `prefers-color-scheme`.
- [ ] **Step 4:** `js/app.js` stub renders "loading" and toggles login/app views.
- [ ] **Step 5: Verify** — `npx serve` (or `python3 -m http.server`) and open; login view shows, tabs switch. **Commit.**

### Task 2: Day-generation engine (TDD, pure)

**Files:** Create `js/engine.js`, `tests/engine.test.mjs`.
**Interfaces:** Produces the `engine.js` exports above; consumes nothing (pure).

- [ ] **Step 1: Write failing tests** in `tests/engine.test.mjs` (`node:test` + `node:assert`):

```js
import { test } from 'node:test'; import assert from 'node:assert/strict';
import { classifyDay, isoWeekKey, taxiTaskForWeek, generateDay } from '../js/engine.js';
const CONFIG = { shifts:{0:[10,16],2:[10,18],4:[10,20]}, commuteMin:20,
  wakingStart:'07:00', wakingEnd:'23:00', wifeTimeMin:90, gymMin:60,
  gymDays:[1,3,6], jumuahTime:'13:00' };
const P = { fajr:'03:10', sunrise:'04:50', dhuhr:'13:05', asr:'17:20', maghrib:'21:15', isha:'22:40' };
const d = s => new Date(s+'T12:00:00');

test('Tue is a barber day 10-18', () => {
  const r = classifyDay(d('2026-07-07'), CONFIG); // Tue
  assert.equal(r.type,'barber'); assert.deepEqual([r.shift.startH,r.shift.endH],[10,18]);
});
test('Friday is friday type', () => assert.equal(classifyDay(d('2026-07-10'),CONFIG).type,'friday'));
test('Monday is off', () => assert.equal(classifyDay(d('2026-07-06'),CONFIG).type,'off'));
test('isoWeekKey format', () => assert.match(isoWeekKey(d('2026-07-07')), /^2026-W\d{2}$/));
test('taxi task rotates deterministically', () => {
  const a=taxiTaskForWeek('2026-W28'), b=taxiTaskForWeek('2026-W29');
  assert.notEqual(a,b); assert.equal(a, taxiTaskForWeek('2026-W28'));
});
test('barber day: shift block tagged film, prayers inside flagged, wife-time after maghrib, no pre-waking work', () => {
  const {blocks} = generateDay({date:d('2026-07-07'), prayers:P, config:CONFIG});
  const shift = blocks.find(b=>b.kind==='shift');
  assert.ok(shift.tags.includes('film-barber'));
  assert.ok(blocks.some(b=>b.kind==='wife' )); // present
  const wife = blocks.find(b=>b.kind==='wife');
  assert.ok(wife.start >= P.maghrib);           // evening on barber day
  assert.ok(!blocks.some(b=>b.kind==='work' && b.start < CONFIG.wakingStart));
  assert.ok(blocks.some(b=>b.prayer)); // fajr etc shown even though 03:10
});
test('off day Monday: morning wife-time + gym', () => {
  const {blocks}=generateDay({date:d('2026-07-06'),prayers:P,config:CONFIG});
  assert.ok(blocks.some(b=>b.kind==='wife' && b.start < P.dhuhr));
  assert.ok(blocks.some(b=>b.kind==='gym'));
});
test('friday has a jumuah block', () => {
  const {blocks}=generateDay({date:d('2026-07-10'),prayers:P,config:CONFIG});
  assert.ok(blocks.some(b=>b.kind==='jumuah'));
});
test('trip mode swaps to on-the-road blocks', () => {
  const {blocks}=generateDay({date:d('2026-07-11'),prayers:P,config:CONFIG,trip:true}); // Sat
  assert.ok(blocks.some(b=>b.kind==='trip'));
  assert.ok(!blocks.some(b=>b.kind==='gym'));
});
```

- [ ] **Step 2: Run, verify fail** — `node --test` → FAIL (module not found / exports undefined).
- [ ] **Step 3: Implement `js/engine.js`** — pure functions per contract: `classifyDay` (getDay map), `isoWeekKey` (Thursday-of-week algorithm), `taxiTaskForWeek` (index into `['Run ads','Check bookings growth','Chase reviews','Refresh photos','Update listings']` by week number mod length), `weeklyPlan`, `generateDay` (build prayer anchors always; add shift/commute/film for barber; morning wife+gym & pooled tasks for off; jumuah for friday; trip template when `trip`; clamp non-prayer work blocks to waking window; sort by `start`).
- [ ] **Step 4: Run, verify pass** — `node --test` → all pass.
- [ ] **Step 5: Commit.**

### Task 3: Prayer times (Aladhan + cache)

**Files:** Create `js/prayer.js`; add a parse test to `tests/engine.test.mjs` (or `tests/prayer.test.mjs`).
**Interfaces:** `getPrayerTimes`, `parseAladhan` (above).

- [ ] **Step 1:** Failing test for `parseAladhan` mapping a sample Aladhan JSON `data.timings` (Fajr/Dhuhr/Asr/Maghrib/Isha, strip " (BST)") → `prayers` object.
- [ ] **Step 2:** Run → fail.
- [ ] **Step 3:** Implement `parseAladhan` (pure) + `getPrayerTimes(date,loc,method)`: build `DD-MM-YYYY`, `fetch` Aladhan, `parseAladhan`, cache to `localStorage['prayers:'+key]`; on fetch error return cached (any recent) with a `{stale:true}` marker.
- [ ] **Step 4:** Run → pass.
- [ ] **Step 5:** Manual: in browser console `getPrayerTimes(new Date(), CONFIG.location, 3)` logs today's Chesham times. **Commit.**

### Task 4: Firebase init + Auth + login UI

**Files:** Create `js/firebase.js`; extend `index.html` login form + `js/app.js`.
**Interfaces:** `watchAuth, signIn, signUp, signOutUser, myUid`.

- [ ] **Step 1:** `js/firebase.js` — `import` Firebase app/auth/firestore from gstatic CDN, `initializeApp(FIREBASE_CONFIG)`, export auth helpers + `db`.
- [ ] **Step 2:** Login UI in `index.html`: email, password, Sign in / Create account, error line; a "Your ID: …" readout after login (for wife-linking).
- [ ] **Step 3:** `js/app.js`: `watchAuth` → show `#app` when signed in, `#login` otherwise; wire buttons; sign-out button in a Settings/hamburger.
- [ ] **Step 4: Verify** (needs real config OR Firebase Auth emulator): create an account, sign in, reload persists session, sign out. **Commit.**

### Task 5: Store layer (household, private, shared, week reset)

**Files:** Create `js/store.js`.
**Interfaces:** the `store.js` exports above; consumes `firebase.js` + `engine.isoWeekKey`.

- [ ] **Step 1:** Implement household bootstrap: on first owner login with no household → `createHousehold()` (doc with `ownerUid`, empty `wifeUid`, default `config`, `whyLine`). `getHousehold()` finds the household where `ownerUid==myUid` OR `wifeUid==myUid`.
- [ ] **Step 2:** `loadPrivate()/savePrivate(patch)` on `households/{hid}/private/owner` (merge). `readShared(cb)` subscribes to `households/{hid}/shared/current`; `writeShared(patch)` merges (owner only).
- [ ] **Step 3:** `ensureWeek(key)` — read `weekState`; if `weekState.isoWeek !== key` reset quota arrays/booleans (keep streaks) and persist.
- [ ] **Step 4:** `linkWife(uid)` sets `wifeUid` on the household.
- [ ] **Step 5: Verify** with emulator/real: owner login creates household; `ensureWeek` resets on a changed key (temporarily pass an old key). **Commit.**

### Task 6: Today tab

**Files:** Create `js/ui-today.js`; wire in `js/app.js`.
**Interfaces:** consumes `generateDay`, `getPrayerTimes`, `store`.

- [ ] **Step 1:** On Today render: `getPrayerTimes` → `generateDay` → render blocks as a timeline of cards; prayers styled as anchors; shift/wife/gym/task cards with icons; tick-off checkboxes persist to `savePrivate` and update `weekState`.
- [ ] **Step 2:** "Now / Next" — compute current block from clock; highlight; show a small "leave now" note before shift/jumuah.
- [ ] **Step 3:** After render, `writeShared` today's `status` (working/home from shift block vs clock), `wifeTimeBlock`, `todaySummary`, `dayAtAGlance`, `prayerTimes`.
- [ ] **Step 4: Verify** using `?date=YYYY-MM-DD` override for a Tue, Mon, Fri, Sat; Now/Next moves with time. **Commit.**

### Task 7: Week tab + weekly review

**Files:** Create `js/ui-week.js`.

- [ ] **Step 1:** Render tracker rows (Barber ▢▢▢ · CFY ▢▢▢▢ · Taxi ▢ · Gym ▢▢▢(▢) · Date Night ▢) bound to `weekState`; toggling persists + recomputes completion %.
- [ ] **Step 2:** Show the week's taxi task (`taxiTaskForWeek`) and the Mon/Wed/Fri/Sat plan (`weeklyPlan`).
- [ ] **Step 3:** Sunday review card: hit / slipped / one-lesson inputs → append to `weeklyReviews`.
- [ ] **Step 4: Verify** ticks persist + reset next ISO week (emulate). **Commit.**

### Task 8: Health + Money behind PIN

**Files:** Create `js/ui-private.js`.

- [ ] **Step 1:** PIN gate — first use sets a 4-digit PIN (store `pinHash` = SHA-256 via WebCrypto in private doc); entering Health/Money prompts PIN, unlock for the session (localStorage flag).
- [ ] **Step 2:** Health — weight input appends `{date,kg}`; render trend list/sparkline + the gentle 0.5 kg/wk reference from 86→75 with an encouraging status; gym log; nutrition/water/steps daily ticks + targets.
- [ ] **Step 3:** Money — savings `balance`, add-deposit, `goalAmount`+`goalLabel` progress bar, annual Zakat reminder note. No income fields.
- [ ] **Step 4: Verify** wrong PIN blocks; weight/savings persist; bar updates. **Commit.**

### Task 9: Marriage + Faith + Business-ops

**Files:** Create `js/ui-life.js`.

- [ ] **Step 1:** Marriage — weekly date-night toggle + optional note; date-night idea bank (add/remove); key dates list with day-count.
- [ ] **Step 2:** Faith — prayer-on-time streak control, daily Qur'an/dhikr tick, Friday Al-Kahf nudge, Monday sunnah-fast tick; streaks update.
- [ ] **Step 3:** Ops — content ideas bank (item + business + status `filmed→edited→posted`), CFY deal pipeline (item + stage `lead→toCollect→collected→listed→sold`, **no prices**).
- [ ] **Step 4:** Pin the "why" line at the top of the app (editable in Settings).
- [ ] **Step 5: Verify** each persists + reflects in streaks/completion. **Commit.**

### Task 10: Collection-trip mode

**Files:** Create `js/trip.js`; hook into Today.

- [ ] **Step 1:** A "Collection trip 🚗" toggle on the Today tab with a "back by" and optional travel city.
- [ ] **Step 2:** When on: `generateDay({trip:true})`; if travel city set, `getPrayerTimes` for that location; `writeShared({status:'away', awayBackBy})`.
- [ ] **Step 3:** Saturday buffer note: show any unmet weekly quota as "catch up".
- [ ] **Step 4: Verify** toggling reshapes the day + shared status shows away. **Commit.**

### Task 11: Wife view

**Files:** Create `wife.html`, `js/wife.js`.

- [ ] **Step 1:** `wife.html` — own login (reuses `firebase.js`); "Your ID" readout so the owner can link her.
- [ ] **Step 2:** `js/wife.js` — after login, find her household (`wifeUid==myUid`), `readShared` subscribe; render a calm read-only card: status + back-by, today's time-together, this week's date night, the day's prayers, day-at-a-glance. **Never** queries `private/**`.
- [ ] **Step 3: Verify** with a second account linked as wife: she sees live status; toggling trip on owner reflects within seconds. **Commit.**

### Task 12: Security rules + verification

**Files:** Create `firestore.rules`.

- [ ] **Step 1:** Write rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /households/{hid} {
      allow read:  if isMember(hid);
      allow write: if isOwner(hid);
      match /shared/{doc} {
        allow read:  if isMember(hid);
        allow write: if isOwner(hid);
      }
      match /private/{doc=**} {
        allow read, write: if isOwner(hid);
      }
    }
  }
  function hh(hid){ return get(/databases/(default)/documents/households/$(hid)).data; }
  function isOwner(hid){ return request.auth != null && request.auth.uid == hh(hid).ownerUid; }
  function isMember(hid){ return request.auth != null &&
    (request.auth.uid == hh(hid).ownerUid || request.auth.uid == hh(hid).wifeUid); }
}
```
*(For the household doc's own read/write use `resource.data` instead of `hh(hid)` to avoid self-get; adjust at implementation.)*

- [ ] **Step 2: Verify** in the Firebase Rules Playground (or emulator): wife UID → allowed on `shared/current`, **denied** on `private/owner`. Owner → allowed on both. **Commit.**

### Task 13: PWA (installable + offline + best-effort reminders)

**Files:** Create `manifest.webmanifest`, `sw.js`; register SW in `app.js`/`wife.js`.

- [ ] **Step 1:** `manifest.webmanifest` — name, icons (inline data-URI or simple PNGs), `display:standalone`, theme color.
- [ ] **Step 2:** `sw.js` — cache the app shell (html/css/js) for offline; network-first for Aladhan with cache fallback.
- [ ] **Step 3:** Best-effort reminders: request Notification permission; while app open, fire in-app "leave now / prayer soon / gym" banners from the generated blocks (OS notifications where supported; note the iPhone caveat in Settings).
- [ ] **Step 4: Verify** Lighthouse installable; offline reload serves shell. **Commit.**

### Task 14: README setup guide + deploy

**Files:** Create `README.md`.

- [ ] **Step 1:** Write the 6 one-time Firebase steps (create project · enable Email/Password · create Ayyub + wife accounts · paste web config into `js/config.js` · publish `firestore.rules` · link wife by UID), plus GitHub Pages deploy (push repo, enable Pages on `main`).
- [ ] **Step 2: Verify** — final end-to-end pass on a phone against the real Firebase project; both logins; a full simulated week. **Commit + push.**

---

## Self-Review

- **Spec coverage:** every spec §7 module maps to Tasks 6–11; engine §5 → Task 2; prayer §3 → Task 3; data model/rules §4 → Tasks 5 & 12; PIN §2 → Task 8; wife view → Task 11; PWA §7 → Task 13; setup §8 → Task 14; error handling §9 → Tasks 3/6/13. No gaps.
- **Placeholders:** engine tests + security rules are concrete; UI tasks specify exact behaviour + persistence targets; Firebase config placeholders are intentional (owner-filled) and called out in README.
- **Type consistency:** `prayers`, `config`, `generateDay` block shape, and `store` signatures are defined once in File Structure and reused verbatim.
