# Ayyub's Life Planner — Design Spec

**Date:** 2026-07-07
**For:** Ayyub (built by Melusi)
**Working title:** "Ayyub's Day" (product name easily changed later)

## 1. Overview

A prayer-anchored personal operating system for Ayyub, who runs three businesses
(Chesham Taxis, barbering at Menspire in Beaconsfield, and Consoles For You) while
protecting his marriage, his health, and his deen. It is a single installable web
app (PWA) that **auto-generates each day** around live prayer times and his fixed
barber shifts, then packs in the week's goals. He mostly just opens it and ticks
things off. A second, read-only **wife view** lets his wife see his rhythm and be
at ease about where he is and when they have time together.

Guiding principle: *if he follows it, some form of success is close to guaranteed* —
so the tool must cover work, body, marriage, money and faith as one coherent system,
without ever becoming a burden to maintain.

## 2. Users & roles

| Role | Login | Sees | Can edit |
|---|---|---|---|
| **Ayyub (owner)** | own email/password | Everything: Today · Week · Health · Money | Everything |
| **Wife** | own email/password | Curated read-only reassurance view | Nothing (read-only) |

- **Health** and **Money** tabs sit behind a **4-digit PIN** (on top of Ayyub's login)
  so a glance at his unlocked phone can't expose savings or weight.
- The wife's account **cannot read** savings, weight, or business-quota data at all —
  enforced by Firestore security rules, not just hidden in the UI.

## 3. Architecture

- **Frontend:** single-page PWA. Vanilla HTML/CSS/JS, ES modules, **no build step**.
  Mobile-first. Installable + offline shell via manifest + service worker.
- **Hosting:** GitHub Pages (public repo — safe, no private data lives in the repo).
- **Backend:** **Firebase** — Firestore (data + realtime sync) and Firebase Auth
  (email/password). Free Spark tier. No server code to run.
- **Firebase SDK:** loaded from the gstatic CDN (Firebase v10 modular) — no npm/bundler.
- **Prayer times:** [Aladhan API](https://aladhan.com/prayer-times-api) —
  `GET /v1/timings/{DD-MM-YYYY}?latitude=&longitude=&method=` — no key required.
  Default location Chesham, UK. Calculation `method` is a config constant so it can be
  matched to Ayyub's local mosque.

Data now lives in Firebase rather than only on-device, so his savings/weight history is
**cloud-backed** (survives a browser wipe) and syncs across his devices automatically.

## 4. Data model (Firestore)

```
households/{hid}
  ownerUid, wifeUid, whyLine, config{ location, prayerMethod, jumuahTime, wakingWindow }

households/{hid}/shared/current        ← wife-readable, owner-writable
  status: "working" | "home" | "away"
  awayBackBy, todaySummary, wifeTimeBlock, dateNightThisWeek{ done, note },
  prayerTimes{...}, dayAtAGlance[...], updatedAt

households/{hid}/private/owner         ← owner-only
  pinHash
  savings{ balance, goalAmount, goalLabel, deposits[{date, amount}] }
  weight{ startKg:86, goalKg:75, logs[{date, kg}] }
  weekState{ isoWeek, barber[3], cfy[4], taxi[1], gym[4], dateNight, completionPct }
  streaks{ prayerOnTime, gym, weeklyGoals }
  faith{ quranTicks, kahfFridays, mondayFasts }
  contentBank[{ id, business, idea, status: filmed|edited|posted }]
  dealPipeline[{ id, item, stage: lead|toCollect|collected|listed|sold }]   // no prices
  weeklyReviews[{ isoWeek, hit, slipped, lesson }]
  keyDates[{ label, date }]
  nutrition/water/steps daily ticks & targets
```

### Security rules (intent)
- `households/{hid}`: read/write if `auth.uid == ownerUid`; wife may **read** only.
- `.../shared/current`: read if `auth.uid in [ownerUid, wifeUid]`; write if owner.
- `.../private/**`: read **and** write only if `auth.uid == ownerUid`.

### Household linking (one-time)
Owner signs up → creates household. Wife signs up → her screen shows "your ID".
Owner pastes the wife's UID into Settings once → sets `wifeUid`. Done.

## 5. The day-generation engine (core logic)

Every open: fetch today's prayer times → classify the weekday → generate blocks →
overlay Firestore state (tick-offs, trip mode) → render "Now / Next".

**Day types** (JS `getDay()`: Sun=0 … Sat=6):
- **Barber:** Tue(2), Thu(4), Sun(0) — shift dominates.
- **Off:** Mon(1), Wed(3), Sat(6) — business engine.
- **Friday(5):** off day **+ Jumu'ah** (replaces the Dhuhr block, leave-buffer included).

**Constants (top of file, easy to tweak):**
- `LOCATION` Chesham ≈ 51.708, −0.612
- `SHIFTS` { Tue: 10–18, Thu: 10–20, Sun: 10–16 }
- `COMMUTE_MIN` 20 (Chesham ↔ Beaconsfield)
- `WAKING_WINDOW` ~07:00–23:00 — **work blocks are clamped to this** so an early
  summer Fajr (can be ~02:40 in the UK) shows as an anchor but never spawns a 3am task.
- `WIFE_TIME_MIN` 90, `GYM_MIN` 60, `JUMUAH_TIME` ~13:00, `PRAYER_METHOD` (UK-appropriate)

**Barber day** (e.g. Tue): Fajr → get-ready → depart (shift−commute) → **shift block**
tagged `🎥 film 1 barber video`, with Dhuhr & Asr shown inside as *"pray on break at
the chair"* → drive home → Maghrib → **wife time 90m** → light overflow (upload) →
Isha wind-down.

**Off day** (e.g. Mon): Fajr → morning **wife time 90m** (+ **gym 60m** on gym days) →
Dhuhr → pooled tasks → Asr → more tasks → Maghrib → buffer/rest → Isha wind-down.

## 6. Weekly plan (how quotas map onto the week)

| Day | Assigned |
|---|---|
| Tue / Thu / Sun | Film 1 barber video each at the chair → **3 barber** |
| Mon | CFY **sourcing** + 1 CFY video · gym |
| Wed | 2 CFY videos + **1 taxi growth task** · gym |
| Fri | Jumu'ah + 1 CFY video + edit/upload barber vids |
| Sat | CFY **sourcing** + buffer/overflow (catch up) · gym |

→ CFY 4 ✓ · Barber 3 ✓ · Taxi 1 ✓ · Gym 3 core (+1 optional). Sourcing and
filming/editing are always **separate blocks**.

**Taxi task rotates** so it's never blank: run ads → check bookings growth → chase
reviews → refresh photos → update listings.

**Weekly tracker row:** `Barber ▢▢▢ · CFY ▢▢▢▢ · Taxi ▢ · Gym ▢▢▢(▢) · Date Night ▢`
+ a weekly completion %. Auto-resets each **Monday** (compare stored ISO week).

## 7. Feature modules (v1 scope — everything agreed)

- **Today** — the auto-generated prayer-anchored plan + live Now/Next marker + tick-offs.
- **Week** — the tracker above + Sunday 2-minute weekly review (hit / slipped / one lesson).
- **Marriage** — daily 1.5h auto-placed (evening on barber days, morning on off days);
  separate **weekly date night** (once/week, variable, optional quick note) + **date-night
  idea bank** + **key dates** (anniversary/birthdays, gentle heads-up).
- **Collection-trip mode** — toggle on any day (usually Fri/Sat): swaps the off-day grid
  for an "on the road" template (sourcing/collection focus + extra-content nudge), pulls
  **local** prayer times where he actually is (manual city or GPS), and flips his
  **away-status + back-by** for the wife view. Saturday buffer absorbs any missed quota.
- **Health** *(PIN)* — weight log (86→75 kg, gentle ~0.5 kg/week reference line, **no
  deadline**, celebrates progress); gym log; light nutrition tick + protein target;
  water & steps targets.
- **Money** *(PIN)* — savings balance + deposits + goal bar + label + annual Zakat
  reminder. **No income/revenue fields anywhere.**
- **Faith** — prayer-on-time streak, daily Qur'an/dhikr tick, Friday Al-Kahf nudge,
  Monday sunnah fast, post-Isha wind-down anchor.
- **Momentum** — streaks (prayer / gym / weekly-goals) + weekly completion % + a pinned
  **"why" line that names his wife**.
- **Business ops** — content ideas bank (`filmed → edited → posted`) + CFY deal pipeline
  (stages only, **no prices**).
- **Wife view** — curated read-only: where he is now/next, today's protected time
  together, this week's date night, the day's prayers, day-at-a-glance (working / home /
  away-collecting, back by…). Reads only `shared/current`.
- **PWA** — installable, offline shell, data export. **Best-effort reminders**
  (leave-now / prayer-soon / gym) — reliable in-app while open; OS notifications attempted
  where supported (install-required, may be flaky on iPhone — set expectations in UI).

## 8. One-time human setup (owner-gated)

I scaffold all code + security rules + a click-by-click guide. Ayyub/Melusi then:
1. Create a Firebase project (free).
2. Enable **Email/Password** auth.
3. Create Ayyub's + his wife's accounts.
4. Paste the Firebase web config into the app's config file.
5. Publish the Firestore security rules (console paste or `firebase deploy`).
6. Link the wife once (paste her UID in Settings).

~10 minutes, once.

## 9. Error handling & resilience

- Prayer fetch fails / offline → fall back to the **last cached** prayer times with a
  small "using saved times" notice; never a blank day.
- Firestore offline → Firebase SDK's local cache serves the last synced state; writes
  queue and sync on reconnect.
- No auth → show login screen; nothing else renders.
- Collection-trip travel far → prompt to confirm/override location for accurate prayers.

## 10. Testing / verification approach

- **Day engine:** a `?date=YYYY-MM-DD` override to render any weekday; confirm each of
  the 7 day-types (barber ×3, off ×3, Friday) generates correct blocks, commute buffers,
  and which prayers land inside the shift.
- **Weekly reset:** simulate an ISO-week rollover → quotas clear, streaks persist.
- **PIN gate:** Health/Money locked until correct PIN; wrong PIN blocks.
- **Roles/rules:** with the Firebase Rules simulator (or emulator), verify the wife's UID
  can read `shared/current` but is **denied** on `private/**`.
- **Collection-trip mode:** toggling sets away-status and the wife view reflects it live.
- **Offline:** service worker serves the shell; cached prayer times render.
- Drive the real app end-to-end on a phone before handing over.

## 11. Out of scope (v1)

- Monthly progress photos (needs Firebase Storage — deferred to keep setup light).
- Server-driven push notifications (best-effort local only for now).
- **Income/revenue tracking** (deliberately excluded — savings only).
- Calendar sync, native apps.

## 12. Tech summary

Vanilla JS ES-module PWA · Firebase (Firestore + Auth) via CDN · Aladhan API ·
GitHub Pages hosting · no build step · mobile-first · localStorage only for the
PIN-session flag and offline cache; source of truth is Firestore.
