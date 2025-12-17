/**
 * useTotalUsers.tsx
 *
 * File-level:
 * Hook that provides a regularly-updating total user accounts counter.
 * - Polls /.netlify/functions/supabase-stats in production-like environments.
 * - Falls back to a provided local fallback number in dev or when remote is not available.
 *
 * Responsibilities:
 * - Fetch the total user count safely and silently.
 * - Perform periodic refreshes (default 60s).
 * - Expose a stable formatted string for UI consumption.
 */
import { useEffect, useRef, useState } from 'react';

/**
 * isProductionEnv
 * @description Determine if we should treat this host as production for remote calls.
 *              Uses NODE_ENV when available, otherwise a hostname heuristic.
 */
function isProductionEnv(): boolean {
  try {
    // eslint-disable-next-line no-undef
    const nodeEnv = (typeof process !== 'undefined' && (process as any).env && (process as any).env.NODE_ENV) || undefined;
    if (nodeEnv === 'production') return true;
  } catch {
    // ignore
  }
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname || '';
  return host.endsWith('.netlify.app') || host.endsWith('your-production-domain.com') || !host.includes('localhost');
}

/**
 * fetchJsonSafe
 * @description Lightweight fetch wrapper that returns parsed JSON or throws on non-ok.
 * @param url endpoint
 */
async function fetchJsonSafe(url: string) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) return res.json();
  const txt = await res.text().catch(() => null);
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}

/**
 * useTotalUsers
 * @description Hook to provide a regularly-updating total users count string.
 * @param fallback optional fallback number used when remote is not called or missing
 * @param intervalMs polling interval in milliseconds (default 60_000 = 60s)
 * @returns formatted string (e.g. "1,234", "—", or "…")
 */
export default function useTotalUsers(fallback?: number, intervalMs = 60_000): string {
  const [value, setValue] = useState<string>(() => (typeof fallback === 'number' ? fallback.toLocaleString() : '—'));
  const attempts = useRef(0);
  const maxAttempts = 5;

  useEffect(() => {
    let mounted = true;
    let timer: number | null = null;
    const prod = isProductionEnv();

    const load = async () => {
      if (!prod) {
        // In non-production prefer fallback immediately
        if (mounted) {
          setValue(typeof fallback === 'number' ? fallback.toLocaleString() : '—');
        }
        return;
      }

      try {
        // Show loading ellipsis on first attempt
        if (attempts.current === 0 && mounted) setValue('…');
        const json = await fetchJsonSafe('/.netlify/functions/supabase-stats');
        const total = typeof json?.totalUsers === 'number' ? json.totalUsers : fallback ?? null;
        if (!mounted) return;
        setValue(total === null || typeof total === 'undefined' ? '—' : total.toLocaleString());
        attempts.current = 0;
      } catch (err) {
        attempts.current = Math.min(maxAttempts, attempts.current + 1);
        // silence errors, fall back to local if available
        if (mounted) {
          if (typeof fallback === 'number') setValue(fallback.toLocaleString());
          else if (attempts.current === 1) setValue('—');
        }
      } finally {
        if (!mounted) return;
        // schedule next poll
        timer = window.setTimeout(load, intervalMs);
      }
    };

    load().catch(() => {
      /* silent */
    });

    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [fallback, intervalMs]);

  return value;
}