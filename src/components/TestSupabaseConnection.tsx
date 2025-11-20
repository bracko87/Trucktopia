/**
 * TestSupabaseConnection.tsx
 *
 * Small, self-contained React component (TypeScript) that verifies the frontend
 * can reach Supabase using the anon key. It performs a GET against the
 * Supabase REST endpoint for the `app_users` table and displays the result.
 *
 * This uses the standard REST API and fetch so no additional npm packages are required.
 */

import React, { useState } from 'react';

/**
 * UserItem
 * @description Type for the simple app_users rows returned by Supabase.
 */
interface UserItem {
  id: string;
  name: string;
  created_at?: string;
}

/**
 * TestSupabaseConnection
 * @component A small UI to test Supabase connectivity from the deployed frontend.
 *
 * How it works:
 * - Reads REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY from process.env
 *   (these must be set in Netlify environment variables and the site redeployed).
 * - Makes a GET request to `${SUPABASE_URL}/rest/v1/app_users?select=*`
 *   with the anon key in headers (apikey + Authorization).
 * - Displays the JSON results or a friendly error message.
 */
const TestSupabaseConnection: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UserItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * runTest
   * @description Fetch rows from the app_users table via Supabase REST and populate UI.
   */
  const runTest = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    const SUPABASE_URL = (process.env.REACT_APP_SUPABASE_URL || '').replace(/\/$/, '');
    const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setError('Supabase env vars not found. Ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are configured in Netlify and redeploy.');
      setLoading(false);
      return;
    }

    const endpoint = `${SUPABASE_URL}/rest/v1/app_users?select=*`;

    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json'
        }
      });

      // Response code analysis and friendly messages
      if (!res.ok) {
        // Try reading body for detailed error message
        let bodyText = '';
        try {
          bodyText = await res.text();
        } catch (e) {
          bodyText = String(e);
        }
        setError(`HTTP ${res.status} ${res.statusText} — ${bodyText}`);
        setLoading(false);
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
          onClick={() => {
            setData(null);
            setError(null);
          }}
          className="px-3 py-2 rounded-md bg-slate-700 text-slate-200 hover:bg-slate-600"
        >
          Clear
        </button>
      </div>

      <div className="bg-slate-800 rounded-md p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-white mb-2">Result</h3>
        {error && (
          <div className="text-red-400">
            <strong>Error:</strong> {error}
            <div className="mt-2 text-xs text-slate-400">
              Common causes:
              <ul className="list-disc ml-5">
                <li>Wrong or missing env variables (check Netlify site settings and redeploy)</li>
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