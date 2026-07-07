// Firebase wiring — only imported when real config has been pasted into config.js.
// Loaded straight from the gstatic CDN so there is no build step.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot,
  collection, query, where, getDocs,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { FIREBASE_CONFIG } from './config.js';

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

export const fb = {
  auth,
  onAuth: (cb) => onAuthStateChanged(auth, cb),
  signIn: (email, pw) => signInWithEmailAndPassword(auth, email, pw),
  signUp: (email, pw) => createUserWithEmailAndPassword(auth, email, pw),
  signOut: () => signOut(auth),

  // Household doc id = owner's uid.
  ownerDoc: (hid) => doc(db, 'households', hid),
  privateDoc: (hid) => doc(db, 'households', hid, 'private', 'owner'),
  sharedDoc: (hid) => doc(db, 'households', hid, 'shared', 'current'),

  getDoc: (ref) => getDoc(ref),
  setDoc: (ref, data) => setDoc(ref, data, { merge: true }),
  watch: (ref, cb) => onSnapshot(ref, (snap) => cb(snap.exists() ? snap.data() : null)),

  // Find the household where the current user is the wife.
  findWifeHousehold: async (uid) => {
    const q = query(collection(db, 'households'), where('wifeUid', '==', uid));
    const snap = await getDocs(q);
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  },
};
