/**
 * EnvDebug.tsx
 *
 * Small admin/debug component that probes common runtime locations for environment
 * variables and displays masked diagnostics. This helps detect typos (e.g. EACT_...)
 * and whether values were injected at build/runtime.
 */

import React from 'react';

/**
 * maskValue
 * @description Mask sensitive strings: show a short prefix and suffix, hide middle.
 * @param val string | undefined
 * @returns masked string
 */
function maskValue(val?: string): string {
  if (!val) return '(not set)';
  if (val.length <= 8) return '*'.repeat(val.length);
  return `${val.slice(0, 6)}…${val.slice(-2)}`;
}

/**
 * findSupabaseLikeKeys
 * @description Inspect an object for keys that include the substring "SUPABASE" (case-insensitive).
 * Useful to detect typos or similar env names present on a runtime object.
 * @param obj any
 * @returns array of keys found
 */
function findSupabaseLikeKeys(obj: any): string[] {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj).filter(k => /supabase/i.test(k));
}

/**
 * EnvDebug
 * @component Display which runtime sources contain supabase-related variables.
 */
const EnvDebug: React.FC = () => {
  // Safe guarded lookups
  // Avoid throwing in SSR / build-time by guarding typeof checks.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gw = (typeof globalThis !== 'undefined' ? (globalThis as any) : undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = (typeof window !== 'undefined' ? (window as any) : undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proc = (typeof process !== 'undefined' ? (process as any) : undefined);

  // Candidate values (do not display full anon key)
  const fromGlobalThis = gw && typeof gw.REACT_APP_SUPABASE_URL === 'string' ? String(gw.REACT_APP_SUPABASE_URL) : undefined;
  const fromWindowEnv = win && win.__ENV__ && typeof win.__ENV__.REACT_APP_SUPABASE_URL === 'string' ? String(win.__ENV__.REACT_APP_SUPABASE_URL) : undefined;
  const fromWindowRuntime = win && win.__RUNTIME__ && typeof win.__RUNTIME__.REACT_APP_SUPABASE_URL === 'string' ? String(win.__RUNTIME__.REACT_APP_SUPABASE_URL) : undefined;
  const fromProcess = proc && proc.env && typeof proc.env.REACT_APP_SUPABASE_URL === 'string' ? String(proc.env.REACT_APP_SUPABASE_URL) : undefined;

  // Keys that look like supabase keys in those objects (helps detect typos)
  const globalKeys = findSupabaseLikeKeys(gw);
  const windowKeys = findSupabaseLikeKeys(win);
  const processKeys = proc && proc.env ? findSupabaseLikeKeys(proc.env) : [];

  // Check anon key presence (boolean only) using same safe checks
  const anonPresent =
    Boolean(gw && gw.REACT_APP_SUPABASE_ANON_KEY) ||
    Boolean(win && win.__ENV__ && win.__ENV__.REACT_APP_SUPABASE_ANON_KEY) ||
    Boolean(win && win.__RUNTIME__ && win.__RUNTIME__.REACT_APP_SUPABASE_ANON_KEY) ||
    Boolean(proc && proc.env && proc.env.REACT_APP_SUPABASE_ANON_KEY);

  return (
    <div className="mt-4 p-4 rounded-md border border-slate-700 bg-slate-800">
      <h4 className="text-sm font-semibold text-white mb-2">Runtime Env Diagnostics</h4>

      <div className="text-xs text-slate-400 mb-2">
        This panel inspects a few runtime locations for REACT_APP_SUPABASE_* values.
        It never prints the full anon key — only masked diagnostics for safety.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-slate-400">globalThis.REACT_APP_SUPABASE_URL</div>
          <div className="text-slate-200 font-mono">{maskValue(fromGlobalThis)}</div>
          {globalKeys.length > 0 && (
            <div className="text-amber-300 mt-1">
              Keys found on globalThis: {globalKeys.join(', ')}
            </div>
          )}
        </div>

        <div>
          <div className="text-slate-400">window.__ENV__ / __RUNTIME__</div>
          <div className="text-slate-200 font-mono">__ENV__: {maskValue(fromWindowEnv)}</div>
          <div className="text-slate-200 font-mono">__RUNTIME__: {maskValue(fromWindowRuntime)}</div>
          {windowKeys.length > 0 && (
            <div className="text-amber-300 mt-1">
              Keys found on window: {windowKeys.join(', ')}
            </div>
          )}
        </div>

        <div>
          <div className="text-slate-400">process.env.REACT_APP_SUPABASE_URL</div>
          <div className="text-slate-200 font-mono">{maskValue(fromProcess)}</div>
          {processKeys.length > 0 && (
            <div className="text-amber-300 mt-1">
              Keys found in process.env: {processKeys.join(', ')}
            </div>
          )}
        </div>

        <div>
          <div className="text-slate-400">Anon key present?</div>
          <div className={`text-sm font-medium ${anonPresent ? 'text-green-400' : 'text-red-400'}`}>
            {anonPresent ? 'Yes (masked)' : 'No'}
          </div>

          <div className="text-xs text-slate-500 mt-2">
            Tips:
            <ul className="list-disc ml-4">
              <li>Check for typos (EACT_APP... or leading/trailing spaces).</li>
              <li>Ensure the variables are set for the build context and branch you deployed.</li>
              <li>If you just added them, trigger a redeploy / new build so they are baked into the site.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvDebug;
