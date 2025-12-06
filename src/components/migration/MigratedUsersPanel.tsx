/**
 * MigratedUsersPanel.tsx
 *
 * Admin UI to preview & install migrated-users.json.
 *
 * Improvements in this iteration:
 * - Accept explicit URL input so the user can paste the exact served URL
 *   (deterministic workaround for cross-origin / port mismatches).
 * - Use CORS-friendly fetch options and improved attempt logging.
 * - Preserve file-upload and embedded fallback behavior.
 *
 * Responsibilities:
 * - Try multiple candidate URLs to fetch the migration JSON.
 * - Allow file upload as immediate manual fallback.
 * - Allow forcing embedded sample fallback for development.
 * - Install the parsed migration data into localStorage under key tm_migrated_users.
 */
import React from 'react';
import { Users, DownloadCloud, CheckCircle, AlertTriangle, UploadCloud, RefreshCw, Link } from 'lucide-react';

/**
 * MigratedEntry
 * @description Single migrated user entry shape.
 */
type MigratedEntry = {
  id: string | null;
  email: string | null;
  name?: string | null;
  needsPasswordReset?: boolean;
};

/**
 * MigratedFile
 * @description File shape expected by the panel.
 */
type MigratedFile = {
  producedAt?: string;
  users: MigratedEntry[];
};

const LOCALSTORAGE_KEY = 'tm_migrated_users';

/**
 * SAMPLE_MIGRATED_FILE
 * @description Embedded fallback payload exposed when network fetches fail.
 */
const SAMPLE_MIGRATED_FILE: MigratedFile = {
  producedAt: new Date().toISOString(),
  users: [
    { id: 'sample-1', email: 'dev.user1@example.com', name: 'Dev UserOne', needsPasswordReset: false },
    { id: 'sample-2', email: 'dev.user2@example.com', name: 'Dev UserTwo', needsPasswordReset: true },
    { id: 'sample-3', email: 'dev.user3@example.com', name: 'Dev UserThree', needsPasswordReset: false }
  ]
};

/**
 * AttemptRecord
 * @description Record describing a single fetch attempt for diagnostics.
 */
type AttemptRecord = {
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
  corsBlocked?: boolean;
};

/**
 * tryFetchJson
 * @description Try fetching a URL and return parsed JSON if successful.
 *              Uses CORS-friendly options for cross-port serving.
 * @param url string
 */
async function tryFetchJson(url: string) {
  try {
    // Add cache-busting query param to avoid cached 404s
    const sep = url.includes('?') ? '&' : '?';
    const fullUrl = `${url}${sep}_=${Date.now()}`;

    // Try fetch with CORS mode (no credentials). Many local static servers do not
    // set cookies and may not allow credentials; using 'cors' increases success rate.
    const res = await fetch(fullUrl, { cache: 'no-store', mode: 'cors' });

    if (!res) {
      return { ok: false, error: 'no-response', url: fullUrl };
    }

    // If fetch was blocked by CORS, the browser may throw before we get here;
    // but in some cases we receive an opaque response. Handle that.
    if (res.type === 'opaque') {
      // Opaque responses cannot be inspected — treat as CORS-blocked.
      return { ok: false, error: 'opaque-response (possible CORS)', corsBlocked: true, url: fullUrl };
    }

    if (!res.ok) {
      return { ok: false, status: res.status, url: fullUrl };
    }

    const json = await res.json();
    return { ok: true, data: json, url: fullUrl };
  } catch (err) {
    // Network error or CORS preflight failure will be caught here
    return { ok: false, error: (err as any)?.message ?? String(err), url };
  }
}

/**
 * readJsonFromCandidates
 * @description Try candidate paths sequentially and return the first valid file or null plus attempts.
 *              This prefers an explicit userUrl if provided.
 */
async function readJsonFromCandidates(candidates: string[]) {
  const attempts: AttemptRecord[] = [];

  for (const c of candidates) {
    // eslint-disable-next-line no-await-in-loop
    const r = await tryFetchJson(c);
    if (r.ok && r.data) {
      // Accept either an array of users or { users: [...] } shape.
      if (Array.isArray(r.data)) {
        return { file: { users: r.data } as MigratedFile, attempts: [...attempts, { url: r.url, ok: true }] };
      }
      if (r.data && Array.isArray((r.data as any).users)) {
        return { file: r.data as MigratedFile, attempts: [...attempts, { url: r.url, ok: true }] };
      }
      attempts.push({ url: r.url ?? c, ok: false, error: 'invalid-json-shape' });
      continue;
    }

    if ('status' in r && typeof (r as any).status === 'number') {
      attempts.push({ url: r.url ?? c, ok: false, status: (r as any).status });
    } else {
      attempts.push({ url: r.url ?? c, ok: false, error: (r as any).error ?? 'fetch-failed', corsBlocked: (r as any).corsBlocked ?? false });
    }
  }

  return { file: null, attempts };
}

/**
 * installToLocalStorage
 * @description Write a compact email->metadata map to localStorage under LOCALSTORAGE_KEY.
 */
function installToLocalStorage(users: MigratedEntry[]) {
  const map: Record<string, { needsPasswordReset: boolean; id?: string; name?: string }> = {};
  for (const u of users) {
    if (!u.email) continue;
    map[u.email.toLowerCase()] = {
      needsPasswordReset: !!u.needsPasswordReset,
      id: u.id ?? undefined,
      name: u.name ?? undefined
    };
  }
  localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({ installedAt: new Date().toISOString(), entries: map }));
}

/**
 * getSampleEmails
 * @description Return a few sample emails for display.
 */
function getSampleEmails(users: MigratedEntry[], n = 10) {
  return users.map((u) => u.email).filter(Boolean).slice(0, n) as string[];
}

/**
 * buildCandidates
 * @description Build a list of candidate URLs to try. It includes:
 * - Common repo-relative paths.
 * - window.location.origin variants.
 * - localhost / 127.0.0.1 on common dev ports.
 *
 * @param explicitUrl optional user-provided URL that will be tried first.
 */
function buildCandidates(explicitUrl?: string): string[] {
  const candidates = new Set<string>();
  if (explicitUrl && explicitUrl.trim()) {
    candidates.add(explicitUrl.trim());
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const baseCandidates = [
    '/exports/migrated-users.json',
    'exports/migrated-users.json',
    '/public/exports/migrated-users.json',
    `${origin}/exports/migrated-users.json`,
    `${origin}/public/exports/migrated-users.json`
  ];
  baseCandidates.forEach((c) => candidates.add(c));

  const devPorts = [8001, 8000, 3000, 5173, 5174, 8080, 9000];
  for (const p of devPorts) {
    candidates.add(`http://127.0.0.1:${p}/exports/migrated-users.json`);
    candidates.add(`http://localhost:${p}/exports/migrated-users.json`);
    candidates.add(`http://127.0.0.1:${p}/public/exports/migrated-users.json`);
    candidates.add(`http://localhost:${p}/public/exports/migrated-users.json`);
  }

  return Array.from(candidates);
}

/**
 * MigratedUsersPanel
 * @description React component to preview & install migrated-users.json with robust options for local dev.
 */
const MigratedUsersPanel: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<MigratedFile | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [attempts, setAttempts] = React.useState<AttemptRecord[]>([]);
  const [installed, setInstalled] = React.useState(false);
  const [showDebug, setShowDebug] = React.useState(false);
  const [usedFallback, setUsedFallback] = React.useState(false);
  const [explicitUrl, setExplicitUrl] = React.useState<string>('');

  /**
   * loadData
   * @description Try fetching migration file; if not found, fall back to embedded sample.
   *              Accepts an optional explicitUrl which will be tried first.
   */
  const loadData = React.useCallback(async (userUrl?: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    setAttempts([]);
    setUsedFallback(false);

    const candidates = buildCandidates(userUrl);
    const result = await readJsonFromCandidates(candidates);
    setAttempts(result.attempts);

    if (result.file) {
      setData(result.file);
      setLoading(false);
      return;
    }

    // If all fetch attempts failed, fallback to embedded sample payload.
    setData(SAMPLE_MIGRATED_FILE);
    setUsedFallback(true);
    setError('Could not load exports/migrated-users.json from candidate URLs. Using embedded fallback for development.');
    setLoading(false);
  }, []);

  React.useEffect(() => {
    let mounted = true;
    if (!mounted) return;
    loadData();
    return () => {
      mounted = false;
    };
  }, [loadData]);

  /**
   * handleInstall
   * @description Install the currently loaded data to localStorage.
   */
  const handleInstall = () => {
    if (!data) return;
    const confirmMsg = `Install ${data.users.length} migrated user(s) into this browser's localStorage? This will create a local mapping under key "${LOCALSTORAGE_KEY}" that the login flow can consult. Proceed?`;
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(confirmMsg)) return;
    installToLocalStorage(data.users);
    setInstalled(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  /**
   * handleFileUpload
   * @description Parse user-uploaded JSON file and use it as migration payload.
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed)) {
          setData({ users: parsed });
          setError(null);
          setAttempts([]);
          setUsedFallback(false);
        } else if (parsed && Array.isArray((parsed as any).users)) {
          setData(parsed as MigratedFile);
          setError(null);
          setAttempts([]);
          setUsedFallback(false);
        } else {
          setError('Uploaded file has invalid shape. Expecting {"users": [...] } or an array of users.');
        }
      } catch (err) {
        setError('Failed to parse JSON file: ' + (err as any)?.message ?? String(err));
      }
    };
    reader.readAsText(file);
    // reset input so same file can be re-uploaded if needed
    e.currentTarget.value = '';
  };

  /**
   * handleUseUrl
   * @description Use the explicit URL provided by the user as the first candidate to try.
   */
  const handleUseUrl = () => {
    if (!explicitUrl.trim()) {
      alert('Please paste the exact URL to your migrated-users.json (e.g. http://127.0.0.1:8001/exports/migrated-users.json)');
      return;
    }
    loadData(explicitUrl.trim());
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
      <div className="flex items-center space-x-3">
        <Users className="w-6 h-6 text-sky-400" />
        <div>
          <h3 className="text-lg font-semibold text-white">Migration: Migrated Users</h3>
          <div className="text-sm text-slate-400">Preview and install migration metadata into localStorage</div>
        </div>
      </div>

      {/* URL input + Upload + Retry */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex gap-2 items-center flex-1">
          <input
            value={explicitUrl}
            onChange={(e) => setExplicitUrl(e.target.value)}
            placeholder="Paste exact URL (e.g. http://127.0.0.1:8001/exports/migrated-users.json)"
            className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleUseUrl}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md transition-colors"
          >
            <Link className="w-4 h-4" />
            Use URL
          </button>

          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
            <button className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-md transition-colors">
              <UploadCloud className="w-4 h-4" />
              Upload JSON
            </button>
          </label>

          <button
            onClick={() => loadData()}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry fetch
          </button>

          <button
            onClick={() => {
              setData(SAMPLE_MIGRATED_FILE);
              setUsedFallback(true);
              setError('Forced embedded fallback (development).');
            }}
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-md transition-colors"
          >
            Force fallback
          </button>
        </div>

        <div className="text-sm text-slate-400">
          <div>LocalStorage key: <span className="text-slate-200 font-medium">{LOCALSTORAGE_KEY}</span></div>
        </div>
      </div>

      {loading && <div className="text-slate-400">Loading migration file…</div>}

      {!loading && error && (
        <div>
          <div className="text-sm text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <div style={{ whiteSpace: 'pre-wrap' }}>{error}</div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={() => loadData()}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Retry fetch
            </button>

            <button
              onClick={() => setShowDebug((s) => !s)}
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-md transition-colors border border-slate-600"
            >
              {showDebug ? 'Hide network log' : 'Show network log'}
            </button>

            {usedFallback && (
              <div className="text-sm text-amber-300 ml-3">Using embedded fallback payload (development)</div>
            )}
          </div>

          {showDebug && (
            <div className="mt-4 text-xs text-slate-300 bg-slate-900/40 p-3 rounded">
              <div className="font-medium text-slate-200 mb-2">Attempted URLs</div>
              <ol className="list-decimal pl-5 space-y-1">
                {attempts.map((a, i) => (
                  <li key={i}>
                    <div className="flex items-baseline justify-between">
                      <div className="truncate">{a.url}</div>
                      <div className="ml-4 text-xs text-slate-400">
                        {a.ok ? 'OK' : a.status ? `HTTP ${a.status}` : a.error ?? 'failed'}
                        {a.corsBlocked ? ' (possible CORS / opaque response)' : ''}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {!loading && data && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-400">Produced</div>
              <div className="font-medium text-white">{data.producedAt ?? '—'}</div>
            </div>

            <div className="text-right">
              <div className="text-sm text-slate-400">Users</div>
              <div className="font-medium text-white">{data.users.length}</div>
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-400 mb-2">Sample emails</div>
            <div className="flex flex-wrap gap-2">
              {getSampleEmails(data.users).map((e) => (
                <span key={e} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                  {e}
                </span>
              ))}
            </div>
          </div>

          <div className="text-sm text-slate-400">
            Users with empty/blank passwords are marked as <span className="font-medium text-white">needsPasswordReset</span>.
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={handleInstall}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Install migration into localStorage</span>
            </button>

            <button
              onClick={() => {
                try {
                  const raw = localStorage.getItem(LOCALSTORAGE_KEY);
                  if (!raw) {
                    alert('No migration data currently installed.');
                    return;
                  }
                  const parsed = JSON.parse(raw);
                  const count = parsed && parsed.entries ? Object.keys(parsed.entries).length : 0;
                  alert(`Migration installed: ${count} entries\nKey: ${LOCALSTORAGE_KEY}`);
                } catch {
                  alert('Unable to read migration key.');
                }
              }}
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-md transition-colors border border-slate-600"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Check installed</span>
            </button>

            {/* Skip migration: create an empty mapping in localStorage so app can continue */}
            <button
              onClick={() => {
                // Confirm before making changes
                // eslint-disable-next-line no-restricted-globals
                if (!confirm('Skip migration and mark as installed (creates an empty mapping)?')) return;
                // Create empty install so rest of app treats migration as completed
                installToLocalStorage([]);
                setInstalled(true);
                setError(null);
                // Smooth scroll to top so user sees success state
                setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                alert('Migration skipped: empty mapping installed under key ' + LOCALSTORAGE_KEY);
              }}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-md transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Skip migration</span>
            </button>

            {installed && <div className="text-sm text-green-400">Installed ✓</div>}
          </div>
        </>
      )}
    </div>
  );
};

export default MigratedUsersPanel;