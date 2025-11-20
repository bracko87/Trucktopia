/**
 * TestSupabaseConnection.tsx
 *
 * Small, self-contained React component (TypeScript) that verifies the frontend
 * can reach Supabase using the anon key. It performs a GET against the
 * Supabase REST endpoint for the `app_users` table and displays the result.
 *
 * This implementation is careful to avoid referencing build-only globals such as
 * import.meta or unguarded process usage. All runtime environment access is
 * guarded by typeof checks to avoid ReferenceError in environments where those
 * identifiers are not defined.
 */

import React, { useState } from 'react';

/**
 * UserItem
 * @description Type for the simple app_users rows returned by Supabase.
 */
interface UserItem {
  id: string;
  name?: string;
  created_at?: string;
}

/**
 * getEnvVar
 * @description Safely resolve an environment variable string from possible places:
 *  - runtime global on globalThis (some deployments inject runtime vars there)
 *  - guarded access to process.env (only when typeof process !== 'undefined')
 *
 * @param key Environment variable name (e.g. REACT_APP_SUPABASE_URL)
 * @returns string | undefined
 */
function getEnvVar(key: string): string | undefined {
  try {
    if (typeof globalThis !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gw = globalThis as any;
      if (gw && typeof gw[key] === 'string' && gw[key].length > 0) {
        return String(gw[key]);
      }
    }
  } catch {
    // ignore runtime access errors
  }

  // Safe access to process.env
  try {
    if (typeof process !== 'undefined' && (process as any).env) {
      const val = (process as any).env[key];
      if (typeof val === 'string' && val.length > 0) {
        return String(val);
      }
    }
  } catch {
    // ignore
  }

  // Window-level injection fallback (some hosts use window.__RUNTIME__ or similar).
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = (typeof window !== 'undefined' ? (window as any) : undefined);
    if (win) {
      const candidates = [
        win[key],
        win.__ENV__ && win.__ENV__[key],
        win.__RUNTIME__ && win.__RUNTIME__[key]
      ];
      for (const c of candidates) {
        if (typeof c === 'string' && c.length > 0) return String(c);
      }
    }
  } catch {
    // ignore
  }

  return undefined;
}

/**
 * buildEndpoint
 * @description Build the REST endpoint from a base Supabase URL and table name.
 *
 * @param baseUrl Supabase project base URL
 * @param table Table name to query
 * @returns fully formed REST endpoint string
 */
function buildEndpoint(baseUrl: string, table: string): string {
  const cleaned = baseUrl.replace(/\/+$/, '');
  return `${cleaned}/rest/v1/${table}?select=*`;
}

/**
 * TestSupabaseConnection
 * @component A small UI to test Supabase connectivity from the deployed frontend.
 *
 * How it works:
 * - Reads REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY safely at runtime.
 * - Makes a GET request to `${SUPABASE_URL}/rest/v1/app_users?select=*`
 *   with the anon key in headers (apikey + Authorization).
 * - Displays the JSON results or a friendly error message and diagnostics.
 */
const TestSupabaseConnection: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UserItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * runTest
   * @description Fetch rows from the app_users table via Supabase REST and populate UI.
   * Ensures any early errors are caught and loading state is cleared.
   */
  const runTest = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const rawUrl = getEnvVar('REACT_APP_SUPABASE_URL') || '';
      const SUPABASE_URL = String(rawUrl).replace(/\/+$/, '');
      const SUPABASE_ANON_KEY = getEnvVar('REACT_APP_SUPABASE_ANON_KEY') || '';

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        setError(
          'Supabase env vars not found. Ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are configured in your deployment or injected into global runtime variables.'
        );
        return;
      }

      const endpoint = buildEndpoint(SUPABASE_URL, 'app_users');

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json'
        }
      });

      if (!res.ok) {
        let bodyText = '';
        try {
          bodyText = await res.text();
        } catch (e) {
          bodyText = String(e);
        }
        setError(`HTTP ${res.status} ${res.statusText} — ${bodyText}`);
        return;
      }

      const json: UserItem[] = await res.json();
      setData(json);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * clear
   * @description Clear results and errors
   */
  const clear = () => {
    setData(null);
    setError(null);
  };

  const resolvedUrl = getEnvVar('REACT_APP_SUPABASE_URL') || '(not set)';
  const anonPresent = Boolean(getEnvVar('REACT_APP_SUPABASE_ANON_KEY'));

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white">Supabase Connection Test</h2>
        <p className="text-sm text-slate-400">
          This page will try to read rows from the <code>app_users</code> table using the anon key.
          Make sure you ran supabase/initial_schema.sql in your Supabase SQL editor first.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={runTest}
          disabled={loading}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${loading ? 'bg-slate-600 text-slate-300' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          {loading ? 'Testing...' : 'Run Supabase Test'}
        </button>

        <button
          onClick={clear}
          className="px-3 py-2 rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600"
        >
          Clear
        </button>
      </div>

      <div className="bg-slate-800 rounded-md p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-white mb-2">Result</h3>

        <div className="mb-3 text-xs text-slate-400">
          <div><strong>Resolved SUPABASE_URL:</strong> <span className="text-slate-200">{resolvedUrl}</span></div>
          <div><strong>Anon key present:</strong> <span className="text-slate-200">{anonPresent ? 'yes' : 'no'}</span></div>
        </div>

        {error && (
          <div className="text-red-400">
            <strong>Error:</strong> {error}
            <div className="mt-2 text-xs text-slate-400">
              Common causes:
              <ul className="list-disc ml-5">
                <li>Wrong or missing env variables (check your deployment settings and redeploy or inject runtime vars)</li>
                <li>Table <code>app_users</code> does not exist in the DB (run supabase/initial_schema.sql)</li>
                <li>Unauthorized (401) — anon key invalid or RLS/policies block access</li>
              </ul>
            </div>
          </div>
        )}

        {!error && data === null && <div className="text-slate-400">No test run yet. Click "Run Supabase Test".</div>}

        {data && (
          <div>
            <div className="text-slate-300 mb-2">Rows returned: {data.length}</div>
            <pre className="text-xs text-slate-200 bg-slate-900 p-3 rounded overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestSupabaseConnection;