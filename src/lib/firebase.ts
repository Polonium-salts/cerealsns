import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import type { AppConfig, SearxngInstance } from '../types';

import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfigJson.firestoreDatabaseId || undefined);
export const auth = getAuth(app);

// Ensure anonymous authentication for Firestore security compliance
export async function ensureAuth() {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (err) {
      console.warn('Firebase anonymous auth warning:', err);
    }
  }
}

const CONFIG_DOC_ID = 'global_nexus_config';

export async function loadAppConfigFromFirebase(): Promise<Partial<AppConfig> | null> {
  try {
    await ensureAuth();
    const docRef = doc(db, 'configs', CONFIG_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Partial<AppConfig>;
    }
  } catch (err) {
    console.warn('Failed to load config from Firebase Firestore, falling back to local storage:', err);
  }
  return null;
}

export async function saveAppConfigToFirebase(config: Partial<AppConfig>): Promise<boolean> {
  try {
    await ensureAuth();
    const docRef = doc(db, 'configs', CONFIG_DOC_ID);
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Failed to save config to Firebase Firestore:', err);
    return false;
  }
}

export async function fetchCuratedSearches() {
  try {
    await ensureAuth();
    const q = query(collection(db, 'curated_searches'), orderBy('createdAt', 'desc'), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Failed to fetch curated searches from Firestore:', err);
    return [];
  }
}
