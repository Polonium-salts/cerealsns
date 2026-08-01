import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit, getDocFromServer } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import type { AppConfig } from '../types';

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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Info:', JSON.stringify(errInfo));
}

// Timeout wrapper helper to prevent Firestore network hangs
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 3000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Firestore operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Ensure anonymous authentication for Firestore security compliance
export async function ensureAuth(): Promise<boolean> {
  if (auth.currentUser) return true;
  try {
    await withTimeout(signInAnonymously(auth), 2500);
    return true;
  } catch (err) {
    console.warn('Firebase auth notice (operating in offline/fallback mode):', err);
    return false;
  }
}

const CONFIG_DOC_ID = 'global_nexus_config';

export async function loadAppConfigFromFirebase(): Promise<Partial<AppConfig> | null> {
  try {
    const authed = await ensureAuth();
    if (!authed) return null;

    const docRef = doc(db, 'configs', CONFIG_DOC_ID);
    const snap = await withTimeout(getDoc(docRef), 3000);
    if (snap.exists()) {
      return snap.data() as Partial<AppConfig>;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `configs/${CONFIG_DOC_ID}`);
  }
  return null;
}

export async function saveAppConfigToFirebase(config: Partial<AppConfig>): Promise<boolean> {
  try {
    const authed = await ensureAuth();
    if (!authed) return false;

    const docRef = doc(db, 'configs', CONFIG_DOC_ID);
    await withTimeout(
      setDoc(
        docRef,
        {
          ...config,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ),
      3000
    );
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `configs/${CONFIG_DOC_ID}`);
    return false;
  }
}

export async function fetchCuratedSearches() {
  try {
    const authed = await ensureAuth();
    if (!authed) return [];

    const q = query(collection(db, 'curated_searches'), orderBy('createdAt', 'desc'), limit(10));
    const snap = await withTimeout(getDocs(q), 3000);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'curated_searches');
    return [];
  }
}

// Test connection on boot to detect offline/unreachable backend early
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await withTimeout(getDocFromServer(doc(db, 'test', 'connection')), 2000);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.info('Firestore operates in offline/local state.');
    }
    return false;
  }
}

