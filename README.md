# ☾ Ayyub's Day

A prayer-anchored personal operating system for Ayyub — one installable web app that
auto-builds each day around live Chesham prayer times and his fixed Menspire shifts,
tracks his weekly goals across three businesses, and protects his health, marriage and
deen. A second **wife view** gives his wife a calm, read-only window into his day.

## Tabs
- **Today** — the auto-generated, prayer-anchored plan. Tick things off. Toggle a collection-trip day.
- **Week** — Barber ×3 · CFY ×4 · Taxi ×1 · Gym ×3(+1) · Date night ×1, completion %, the week's plan, and the Sunday review.
- **Life** — faith (prayer streak, Qur'an, Al-Kahf, Monday fast), marriage (date-night ideas, key dates), business ops (content bank, deal pipeline).
- **Health** *(PIN)* — weight 86→75kg on a gentle pace, gym, food/water/steps.
- **Money** *(PIN)* — savings only (no income), goal bar, Zakat reminder.

---

## Try it now (demo mode — zero setup)
The app runs fully offline against the browser's own storage until you add Firebase.

```bash
cd Ayyub-Planner
npm run serve          # or: python3 -m http.server 5173
```
Open **http://localhost:5173/** (Ayyub's app) and **http://localhost:5173/wife.html**
(the wife view — in demo it reads the schedule saved in the same browser).

> Demo mode has no login and no cross-device sync. That switches on when you add Firebase.

---

## Go live (≈10 minutes, once) — enables login + the wife's live view
1. **Create a Firebase project** at <https://console.firebase.google.com> (free "Spark" plan).
2. **Authentication → Sign-in method → enable Email/Password.**
3. **Authentication → Users → add two accounts:** one for Ayyub, one for his wife.
4. **Project settings → Your apps → Web app** → copy the config and paste it into
   `js/config.js` (replace every `PASTE_…` value).
5. **Firestore → Rules** → paste the contents of `firestore.rules` and publish
   (or run `firebase deploy --only firestore:rules`).
6. **Link the wife once:** she opens `wife.html`, signs in, and her screen shows an ID.
   Ayyub opens the app → ⚙︎ Settings → *Link your wife* → paste that ID. Done — his day
   now appears on her phone automatically.

## Deploy to GitHub Pages
```bash
git remote add origin https://github.com/<you>/ayyub-day.git
git push -u origin main
```
Then **repo → Settings → Pages → Source: `main` / root**. Share the Pages URL with Ayyub
(and `…/wife.html` with his wife). Both can **Add to Home Screen** to install it as an app.

> The Firebase web config is safe to keep in a public repo — access is controlled by
> `firestore.rules` + login, not by hiding the keys. Ayyub's savings/weight data lives in
> Firestore, never in the repo.

---

## Tweaking
Everything Ayyub-specific is in **`js/config.js`**: location, prayer calculation method,
shift hours, commute buffer, waking window, gym days, Jumuʿah time.

## Tests
```bash
npm test                 # pure day-engine + prayer parsing (Node, no deps)
node tools/smoke.mjs     # renders every tab in a headless DOM
```

## Structure
`js/engine.js` (pure, tested day generator) · `js/prayer.js` (Aladhan + offline cache) ·
`js/store.js` (Firebase **or** localStorage demo behind one interface) · `js/firebase.js` ·
`js/ui-*.js` (tabs) · `js/app.js` / `js/wife.js` (bootstraps) · `firestore.rules` · `sw.js` (offline).
