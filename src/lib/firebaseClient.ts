/**
 * src/lib/firebaseClient.ts
 *
 * Firebase SDK initialization (modular v9).
 *
 * Responsibilities:
 * - Initialize Firebase app using environment variables (REACT_APP_*)
 * - Export auth and firestore instances for use in the app
 *
 * Notes:
 * - For security, put real credentials into .env.local and do not commit them.
 * - A fallback config is provided to ease local testing if environment variables are not set.
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * firebaseConfigFromEnv
 * @description Build firebase config using environment variables or fallback values.
 */
const firebaseConfigFromEnv = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'AIzaSyBV9L0VTOkuFCjNQdHEgCsa3hGAuLQvoAM',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'trucktopia-5e69a.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'trucktopia-5e69a',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'trucktopia-5e69a.firebasestorage.app',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '392832885394',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:392832885394:web:468e16525825c3a21a3c4b',
};

/**
 * initFirebase
 * @description Initialize and return the FirebaseApp. Safe to call multiple times.
 * @returns {FirebaseApp}
 */
function initFirebase(): FirebaseApp {
  if (getApps().length) {
    // If already initialized, return first app
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return getApps()[0]!;
  }
  const app = initializeApp(firebaseConfigFromEnv as any);
  return app;
}

const firebaseApp = initFirebase();

/**
 * auth
 * @description Firebase Auth instance to be used in the React app.
 */
export const auth: Auth = getAuth(firebaseApp);

/**
 * db
 * @description Firestore instance to be used in the React app.
 */
export const db: Firestore = getFirestore(firebaseApp);

export default firebaseApp;
