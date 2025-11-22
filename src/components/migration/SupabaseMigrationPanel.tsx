/**
 * SupabaseMigrationPanel.tsx
 *
 * Panel that allows migrating data to Supabase via the serverless migrate endpoint.
 *
 * Features:
 * - Input Admin token (temporarily stored in sessionStorage if requested)
 * - Table name input
 * - Payload textarea (JSON)
 * - Test and Migrate actions that call the Netlify function /.netlify/functions/migrate
 * - Response / error display
 */

import React, { useEffect, useState } from 'react';
import { Database, Send, Check, AlertTriangle } from 'lucide-react';

/**
 * Helper to safely parse JSON and return an error message on failure.
 * @param text raw JSON text
 */
function tryParseJSON(text: string): { ok: boolean; data?: any; error?: string } {
  try {
    const parsed = JSON.parse(text);
    return { ok: true, data: parsed };
  } catch (err: any) {
    return { ok: false, error: String(err.message || err) };
  }
}

/**
 * SupabaseMigrationPanel
 * @description UI for sending migration payloads to Supabase through the migrate serverless endpoint.
 */
const SupabaseMigrationPanel: React.FC = () => {
  const [adminToken, setAdminToken] = useState<string>('');
  const [saveToken, setSaveToken] = useState<boolean>(false);
  const [tableName, setTableName] = useState<string>('migrated_collections'); // default supabase target
  const [payloadText, setPayloadText] = useState<string>('[{"hello":"world"}]');
  const [metadataText, setMetadataText] = useState<string>('{"requestedBy":"you@example.com","test":true}');
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('migration_admin_token');
    if (stored) {
      setAdminToken(stored);
      setSaveToken(true);
    }
  }, []);

  useEffect(() => {
    if (saveToken && adminToken) {
      sessionStorage.setItem('migration_admin_token', adminToken);
    } else {
      sessionStorage.removeItem('migration_admin_token');
    }
  }, [saveToken, adminToken]);

  /**
   * runTest
   * @description Attempts a small test request to the migrate endpoint to verify connectivity.
   */
  const runTest = async () => {
    setError(null);
    setResponse(null);
    if (!adminToken) {
      setError('Admin token is required for the test.');
      return;
    }

    setLoading(true);
    try {
      const body = {
        metadata: { test: true, requestedBy: 'migrator-ui' },
        collections: {
          health_check_supabase: [{ ok: true, source: 'migrator-ui' }]
        }
      };

      const res = await fetch('/.netlify/functions/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(body)
      });

      const text = await res.text();
      let parsed;
      try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }

      if (!res.ok) {
        setError(`Server returned ${res.status}: ${JSON.stringify(parsed)}`);
      } else {
        setResponse(parsed);
      }
    } catch (err: any) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  /**
   * migrateToSupabase
   * @description Perform migration for Supabase target via the serverless function.
   */
  const migrateToSupabase = async () => {
    setError(null);
    setResponse(null);

    if (!adminToken) {
      setError('Admin token is required.');
      return;
    }

    // Validate metadata and payload JSON
    const metaParsed = tryParseJSON(metadataText);
    if (!metaParsed.ok) {
      setError('Metadata JSON invalid: ' + metaParsed.error);
      return;
    }

    const payloadParsed = tryParseJSON(payloadText);
    if (!payloadParsed.ok) {
      setError('Payload JSON invalid: ' + payloadParsed.error);
      return;
    }

    // Build the body: supabase target uses the tableName as collection key
    const body: any = {
      metadata: metaParsed.data,
      collections: {
        [tableName]: Array.isArray(payloadParsed.data) ? payloadParsed.data : [payloadParsed.data]
      }
    };

    setLoading(true);
    try {
      const res = await fetch('/.netlify/functions/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify(body)
      });

      const text = await res.text();
      let parsed;
      try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }

      if (!res.ok) {
        setError(`Server returned ${res.status}: ${JSON.stringify(parsed)}`);
      } else {
        setResponse(parsed);
      }
    } catch (err: any) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1">
          <label className="text-sm text-slate-400">Admin Token</label>
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            placeholder="Paste admin token"
            aria-label="Admin token"
          />
          <div className="flex items-center gap-2 mt-2 text-sm">
            <input id="saveTokenSupabase" type="checkbox" checked={saveToken} onChange={() => setSaveToken(v => !v)} />
            <label htmlFor="saveTokenSupabase" className="text-slate-400">Save token in this browser (sessionStorage)</label>
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400">Supabase Table / Key</label>
          <input
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            placeholder="Supabase table name"
          />
        </div>

        <div className="flex flex-col justify-end">
          <div className="flex gap-2">
            <button
              onClick={runTest}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg px-4 py-2 text-slate-200"
            >
              <Send className="w-4 h-4" /> Test
            </button>
            <button
              onClick={migrateToSupabase}
              disabled={loading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              <Check className="w-4 h-4" /> Migrate to Supabase
            </button>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            The serverless function will call Supabase using the server environment's SUPABASE_* variables. Ensure those are set.
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm text-slate-400">Metadata (JSON)</label>
        <textarea
          value={metadataText}
          onChange={(e) => setMetadataText(e.target.value)}
          className="w-full mt-1 min-h-[80px] bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm"
        />
      </div>

      <div>
        <label className="text-sm text-slate-400">Payload (JSON array or object)</label>
        <textarea
          value={payloadText}
          onChange={(e) => setPayloadText(e.target.value)}
          className="w-full mt-1 min-h-[220px] bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono text-sm"
        />
      </div>

      <div>
        <div className="text-sm text-slate-400 mb-2">Response</div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 min-h-[120px]">
          {loading && <div className="text-slate-300">Working...</div>}
          {!loading && error && (
            <div className="text-rose-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4" />
              <pre className="whitespace-pre-wrap text-sm">{error}</pre>
            </div>
          )}
          {!loading && response && (
            <pre className="whitespace-pre-wrap text-sm text-slate-200">{JSON.stringify(response, null, 2)}</pre>
          )}
          {!loading && !response && !error && (
            <div className="text-slate-500">No response yet. Use Test or Migrate to run the function.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupabaseMigrationPanel;