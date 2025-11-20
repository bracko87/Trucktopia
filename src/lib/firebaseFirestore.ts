/**
 * src/lib/firebaseFirestore.ts
 *
 * Lightweight typed helpers for Firestore operations used by the app.
 *
 * Functions:
 * - createCompany: create a company document under 'companies'
 * - listCompanies: read the latest companies
 * - subscribeToCompany: realtime subscription to a company document
 *
 * Notes:
 * - Uses modular Firestore API (v9).
 */

import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  Unsubscribe,
  DocumentData,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebaseClient';

export interface CompanyRecord {
  id?: string;
  name: string;
  email?: string;
  capital?: number;
  reputation?: number;
  createdAt?: string;
  ownerEmail?: string;
  [key: string]: any;
}

/**
 * createCompany
 * @description Create a new company document (auto-generated id) in 'companies' collection.
 * @param data Partial<CompanyRecord>
 */
export async function createCompany(data: Partial<CompanyRecord>): Promise<{ id?: string; error?: any }> {
  try {
    const col = collection(db, 'companies');
    const payload: DocumentData = {
      ...data,
      createdAt: new Date().toISOString(),
    };
    const ref = await addDoc(col, payload);
    return { id: ref.id };
  } catch (err) {
    return { error: err };
  }
}

/**
 * listCompanies
 * @description Returns an array of company objects (best-effort conversion).
 */
export async function listCompanies(): Promise<CompanyRecord[]> {
  const col = collection(db, 'companies');
  const snap = await getDocs(col);
  const out: CompanyRecord[] = [];
  snap.forEach((d) => {
    out.push({ id: d.id, ...(d.data() as CompanyRecord) });
  });
  return out;
}

/**
 * subscribeToCompany
 * @description Subscribe to realtime updates of a single company doc.
 * @param companyId string
 * @param cb (data: CompanyRecord | null) => void
 * @returns Unsubscribe function
 */
export function subscribeToCompany(companyId: string,