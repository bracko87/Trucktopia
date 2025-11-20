/**
 * src/lib/firebaseRest.ts
 *
 * Minimal Firebase REST client for Auth and Firestore.
 *
 * Purpose:
 * - Allow signUp / signIn against Firebase Auth REST endpoints (email/password).
 * - Allow simple Firestore document create / list using Firestore REST API.
 *
 * Notes:
 * - This implementation intentionally avoids the firebase npm package so it can run
 *   in environments where adding dependencies is not possible.
 * - It supports basic types (string, number, boolean, object, array) when writing documents.
 *
 * Environment variables required at runtime (set in your app env):
 * - REACT_APP_FIREBASE_API_KEY
 * - REACT_APP_FIREBASE_PROJECT_ID
 *
 * Security:
 * - Use only for client-side operations allowed by your Firestore security rules.
 * - For production, ensure rules and tokens are used safely.
 */

 /* eslint-disable no-console */
import { encode } from 'querystring';

/**
 * Get environment variables for Firebase configuration
 */
const FIREBASE_API_KEY = process.env.REACT_APP_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.REACT_APP_FIREBASE_PROJECT_ID || '';

/**
 * isFirebaseConfigured
 * @description Return true if essential Firebase env vars are present.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(FIREBASE_API_KEY && FIREBASE_PROJECT_ID);
}

/**
 * buildFirestoreUrl
 * @description Build Firestore REST base URL for the project and given path.
 * @param path string - additional path (e.g., 'documents/companies')
 */
function buildFirestoreUrl(path = ''): string {
  const base = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)`;
  return `${base}/${path}`.replace(/\/+$/, '');
}

/**
 * convertToFirestoreFields
 * @description Convert a plain JS object into Firestore REST fields format.
 *              Supports nested objects and arrays (recursively).
 * @param obj object
 */
function convertToFirestoreFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return { nullValue: null };
  }

  if (typeof obj === 'string') return { stringValue: obj };
  if (typeof obj === 'number') {
    // Decide integer vs double is complicated; use doubleValue for generality
    return { doubleValue: obj };
  }
  if (typeof obj === 'boolean') return { booleanValue: obj };
  if (Array.isArray(obj)) {
    return {
      arrayValue: {
        values: obj.map((v) => convertToFirestoreFields(v))
      }
    };
  }
  if (typeof obj === 'object') {
    const fields: Record<string, any> = {};
    Object.keys(obj).forEach((k) => {
      fields[k] = convertToFirestoreFields(obj[k]);
    });
    return { mapValue: { fields } };
  }
  // Fallback to string representation
  return { stringValue: String(obj) };
}

/**
 * authSignUp
 * @description Create a new Firebase Authentication user (email/password).
 *              Returns the full response from Firebase Identity Toolkit.
 * @param email string
 * @param password string
 */
export async function authSignUp(email: string, password: string): Promise<any> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(FIREBASE_API_KEY)}`;
  const body = { email, password, returnSecureToken: true };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) throw { status: res.status, body: json };
  return json;
}

/**
 * authSignIn
 * @description Sign-in (email/password) via Firebase REST. Returns idToken, refreshToken, localId.
 * @param email string
 * @param password string
 */
export async function authSignIn(email: string, password: string): Promise<any> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(FIREBASE_API_KEY)}`;
  const body = { email, password, returnSecureToken: true };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) throw { status: res.status, body: json };
  return json;
}

/**
 * createFirestoreDocument
 * @description Create a document in a top-level collection using Firestore REST API.
 *              The function will convert a plain JS object into Firestore value format.
 * @param collection string - collection name (e.g. 'companies')
 * @param data object - plain JS object to persist
 * @param idToken string | null - Firebase ID token (recommended for authenticated writes)
 * @param documentId optional desired document id
 */
export async function createFirestoreDocument(
  collection: string,
  data: Record<string, any>,
  idToken: string | null,
  documentId?: string
): Promise<any> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured (missing env vars)');
  }

  // Convert payload
  const payload = {
    fields: convertToFirestoreFields(data).mapValue ? convertToFirestoreFields(data).mapValue.fields : convertToFirestoreFields(data)
  };

  // Build URL; optionally specify documentId via ?documentId=xxx
  const urlBase = buildFirestoreUrl(`documents/${encodeURIComponent(collection)}`);
  const url = documentId ? `${urlBase}?documentId=${encodeURIComponent(documentId)}` : urlBase;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) throw { status: res.status, body: json };
  return json;
}

/**
 * listFirestoreDocuments
 * @description List documents in a collection and return them as plain JS objects.
 * @param collection string
 * @param idToken string | null
 */
export async function listFirestoreDocuments(collection: string, idToken: string | null): Promise<any> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase not configured (missing env vars)');
  }
  const url = buildFirestoreUrl(`documents/${encodeURIComponent(collection)}?pageSize=50`);
  const headers: Record<string, string> = {};
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

  const res = await fetch(url, {
    method: 'GET',
    headers
  });
  const json = await res.json();
  if (!res.ok) throw { status: res.status, body: json };

  // Convert Firestore document format to plain objects (best-effort)
  const docs = (json.documents || []).map((doc: any) => {
    const fields = doc.fields || {};
    const parsed: Record<string, any> = {};
    Object.keys(fields).forEach((k) => {
      parsed[k] = parseFirestoreValue(fields[k]);
    });
    return { id: doc.name?.split('/').pop(), ...parsed };
  });
  return docs;
}

/**
 * parseFirestoreValue
 * @description Parse a single Firestore REST value into a plain JS value.
 *              Supports stringValue, doubleValue, integerValue, booleanValue, mapValue, arrayValue, nullValue.
 * @param v any
 */
function parseFirestoreValue(v: any): any {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.booleanValue !== undefined) return Boolean(v.booleanValue);
  if (v.nullValue !== undefined) return null;
  if (v.mapValue && v.mapValue.fields) {
    const out: Record<string, any> = {};
    Object.keys(v.mapValue.fields).forEach((k) => {
      out[k] = parseFirestoreValue(v.mapValue.fields[k]);
    });
    return out;
  }
  if (v.arrayValue && Array.isArray(v.arrayValue.values)) {
    return v.arrayValue.values.map((x) => parseFirestoreValue(x));
  }
  // Fallback
  return v;
}