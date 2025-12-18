/**
 * StatsBar.tsx
 *
 * File-level:
 * Compact stats row that shows aggregated counts (users, trucks, jobs, cities).
 * - Prefers serverless endpoints when running in production-like environments.
 * - Falls back silently to local/company data when server endpoints are not available.
 *
 * Responsibilities:
 * - Fetch remote counts automatically on mount (production only).
 * - Fetch persisted total-jobs via /.netlify/functions/total-jobs when remote stats missing.
 * - Fetch total cities via /.netlify/functions/cities-count.
 * - Retry remote stats with exponential backoff (silent).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Users, Truck, Briefcase, MapPin } from 'lucide-react';
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
 * isProductionEnv
 * @description Determine if we are running in production. Prefer NODE_ENV when available,
 *              otherwise use a hostname heuristic. This prevents accidental remote calls during local dev.
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
  // Adjust this hostname check to include your actual production domain(s) if needed.
  const prodHosts = ['localhost', 'www.trucktopia.org', 'trucktopia.org'];
  return Boolean(prodHosts.includes(host) || host.endsWith('.netlify.app') || host.endsWith('your-production-domain.com'));
}

/**
 * StatsBar
 * @description Fetches global stats automatically and renders stat cards (users, trucks, jobs, cities).
 *              Automatic background retries will happen silently — no UI buttons or diagnostic messages.
 *              Remote fetch only runs in production as determined by isProductionEnv().
 */
const StatsBar: React.FC = () => {
  const { gameState } = useGame();
  const company = gameState.company;

  const [remote, setRemote] = useState<StatsShape | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // server-stored jobs fallback (fetched from /.netlify/functions/total-jobs)
  const [serverJobs, setServerJobs] = useState<number | null>(null);
  const [serverJobsLoading, setServerJobsLoading] = useState<boolean>(false);

  // server-side cities count
  const [serverCities, setServerCities] = useState<number | null>(null);
  const [serverCitiesLoading, setServerCitiesLoading] = useState<boolean>(false);

  // retry state (kept internal only)
  const attemptsRef = useRef<number>(0);
  const maxAttempts = 5;
  const retryTimerRef = useRef<number | null>(null);

  const prod = isProductionEnv();

  /**
   * loadFromServerless
   * @description Primary attempt: call our serverless endpoint which should run with SUPABASE_SERVICE_ROLE.
   *              Only invoked when in production (safe-guard).
   */
  const loadFromServerless = useCallback(async () => {
    if (!prod) return;
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
  }, [prod]);

  /**
   * scheduleRetry
   * @description Schedule a background retry using exponential backoff (no UI buttons).
   */
  const scheduleRetry = useCallback(() => {
    if (!prod) return;
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
  }, [loadFromServerless, prod]);

  // On mount: perform initial load only in production
  useEffect(() => {
    if (!prod) return;
    loadFromServerless().catch(() => {
      /* silent */
    });

    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [loadFromServerless, prod]);

  // When remote is not available and we still have retry budget, schedule automatic retry
  useEffect(() => {
    if (!prod) return;
    if (!remote && attemptsRef.current > 0 && attemptsRef.current < maxAttempts) {
      scheduleRetry();
    }
    // noop cleanup; timers cleared on unmount
  }, [remote, scheduleRetry, prod]);

  /**
   * fetchServerJobs
   * @description Fetch the persisted/generated total jobs value from our serverless function.
   */
  const fetchServerJobs = useCallback(async () => {
    setServerJobsLoading(true);
    try {
      const res = await fetch('/.netlify/functions/total-jobs', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      if (json && typeof json.totalJobs === 'number') {
        setServerJobs(json.totalJobs);
      } else {
        setServerJobs(null);
      }
    } catch {
      setServerJobs(null);
    } finally {
      setServerJobsLoading(false);
    }
  }, []);

  /**
   * fetchServerCities
   * @description Fetch total cities count from serverless function that queries Supabase.
   */
  const fetchServerCities = useCallback(async () => {
    setServerCitiesLoading(true);
    try {
      const res = await fetch('/.netlify/functions/cities-count', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      if (json && typeof json.totalCities === 'number') {
        setServerCities(json.totalCities);
      } else {
        setServerCities(null);
      }
    } catch {
      setServerCities(null);
    } finally {
      setServerCitiesLoading(false);
    }
  }, []);

  // Fetch serverJobs when needed: only if we do not have remote totalJobs
  useEffect(() => {
    if (!prod) return;
    if (typeof remote?.totalJobs === 'number') return;
    // Try to load server-stored jobs metric
    fetchServerJobs().catch(() => {
      /* silent */
    });
  }, [prod, remote?.totalJobs, fetchServerJobs]);

  // Always attempt to fetch cities count in production
  useEffect(() => {
    if (!prod) return;
    fetchServerCities().catch(() => {
      /* silent */
    });
  }, [prod, fetchServerCities]);

  /**
   * renderNumber
   * @description Prefer remote values (production); fall back to server-stored number only when explicitly allowed
   *              (this prevents the jobs number from leaking into other metrics).
   * @param remoteValue value from remote stats endpoint
   * @param fallback local/company fallback
   * @param allowServerJobsFallback when true, use serverJobs as an intermediate fallback
   */
  const renderNumber = (remoteValue?: number | null, fallback?: number | undefined, allowServerJobsFallback = false) => {
    // If not production, prefer fallback/local values immediately.
    if (!prod) {
      if (typeof fallback === 'number') return fallback.toLocaleString();
      return '—';
    }

    if (loading && !remote) return '…';
    if (typeof remoteValue === 'number') return remoteValue.toLocaleString();

    // If this metric is allowed to use the serverJobs fallback (only for jobs),
    // prefer server-stored jobs when present.
    if (allowServerJobsFallback) {
      if (!loading && typeof serverJobs === 'number') return serverJobs.toLocaleString();
      if (serverJobsLoading) return '…';
    }

    if (typeof fallback === 'number') return fallback.toLocaleString();
    return '—';
  };

  const totalUsers = renderNumber(remote?.totalUsers, undefined);
  const totalTrucks = renderNumber(remote?.totalTrucks, Array.isArray(company?.trucks) ? company!.trucks!.length : undefined);
  // Note: remote?.totalJobs preferred; serverJobs used as fallback (persisted on server). Only jobs are allowed to use serverJobs fallback.
  const totalJobs = renderNumber(remote?.totalJobs, undefined, true);

  // For cities: prefer serverCities when available; fallback to company.hubs length if present
  const renderCities = () => {
    if (!prod) {
      const local = Array.isArray(company?.hubs) ? company!.hubs!.length : undefined;
      if (typeof local === 'number') return local.toLocaleString();
      return '—';
    }
    if (serverCitiesLoading) return '…';
    if (typeof serverCities === 'number') return serverCities.toLocaleString();
    return '—';
  };

  const totalCities = renderCities();

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-6 h-6 text-blue-400" />} label="Total User Accounts" value={totalUsers} ariaLabel="Total user accounts" />
        <StatCard icon={<Truck className="w-6 h-6 text-amber-400" />} label="Total Trucks (active in game)" value={totalTrucks} ariaLabel="Total trucks (active in game)" />
        <StatCard icon={<Briefcase className="w-6 h-6 text-green-400" />} label="Total Jobs (open / global)" value={totalJobs} ariaLabel="Total jobs" />
        <StatCard icon={<MapPin className="w-6 h-6 text-indigo-400" />} label="In-game Cities" value={totalCities} ariaLabel="Total in-game cities" />
      </div>
      {/* Intentionally no diagnostic or retry UI: background fetch/retry only */}
    </div>
  );
};

export default StatsBar;