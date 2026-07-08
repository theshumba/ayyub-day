// Firebase wiring — Firestore only (no auth). Loaded from the gstatic CDN, no build step.
// Used solely to sync the reassurance status doc between Ayyub's phone and his wife's.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, doc, setDoc, onSnapshot,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { FIREBASE_CONFIG } from './config.js';

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const sharedRef = (hid) => doc(db, 'households', hid, 'shared', 'current');

export const fb = {
  setShared: (hid, data) => setDoc(sharedRef(hid), data, { merge: true }),
  watchShared: (hid, cb) => onSnapshot(sharedRef(hid), (snap) => cb(snap.exists() ? snap.data() : null)),
};
