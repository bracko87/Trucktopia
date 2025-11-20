/**
 * src/components/TestFirebaseConnection.tsx
 *
 * Small diagnostic UI to test Firebase REST integration without firebase SDK.
 *
 * Features:
 * - Shows masked Firebase config from env
 * - Sign Up (create user) / Sign In (email/password)
 * - Create a test "company" document in Firestore (collection: companies)
 * - List companies and display raw results
 *
 * Usage:
 * - Ensure REACT_APP_FIREBASE_API_KEY and REACT_APP_FIREBASE_PROJECT_ID are set
 * - Ensure Firestore rules allow authenticated users to write/read companies while testing
 */

import React, { useState } from 'react';
import {
  isFirebaseConfigured,
  authSignIn,
  authSignUp,
  createFirestoreDocument,
  listFirestoreDocuments,
} from '../lib/firebaseRest';

/**
 * mask
 * @description Simple mask helper for debug output
 */
function mask(s?: string | null) {
  if (!s) return '—';
  const str = String(s);
  if (str.length <= 8) return '*'.repeat(str.length);
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

/**
 * TestFirebaseConnection
 * @description UI component for testing Firebase REST auth & Firestore operations.
 */
const TestFirebaseConnection: React.FC = () => {
  const [email, setEmail] = useState<string>('test@example.com');
  const [password, setPassword] = useState<string>('password123');
  const [idToken, setIdToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const configured = isFirebaseConfigured();

  /**
   * pushLog
   * @description Append a log entry (error or success) to UI
   */
  const pushLog = (entry: any) => {
    setLogs((s) => [entry, ...s].slice(0, 30));
  };

  /**
   * doSignUp
   * @description Call auth sign-up REST endpoint
   */
  const doSignUp = async () => {
    try {
      pushLog({ type: 'info', msg: 'Signing up...' });
      const res = await authSignUp(email, password);
      pushLog({ type: 'success', msg: 'SignUp successful', res });
      // store idToken if present
      if (res.idToken) setIdToken(res.idToken);
    } catch (err: any) {
      pushLog({ type: 'error', msg: 'SignUp failed', err });
    }
  };

  /**
   * doSignIn
   * @description Call auth sign-in REST endpoint
   */
  const doSignIn = async () => {
    try {
      pushLog({ type: 'info', msg: 'Signing in...' });
      const res = await authSignIn(email, password);
      pushLog({ type: 'success', msg: 'SignIn successful', res });
      if (res.idToken) setIdToken(res.idToken);
    } catch (err: any) {
      pushLog({ type: 'error', msg: 'SignIn failed', err });
    }
  };

  /**
   * doCreateCompany
   * @description Create a simple company document in 'companies' collection
   */
  const doCreateCompany = async () => {
    try {
      if (!idToken) {
        pushLog({ type: 'error', msg: 'ID token required - sign in first' });
        return;
      }
      pushLog({ type: 'info', msg: 'Creating company doc...' });
      const doc = {
        name: 'Test Company ' + new Date().toISOString(),
        capital: 500000,
        reputation: 0,
        createdAt: new Date().toISOString(),
        ownerEmail: email,
      };
      const res = await createFirestoreDocument('companies', doc, idToken);
      pushLog({ type: 'success', msg: 'Created document', res });
    } catch (err: any) {
      pushLog({ type: 'error', msg: 'Create company failed', err });
    }
  };

  /**
   * doListCompanies
   * @description List documents from the 'companies' collection
   */
  const doListCompanies = async () => {
    try {
      pushLog({ type: 'info', msg: 'Listing companies...' });
      const list = await listFirestoreDocuments('companies', idToken);
      setCompanies(list || []);
      pushLog({ type: 'success', msg: 'Listed companies', count: (list || []).length });
    } catch (err: any) {
      pushLog({ type: 'error', msg: 'List companies failed', err });
    }
  };

  return (
    <div className="p-6 bg-slate-900 rounded-lg border border-slate-700 space-y-4">
      <h2 className="text-lg font-bold text-white">Firebase REST Diagnostic</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm text-slate-400">Config</div>
          <div className="bg-slate-800 p-3 rounded-md border border-slate-700 text-sm">
            <div>Configured: {configured ? 'Yes' : 'No'}</div>
            <div>API Key: {mask(process.env.REACT_APP_FIREBASE_API_KEY)}</div>
            <div>Project ID: {mask(process.env.REACT_APP_FIREBASE_PROJECT_ID)}</div>
          </div>

          <div className="mt-3 space-y-2">
            <label className="text-slate-300 text-sm">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-sm" />
            <label className="text-slate-300 text-sm">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white text-sm" />
            <div className="flex space-x-2 mt-2">
              <button onClick={doSignUp} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm">Sign Up</button>
              <button onClick={doSignIn} className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm">Sign In</button>
            </div>
            <div className="text-xs text-slate-400 mt-2">ID Token: <span className="text-white">{idToken ? `${idToken.slice(0, 20)}...` : '—'}</span></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-slate-400">Firestore Actions</div>
          <div className="bg-slate-800 p-3 rounded-md border border-slate-700 text-sm">
            <button onClick={doCreateCompany} className="w-full mb-2 px-3 py-2 rounded bg-yellow-600 hover:bg-yellow-700 text-white text-sm">Create Test Company</button>
            <button onClick={doListCompanies} className="w-full px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm">List Companies</button>
            <div className="mt-3 text-xs text-slate-400">Companies returned: <span className="text-white">{companies.length}</span></div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        <h3 className="text-sm font-semibold text-white">Latest companies</h3>
        <div className="mt-2 space-y-2">
          {companies.map((c) => (
            <div key={c.id} className="bg-slate-800 p-3 rounded border border-slate-700 text-sm text-white">
              <div className="font-medium">{c.name || c.id}</div>
              <div className="text-slate-300 text-xs">id: {c.id}</div>
              <div className="text-slate-300 text-xs">owner: {c.ownerEmail}</div>
              <pre className="text-xs mt-2 text-slate-300">{JSON.stringify(c, null, 2)}</pre>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white">Logs</h3>
        <div className="mt-2 space-y-2 max-h-48 overflow-auto">
          {logs.map((l, i) => (
            <div key={i} className={`p-2 rounded ${l.type === 'error' ? 'bg-red-900 text-red-200' : l.type === 'success' ? 'bg-green-900 text-green-200' : 'bg-slate-800 text-slate-200'}`}>
              <div className="text-xs">{l.msg || JSON.stringify(l)}</div>
              {l.res && <pre className="text-xs mt-1 text-slate-300">{JSON.stringify(l.res, null, 2)}</pre>}
              {l.err && <pre className="text-xs mt-1 text-red-300">{JSON.stringify(l.err, null, 2)}</pre>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestFirebaseConnection;