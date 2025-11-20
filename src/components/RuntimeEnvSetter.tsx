/**
 * RuntimeEnvSetter.tsx
 *
 * Development helper: small UI to set runtime environment variables into
 * window.__RUNTIME__ and localStorage for quick testing without rebuilding.
 *
 * WARNING: This is a dev/testing helper. Do NOT leave this enabled in production.
 */

import React, { useEffect, useState } from 'react';

/**
 * maskValue
 * @description Mask sensitive strings for display: show prefix & suffix only.
 * @param val string | undefined
 * @returns masked string
 */
function maskValue(val?: string): string {
  if (!val) return '(not set)';
  if (val.length <= 8) return '*'.repeat(val.length);
  return `${val.slice(0, 6)}…${val.slice(-4)}`;
}

/**
 * persistRuntime
 * @description Persist runtime values to window.__RUNTIME__ and localStorage.
 * @param url Supabase URL
 * @param anon Supabase anon key
 */
function persistRuntime(url: string, anon: string) {
  try {
    // Write to window.__RUNTIME__ so getEnvVar can pick it up immediately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = typeof window !== 'undefined' ? (window as any) : undefined;
    if (win) {
      if (!win.__RUNTIME__) win.__RUNTIME__ = {};
      win.__RUNTIME__.REACT_APP_SUPABASE_URL = url;
      win.__RUNTIME__.REACT_APP_SUPABASE_ANON_KEY = anon;
    }

    // Persist to localStorage so values survive refresh (dev convenience)
    const store = { REACT_APP_SUPABASE_URL: url, REACT_APP_SUPABASE_ANON_KEY: anon, savedAt: new Date().toISOString() };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dev_runtime_supabase', JSON.stringify(store));
    }
  } catch {
    // ignore errors in restricted contexts
  }
}

/**
 * clearRuntime
 * @description Remove runtime values from window.__RUNTIME__ and localStorage.
 */
function clearRuntime() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = typeof window !== 'undefined' ? (window as any) : undefined;
    if (win && win.__RUNTIME__) {
      delete win.__RUNTIME__.REACT_APP_SUPABASE_URL;
      delete win.__RUNTIME__.REACT_APP_SUPABASE_ANON_KEY;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('dev_runtime_supabase');
    }
  } catch {
    // ignore
  }
}

/**
 * RuntimeEnvSetter
 * @component Small admin-only helper to set runtime Supabase vars (testing only).
 */
const RuntimeEnvSetter: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [anon, setAnon] = useState<string>('');
  const [maskedAnon, setMaskedAnon] = useState<string>('(not set)');

  useEffect(() => {
    // Try to preload any saved values from localStorage or window.__RUNTIME__
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = typeof window !== 'undefined' ? (window as any) : undefined;
      const runtimeUrl = win && win.__RUNTIME__ && typeof win.__RUNTIME__.REACT_APP_SUPABASE_URL === 'string' ? win.__RUNTIME__.REACT_APP_SUPABASE_URL : undefined;
      const runtimeAnon = win && win.__RUNTIME__ && typeof win.__RUNTIME__.REACT_APP_SUPABASE_ANON_KEY === 'string' ? win.__RUNTIME__.REACT_APP_SUPABASE_ANON_KEY : undefined;

      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('dev_runtime_supabase');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (!runtimeUrl && typeof parsed.REACT_APP_SUPABASE_URL === 'string') setUrl(parsed.REACT_APP_SUPABASE_URL);
            if (!runtimeAnon && typeof parsed.REACT_APP_SUPABASE_ANON_KEY === 'string') {
              setAnon(parsed.REACT_APP_SUPABASE_ANON_KEY);
              setMaskedAnon(maskValue(parsed.REACT_APP_SUPABASE_ANON_KEY));
            }
          } catch {
            // ignore parse errors
          }
        } else {
          if (runtimeUrl) setUrl(runtimeUrl);
          if (runtimeAnon) {
            setAnon(runtimeAnon);
            setMaskedAnon(maskValue(runtimeAnon));
          }
        }
      } else {
        if (runtimeUrl) setUrl(runtimeUrl);
        if (runtimeAnon) {
          setAnon(runtimeAnon);
          setMaskedAnon(maskValue(runtimeAnon));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  /**
   * applyHandler
   * @description Persist values into runtime and update masked preview.
   */
  const applyHandler = () => {
    persistRuntime(url.trim(), anon.trim());
    setMaskedAnon(maskValue(anon.trim()));
    // Quick feedback: small DOM event so the TestSupabaseConnection component can re-check
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ev = new CustomEvent('runtime-env-updated', { detail: { url: url.trim() } });
      window.dispatchEvent(ev as any);
    } catch {
      // ignore
    }
    alert('Runtime Supabase variables applied locally in this browser (localStorage + window.__RUNTIME__).\nYou can now run the Supabase test without redeploying.');
  };

  const clearHandler = () => {
    clearRuntime();
    setUrl('');
    setAnon('');
    setMaskedAnon('(not set)');
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ev = new CustomEvent('runtime-env-updated', { detail: { url: null } });
      window.dispatchEvent(ev as any);
    } catch { }
    alert('Cleared runtime Supabase vars from this browser.');
  };

  return (
    <div className="bg-amber-900/10 border border-amber-400/20 p-4 rounded-md mb-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-amber-300">Dev Helper — Runtime Supabase Setter</h4>
          <p className="text-xs text-amber-100/80 mt-1">
            Temporarily inject REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY into
            window.__RUNTIME__ and localStorage for testing without rebuilding.
          </p>
        </div>
        <div className="text-xs text-amber-200">Testing only</div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs text-amber-100">Project URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-project-ref.supabase.co"
            className="mt-1 w-full rounded px-3 py-2 bg-amber-900/20 border border-amber-400/30 text-white text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-amber-100">Anon Key (masked)</label>
          <input
            value={anon}
            onChange={(e) => setAnon(e.target.value)}
            placeholder="supabase anon key"
            type="password"
            className="mt-1 w-full rounded px-3 py-2 bg-amber-900/20 border border-amber-400/30 text-white text-sm"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={applyHandler}
          className="bg-amber-500 hover:bg-amber-600 text-black px-3 py-1 rounded text-sm font-medium"
        >
          Apply to runtime
        </button>

        <button
          onClick={clearHandler}
          className="bg-transparent border border-amber-400 text-amber-200 px-3 py-1 rounded text-sm"
        >
          Clear
        </button>

        <div className="ml-auto text-xs text-amber-100/80">
          Current: <span className="ml-1 font-mono">{maskValue(url)}</span> • Anon: <span className="font-mono ml-1">{maskedAnon}</span>
        </div>
      </div>

      <div className="mt-2 text-xs text-amber-100/70">
        Note: This stores values in your browser only. Do not paste the service role key here.
      </div>
    </div>
  );
};

export default RuntimeEnvSetter;