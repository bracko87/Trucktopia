/**
 * StatsBar.tsx
 *
 * Small, focused component that fetches aggregated site stats (total users,
 * total trucks, total jobs) and displays them in a compact card row.
 *
 * Responsibilities:
 * - Fetch from /.netlify/functions/supabase-stats (if available) and extract
 *   totalUsers, totalTrucks, totalJobs.
 * - Fall back to user's company-local numbers for trucks when remote data is absent.
 * - Render clean placeholder when a metric is not available.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
}

/**
 * fetchStatsJson
 * @description Minimal fetch helper that prefers JSON and returns parsed object.
 *              Throws on non-JSON non-ok responses.
 * @param url endpoint to call
 */
const fetchStatsJson = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  const contentType = (res.headers.get('content-type') || '').toLowerCase();

  if (!res.ok) {
    // Avoid returning raw HTML bodies; just throw status
    throw new Error(`${res.status} ${res.statusText}`);
  }

  if (contentType.includes('application/json')) {
    return res.json();
  }

  // Attempt to parse text body as JSON; otherwise throw
  const text = await res.text().catch(() => null);
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Remote endpoint returned non-JSON response.');
  }
};

/**
 * StatCard
 * @description Tiny presentational card for one stat value.
 */
const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center space-x-4">
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
 * @description Fetches global stats and renders three stat cards (users, trucks, jobs).
 */
const StatsBar: React.FC = () => {
  const { gameState } = useGame();
  const company = gameState.company;

  const [remote, setRemote] = useState<StatsShape | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await fetchStatsJson('/.netlify/functions/supabase-stats');
      setRemote({
        totalUsers: typeof json.totalUsers === 'number' ? json.totalUsers : null,
        totalTrucks: typeof json.totalTrucks === 'number' ? json.totalTrucks : null,
        totalJobs: typeof json.totalJobs === 'number' ? json.totalJobs : null,
      });
    } catch (err: any) {
      // Silently fallback - remote data is optional for this UI
      setRemote(null);
      setError(String(err?.message ?? 'Unable to load remote stats'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const renderNumber = (remoteValue?: number | null, fallback?: number | undefined) => {
    if (loading) return '…';
    if (typeof remoteValue === 'number') return remoteValue.toLocaleString();
    if (typeof fallback === 'number') return fallback.toLocaleString();
    return '—';
  };

  const totalUsers = renderNumber(remote?.totalUsers);
  const totalTrucks = renderNumber(remote?.totalTrucks, Array.isArray(company?.trucks) ? company!.trucks!.length : undefined);
  const totalJobs = renderNumber(remote?.totalJobs);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard icon={<Users className="w-6 h-6 text-blue-400" />} label="Total User Accounts" value={totalUsers} />
      <StatCard icon={<Truck className="w-6 h-6 text-amber-400" />} label="Total Trucks (global / yours)" value={totalTrucks} />
      <StatCard icon={<Briefcase className="w-6 h-6 text-green-400" />} label="Total Jobs (open / global)" value={totalJobs} />
      {/* Small hint when remote fetch failed */}
      {error && (
        <div className="sm:col-span-3 text-sm text-slate-400 mt-1">
          Note: live global stats unavailable — showing local fallbacks where possible.
        </div>
      )}
    </div>
  );
};

export default StatsBar;