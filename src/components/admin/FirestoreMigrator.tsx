/**
 * FirestoreMigrator.tsx
 *
 * Admin UI component to migrate selected localStorage collections to Google Firestore.
 *
 * This file extends the existing browser-based migration by adding a recommended
 * secure server flow. Admins can choose between:
 * - "Use Server (recommended)" — POST prepared items to a Netlify serverless function
 *   which performs JWT signing and Firestore writes server-side using environment
 *   variables (FIRESTORE_SA, FIRESTORE_ADMIN_KEY).
 * - "Use Browser (fallback)" — sign JWT in-browser and write directly. (Less secure)
 *
 * Notes:
 * - To use the server flow, deploy the Netlify function netlify/functions/firestore-import.js
 *   and set FIRESTORE_SA (base64 of service account JSON) and FIRESTORE_ADMIN_KEY in Netlify env.
 * - The component shows per-item progress and logs.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Database, Cloud, Download, Upload, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

/**
 * Interface for migration item tracking
 */
interface MigrationItem {
  id: string;
  collection: string;
  payload: any;
  status: 'pending' | 'success' | 'error';
  error?: string;
  docId?: string | null;
}

/**
 * Utility: base64url encode a Uint8Array or string
 * @param data
 */
function base64UrlEncode(data: Uint8Array | string) {
  let bytes: Uint8Array;
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = data;
  }
  const b64 = btoa(String.fromCharCode(...Array.from(bytes)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Utility: JSON safe parse
 * @param s
 */
function tryParseJSON(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/**
 * Convert PEM PKCS8 private key string into ArrayBuffer for WebCrypto
 * (used for browser fallback)
 * @param pem
 */
function pemToArrayBuffer(pem: string) {
  const b64 = pem.replace(/-----BEGIN [\w\s]+-----/, '')
    .replace(/-----END [\w\s]+-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Create a signed JWT using RS256 in the browser (WebCrypto).
 * @param serviceAccount The parsed service account JSON object
 * @param scope OAuth2 scope
 * @param expiresInSeconds expiration seconds (default 3600)
 */
async function createSignedJwtBrowser(serviceAccount: any, scope: string, expiresInSeconds = 3600) {
  if (!serviceAccount || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('Invalid service account JSON. Missing client_email or private_key.');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload: any = {
    iss: serviceAccount.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + expiresInSeconds,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Import private key into WebCrypto
  const pkcs8 = pemToArrayBuffer(serviceAccount.private_key);
  const cryptoKey = await (window.crypto.subtle as SubtleCrypto).importKey(
    'pkcs8',
    pkcs8,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }
    },
    false,
    ['sign']
  );

  // Sign the data
  const signature = await (window.crypto.subtle as SubtleCrypto).sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureBase64Url = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${signatureBase64Url}`;
}

/**
 * FirestoreMigrator component
 * @description UI for selecting localStorage collections and migrating them to Firestore
 */
const FirestoreMigrator: React.FC = () => {
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Record<string, boolean>>({});
  const [serviceAccountRaw, setServiceAccountRaw] = useState<string>('');
  const [serviceAccount, setServiceAccount] = useState<any | null>(null);
  const [projectIdOverride, setProjectIdOverride] = useState<string>('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [items, setItems] = useState<MigrationItem[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [progressIndex, setProgressIndex] = useState(0);

  // Server flow states
  const [useServer, setUseServer] = useState<boolean>(true);
  const [serverUrl, setServerUrl] = useState<string>('/.netlify/functions/firestore-import');
  const [serverAdminKey, setServerAdminKey] = useState<string>('');

  useEffect(() => {
    const keys = Object.keys(localStorage).filter(k =>
      k.startsWith('tm_') ||
      ['tm_users', 'tm_job_market', 'tm_game_state', 'tm_admin_account', 'tm_users_backup', 'exported-documents', 'exported-doc'].includes(k)
    );
    setAvailableKeys(keys);
    const defaultSelected: Record<string, boolean> = {};
    keys.forEach(k => (defaultSelected[k] = false));
    setSelectedKeys(defaultSelected);
  }, []);

  useEffect(() => {
    if (!serviceAccountRaw.trim()) {
      setServiceAccount(null);
      return;
    }
    const parsed = tryParseJSON(serviceAccountRaw);
    setServiceAccount(parsed);
  }, [serviceAccountRaw]);

  const toggleKey = (key: string) => {
    setSelectedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  /**
   * Build migration items from selected localStorage keys.
   * Accepts arrays, object-of-objects or a single object.
   */
  const prepareItems = () => {
    const newItems: MigrationItem[] = [];
    Object.entries(selectedKeys).forEach(([key, selected]) => {
      if (!selected) return;
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const data = tryParseJSON(raw);
      if (!data) {
        newItems.push({
          id: `${key}_blob`,
          collection: key,
          payload: { data: raw },
          status: 'pending'
        });
        return;
      }

      if (Array.isArray(data)) {
        data.forEach((d: any, idx: number) => {
          const idCandidate = d && (d.id || d._id || d.uid || d.userId || d.companyId) ? String(d.id || d._id || d.uid || d.userId || d.companyId) : `import_${key}_${idx}_${Date.now()}`;
          newItems.push({
            id: `${key}:${idCandidate}`,
            collection: key,
            payload: d,
            status: 'pending',
            docId: idCandidate
          });
        });
      } else if (typeof data === 'object') {
        const vals = Object.values(data);
        if (vals.length > 0 && vals.every(v => typeof v === 'object')) {
          Object.entries(data).forEach(([subId, obj]) => {
            const idCandidate = subId || (obj && (obj.id || obj._id)) || `import_${key}_${Date.now()}`;
            newItems.push({
              id: `${key}:${idCandidate}`,
              collection: key,
              payload: obj,
              status: 'pending',
              docId: String(idCandidate)
            });
          });
        } else {
          const idCandidate = (data as any).id || (data as any)._id || `import_${key}_${Date.now()}`;
          newItems.push({
            id: `${key}:${idCandidate}`,
            collection: key,
            payload: data,
            status: 'pending',
            docId: String(idCandidate)
          });
        }
      } else {
        newItems.push({
          id: `${key}_blob`,
          collection: key,
          payload: { data },
          status: 'pending'
        });
      }
    });

    setItems(newItems);
    setLogs([]);
    setProgressIndex(0);
  };

  const clearLogs = () => setLogs([]);

  const addLog = (s: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${s}`]);
  };

  /**
   * Exchange signed JWT for OAuth2 access token
   * @param signedJwt
   */
  const fetchAccessTokenFromJwt = async (signedJwt: string) => {
    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.append('assertion', signedJwt);

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Token exchange failed: ${res.status} ${txt}`);
    }

    const json = await res.json();
    return json.access_token as string;
  };

  /**
   * Write a single document to Firestore via REST API (browser flow).
   */
  const writeDocumentBrowser = async (projectId: string, collection: string, docId: string | undefined, obj: any, token: string) => {
    const urlBase = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodeURIComponent(collection)}`;
    const url = docId ? `${urlBase}?documentId=${encodeURIComponent(docId)}` : urlBase;

    const body = { fields: { data: { stringValue: JSON.stringify(obj) } } };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Failed to write document: ${res.status} ${txt}`);
    }

    return await res.json();
  };

  /**
   * Start migration — chooses server flow if useServer is true, otherwise uses browser flow.
   */
  const startMigration = async () => {
    if (items.length === 0) {
      alert('No items prepared for migration. Click "Prepare Items" first.');
      return;
    }

    setIsMigrating(true);
    addLog('Starting migration...');
    setProgressIndex(0);

    const projectId = projectIdOverride || (serviceAccount && serviceAccount.project_id) || '';

    if (useServer) {
      addLog('Using server function: ' + serverUrl);
      try {
        const payload = {
          projectId,
          items: items.map(it => ({ id: it.id, collection: it.collection, docId: it.docId, payload: it.payload }))
        };
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (serverAdminKey) headers['X-ADMIN-KEY'] = serverAdminKey;

        const res = await fetch(serverUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const txt = await res.text();
          addLog(`Server returned error: ${res.status} ${txt}`);
          alert('Server function returned an error. See logs.');
          setIsMigrating(false);
          return;
        }

        const json = await res.json();
        if (!json || !Array.isArray(json.results)) {
          addLog('Unexpected server response: ' + JSON.stringify(json));
          setIsMigrating(false);
          return;
        }

        // Map server results back to items
        const updated = items.map(it => {
          const r = json.results.find((x: any) => x.id === it.id || (x.collection === it.collection && x.docId === it.docId));
          if (r) {
            return { ...it, status: r.status === 'success' ? 'success' : 'error', error: r.error };
          }
          return it;
        });
        setItems(updated);
        json.results.forEach((r: any) => addLog(`${r.status.toUpperCase()} ${r.collection}/${r.docId || '(auto)'} ${r.error ? '-> ' + r.error : ''}`));
        addLog('Server migration completed.');
      } catch (err: any) {
        addLog(`Server migration failed: ${err.message || String(err)}`);
        alert('Server migration failed. See logs.');
      } finally {
        setIsMigrating(false);
      }
      return;
    }

    // Browser fallback flow
    if (!serviceAccount) {
      alert('Please paste a service account JSON or provide a projectId override for browser flow.');
      setIsMigrating(false);
      return;
    }

    if (!projectId) {
      addLog('Project ID not found for browser flow.');
      setIsMigrating(false);
      return;
    }

    try {
      addLog('Creating signed JWT (browser)...');
      const scope = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform';
      const signedJwt = await createSignedJwtBrowser(serviceAccount, scope);
      addLog('Exchanging signed JWT for access token...');
      const token = await fetchAccessTokenFromJwt(signedJwt);
      setAccessToken(token);
      addLog('Access token acquired.');

      const updatedItems = [...items];
      for (let i = 0; i < updatedItems.length; i++) {
        setProgressIndex(i + 1);
        const it = updatedItems[i];
        setItems(prev => prev.map(x => (x.id === it.id ? { ...x, status: 'pending' } : x)));
        try {
          const docId = it.docId || undefined;
          await writeDocumentBrowser(projectId, it.collection, docId, it.payload, token);
          setItems(prev => prev.map(x => (x.id === it.id ? { ...x, status: 'success' } : x)));
          addLog(`OK ${it.collection}/${docId || '(auto)'} uploaded`);
        } catch (err: any) {
          const message = err?.message || String(err);
          setItems(prev => prev.map(x => (x.id === it.id ? { ...x, status: 'error', error: message } : x)));
          addLog(`ERROR ${it.collection} -> ${message}`);
        }
        await new Promise(r => setTimeout(r, 200));
      }
      addLog('Browser migration completed.');
    } catch (err: any) {
      addLog(`Auth error: ${err.message || String(err)}`);
      alert('Authentication failed during browser flow. See logs for details.');
    } finally {
      setIsMigrating(false);
    }
  };

  /**
   * Retry failed items (both server and browser flows will attempt to reprocess failed items)
   */
  const retryFailed = async () => {
    const failed = items.filter(i => i.status === 'error');
    if (failed.length === 0) {
      alert('No failed items to retry.');
      return;
    }
    setItems(prev => prev.map(x => (x.status === 'error' ? { ...x, status: 'pending', error: undefined } : x)));
    setIsMigrating(true);
    addLog('Retrying failed items...');
    // For the server flow, we simply POST the failed items to the server function
    if (useServer) {
      try {
        const payload = {
          projectId: projectIdOverride || (serviceAccount && serviceAccount.project_id) || '',
          items: failed.map(it => ({ id: it.id, collection: it.collection, docId: it.docId, payload: it.payload }))
        };
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (serverAdminKey) headers['X-ADMIN-KEY'] = serverAdminKey;
        const res = await fetch(serverUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
        if (!res.ok) {
          const txt = await res.text();
          addLog(`Server retry error: ${res.status} ${txt}`);
          setIsMigrating(false);
          return;
        }
        const json = await res.json();
        const updated = items.map(it => {
          const r = json.results.find((x: any) => x.id === it.id);
          if (r) return { ...it, status: r.status === 'success' ? 'success' : 'error', error: r.error };
          return it;
        });
        setItems(updated);
        addLog('Retry completed.');
      } catch (err: any) {
        addLog(`Retry failed: ${err.message || String(err)}`);
      } finally {
        setIsMigrating(false);
      }
      return;
    }

    // Browser retry: reuse existing token if present or re-auth
    setIsMigrating(true);
    try {
      const projectId = projectIdOverride || (serviceAccount && serviceAccount.project_id) || '';
      if (!projectId) {
        addLog('Missing projectId for retry.');
        setIsMigrating(false);
        return;
      }
      let token = accessToken;
      if (!token) {
        addLog('Refreshing access token for retry...');
        const scope = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform';
        const signedJwt = await createSignedJwtBrowser(serviceAccount, scope);
        token = await fetchAccessTokenFromJwt(signedJwt);
        setAccessToken(token);
      }
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.status !== 'error') continue;
        try {
          await writeDocumentBrowser(projectId, it.collection, it.docId || undefined, it.payload, token as string);
          setItems(prev => prev.map(x => (x.id === it.id ? { ...x, status: 'success' } : x)));
          addLog(`RETRY OK ${it.collection}/${it.docId || '(auto)'}`);
        } catch (err: any) {
          setItems(prev => prev.map(x => (x.id === it.id ? { ...x, status: 'error', error: err?.message || String(err) } : x)));
          addLog(`RETRY ERROR ${it.collection} -> ${err?.message || String(err)}`);
        }
        await new Promise(r => setTimeout(r, 200));
      }
    } catch (err: any) {
      addLog(`Retry flow error: ${err.message || String(err)}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const downloadFailures = () => {
    const failItems = items.filter(i => i.status === 'error').map(i => ({ id: i.id, collection: i.collection, error: i.error, payload: i.payload }));
    const blob = new Blob([JSON.stringify(failItems, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `firestore-migration-failures-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    if (!confirm('Reset migration state? This will clear prepared items and logs.')) return;
    setItems([]);
    setLogs([]);
    setAccessToken(null);
    setProgressIndex(0);
  };

  const summary = useMemo(() => {
    const total = items.length;
    const success = items.filter(i => i.status === 'success').length;
    const error = items.filter(i => i.status === 'error').length;
    const pending = items.filter(i => i.status === 'pending').length;
    return { total, success, error, pending };
  }, [items]);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
      <div className="flex items-center space-x-3 mb-2">
        <Cloud className="w-6 h-6 text-cyan-400" />
        <div>
          <h3 className="text-lg font-semibold text-white">Firestore Migration</h3>
          <p className="text-sm text-slate-400">Migrate selected localStorage collections to Firestore (admin only). Use server function for secure migration.</p>
        </div>
      </div>

      {/* Select collections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm text-slate-400">Detected local storage keys</div>
          <div className="bg-slate-700/20 p-3 rounded-lg max-h-40 overflow-auto">
            {availableKeys.length === 0 && <div className="text-slate-400 text-sm">No candidate localStorage keys detected.</div>}
            {availableKeys.map(k => (
              <label key={k} className="flex items-center space-x-2 text-sm text-slate-200">
                <input type="checkbox" checked={!!selectedKeys[k]} onChange={() => toggleKey(k)} className="form-checkbox" />
                <span className="truncate">{k}</span>
              </label>
            ))}
          </div>
          <button
            onClick={prepareItems}
            disabled={Object.values(selectedKeys).every(v => !v)}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg flex items-center justify-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Prepare Items</span>
          </button>
        </div>

        {/* Auth / Server */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-400">Migration Mode</div>
              <div className="text-xs text-slate-500">Server recommended: keeps service account secret on server</div>
            </div>
            <div className="text-sm">
              <label className="inline-flex items-center space-x-2">
                <input type="checkbox" checked={useServer} onChange={() => setUseServer(v => !v)} />
                <span className="text-slate-200">Use Server</span>
              </label>
            </div>
          </div>

          {useServer ? (
            <>
              <div className="text-sm text-slate-400">Server function URL</div>
              <input value={serverUrl} onChange={e => setServerUrl(e.target.value)} className="w-full bg-slate-700/20 rounded-lg p-2 text-sm text-white placeholder:text-slate-400" />
              <div className="text-sm text-slate-400">Server Admin Key (X-ADMIN-KEY header)</div>
              <input value={serverAdminKey} onChange={e => setServerAdminKey(e.target.value)} placeholder="Paste admin key (kept locally)" className="w-full bg-slate-700/20 rounded-lg p-2 text-sm text-white placeholder:text-slate-400" />
              <div className="text-xs text-slate-500">Note: Best practice: set FIRESTORE_ADMIN_KEY on Netlify and leave this empty. Use this field for quick tests.</div>
            </>
          ) : (
            <>
              <div className="text-sm text-slate-400">Service Account JSON (paste) — Browser Flow</div>
              <textarea
                value={serviceAccountRaw}
                onChange={e => setServiceAccountRaw(e.target.value)}
                placeholder='Paste JSON content of service account key here (desktop admin machine only)'
                className="w-full h-40 bg-slate-700/30 rounded-lg p-3 text-sm text-white placeholder:text-slate-400"
              />
              <input
                value={projectIdOverride}
                onChange={e => setProjectIdOverride(e.target.value)}
                placeholder="Optional: override projectId (if JSON missing project_id)"
                className="w-full bg-slate-700/20 rounded-lg p-2 text-sm text-white placeholder:text-slate-400"
              />
            </>
          )}

          <div className="flex space-x-2">
            <button
              onClick={() => {
                if (!useServer && !serviceAccount) {
                  alert('Invalid service account JSON. Paste valid JSON first.');
                  return;
                }
                if (!useServer) {
                  alert('Browser flow ready. Ensure your service account has proper Firestore permissions.');
                } else {
                  alert('Server mode selected. Deploy the Netlify function and set FIRESTORE_SA and FIRESTORE_ADMIN_KEY environment variables. Then run Start Migration.');
                }
              }}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Validate / Info</span>
            </button>
            <button
              onClick={() => { setServiceAccountRaw(''); setProjectIdOverride(''); }}
              className="bg-red-700 hover:bg-red-800 text-white py-2 px-3 rounded-lg flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="text-sm text-slate-400">
          Prepared: <span className="text-white font-medium">{items.length}</span> • Success: <span className="text-green-400 font-medium">{summary.success}</span> • Errors: <span className="text-red-400 font-medium">{summary.error}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={startMigration}
            disabled={isMigrating || items.length === 0}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            <span>{isMigrating ? 'Migrating...' : 'Start Migration'}</span>
          </button>
          <button onClick={retryFailed} disabled={isMigrating || summary.error === 0} className="bg-amber-600 hover:bg-amber-700 text-white py-2 px-3 rounded-lg">
            Retry Failed
          </button>
          <button onClick={downloadFailures} className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Download Failures</span>
          </button>
          <button onClick={resetAll} className="bg-red-700 hover:bg-red-800 text-white py-2 px-3 rounded-lg">
            Reset
          </button>
        </div>
      </div>

      {/* Progress & Logs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-700/30 rounded-lg p-3 max-h-56 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-400">Migration Items</div>
            <div className="text-xs text-slate-500">Progress {progressIndex}/{items.length}</div>
          </div>
          <ul className="space-y-2">
            {items.map(it => (
              <li key={it.id} className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm text-white truncate">{it.collection} • {it.docId || it.id}</div>
                  {it.status === 'error' && <div className="text-xs text-red-300 truncate">{it.error}</div>}
                </div>
                <div className="w-24 flex justify-end">
                  {it.status === 'pending' && <div className="text-slate-400 text-xs">Pending</div>}
                  {it.status === 'success' && <div className="text-green-400 text-xs flex items-center"><CheckCircle className="w-3 h-3 mr-1" />OK</div>}
                  {it.status === 'error' && <div className="text-red-400 text-xs flex items-center"><AlertTriangle className="w-3 h-3 mr-1" />ERR</div>}
                </div>
              </li>
            ))}
            {items.length === 0 && <li className="text-slate-400 text-sm">No items prepared. Use the checkboxes and "Prepare Items".</li>}
          </ul>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-3 max-h-56 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-400">Logs</div>
            <div className="flex items-center space-x-2">
              <button onClick={clearLogs} className="text-xs text-slate-400 hover:text-white">Clear</button>
            </div>
          </div>
          <div className="text-xs text-slate-300 space-y-1">
            {logs.length === 0 && <div className="text-slate-400">No logs yet.</div>}
            {logs.map((l, idx) => <div key={idx} className="whitespace-pre-wrap">{l}</div>)}
          </div>
        </div>
      </div>

      <div className="text-xs text-slate-500">Important: Using the browser flow requires pasting a service account private key into this UI — only do that on a trusted admin machine. Server flow keeps keys on Netlify and is recommended.</div>
    </div>
  );
};

export default FirestoreMigrator;