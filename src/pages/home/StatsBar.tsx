/**
 * StatsBar.tsx
 *
 * File-level:
 * Compact stats row that shows aggregated counts (users, trucks, jobs).
 * This variant performs automatic background fetches from a serverless endpoint
 * (/.netlify/functions/supabase-stats) and retries silently using exponential
 * backoff. No diagnostic UI is shown — all retry activity happens in the background.
 *
 * Responsibilities:
 * - Fetch remote counts automatically on mount.
 * - Retry in background with exponential backoff (no buttons / no visible diagnostics).
 * - Prefer serverless endpoint (requires server-side SUPABASE_SERVICE_ROLE for full counts).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Users, Truck, Briefcase } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';

/**
 * StatsShape
 * @description Expected shape returned by the remote stats endpoint.
 */
interface StatsShape {
  totalUsers?: number | null;
  totalTrucks?: number | null;
  totalJobs?: number | null;
  source?: string | null;
}

/**
 * fetchJsonSafe
 * @description Basic fetch wrapper that throws on non-ok and attempts to parse JSON or fallback to null.
 * @param url endpoint to fetch
 * @param opts fetch options
 */
async function fetchJsonSafe(url: string, opts?: RequestInit) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) {
    return res.json();
  }
  const txt = await res.text().catch(() => null);
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return txt;
  }
}

/**
 * StatCard
 * @description Tiny presentational card for one stat value.
 */
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; ariaLabel?: string }> = ({ icon, label, value, ariaLabel }) => (
  <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center space-x-4" aria-label={ariaLabel || label}>
    <div className="p-3 rounded-lg bg-white/5 flex items-center justify-center text-slate-200">
      {icon}
    </div>
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  </div>
);

/**
 * StatsBar
 * @description Fetches global stats automatically and renders three stat cards (users, trucks, jobs).
 *              Automatic background retries will happen silently — no UI retry buttons or diagnostic messages.
 */
const StatsBar: React.FC = () => {
  const { gameState } = useGame();
  const company = gameState.company;

  const [remote, setRemote] = useState<StatsShape | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // retry state (kept internal only)
  const attemptsRef = useRef<number>(0);
  const maxAttempts = 5;
  const retryTimerRef = useRef<number | null>(null);

  /**
   * loadFromServerless
   * @description Primary attempt: call our serverless endpoint which should run with SUPABASE_SERVICE_ROLE.
   */
  const loadFromServerless = useCallback(async () => {
    setLoading(true);
    try {
      const json = await fetchJsonSafe('/.netlify/functions/supabase-stats', { credentials: 'same-origin' });
      const normalized: StatsShape = {
        totalUsers: typeof json?.totalUsers === 'number' ? json.totalUsers : null,
        totalTrucks: typeof json?.totalTrucks === 'number' ? json.totalTrucks : null,
        totalJobs: typeof json?.totalJobs === 'number' ? json.totalJobs : null,
        source: 'serverless'
      };
      setRemote(normalized);
      attemptsRef.current = 0;
    } catch (err) {
      // swallow errors intentionally; this component must remain silent in the UI.
      setRemote(null);
      attemptsRef.current = Math.min(maxAttempts, attemptsRef.current + 1);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * scheduleRetry
   * @description Schedule a background retry using exponential backoff (no UI buttons).
   */
  const scheduleRetry = useCallback(() => {
    if (attemptsRef.current >= maxAttempts) return;
    const base = 2;
    const waitSeconds = Math.pow(base, attemptsRef.current); // 2^attempts (1,2,4,8,...)
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryTimerRef.current = window.setTimeout(() => {
      loadFromServerless().catch(() => {
        // loadFromServerless handles internal state
      });
    }, waitSeconds * 1000);
  }, [loadFromServerless]);

  // On mount: perform initial load
  useEffect(() => {
    loadFromServerless().catch(() => {
      /* silent */
    });

    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [loadFromServerless]);

  // When remote is not available and we still have retry budget, schedule automatic retry
  useEffect(() => {
    if (!remote && attemptsRef.current > 0 && attemptsRef.current < maxAttempts) {
      scheduleRetry();
    }
    // noop cleanup; timers cleared on unmount
  }, [remote, scheduleRetry]);

  /**
   * renderNumber
   * @description Prefer remote values; fall back to company-local when possible.
   */
  const renderNumber = (remoteValue?: number | null, fallback?: number | undefined) => {
    if (loading && !remote) return '…';
    if (typeof remoteValue === 'number') return remoteValue.toLocaleString();
    if (typeof fallback === 'number') return fallback.toLocaleString();
    return '—';
  };

  const totalUsers = renderNumber(remote?.totalUsers);
  const totalTrucks = renderNumber(remote?.totalTrucks, Array.isArray(company?.trucks) ? company!.trucks!.length : undefined);
  const totalJobs = renderNumber(remote?.totalJobs);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Users className="w-6 h-6 text-blue-400" />} label="Total User Accounts" value={totalUsers} ariaLabel="Total user accounts" />
        <StatCard icon={<Truck className="w-6 h-6 text-amber-400" />} label="Total Trucks (global / yours)" value={totalTrucks} ariaLabel="Total trucks" />
        <StatCard icon={<Briefcase className="w-6 h-6 text-green-400" />} label="Total Jobs (open / global)" value={totalJobs} ariaLabel="Total jobs" />
      </div>
      {/* Intentionally no diagnostic or retry UI: background fetch/retry only */}
    </div>
  );
};

export default StatsBar;
