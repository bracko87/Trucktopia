/**
 * RemoteStats.tsx
 *
 * Small admin stat grid that fetches system counts from a server endpoint
 * (netlify function /.netlify/functions/supabase-stats) which returns
 * totals sourced from Supabase (Auth + Postgres).
 *
 * Responsibilities:
 * - Request counts from the serverless endpoint and render the 4-box grid:
 *   Total Users | With Companies | Active Today | Storage Used
 * - Preserve visual layout & Tailwind classes from the existing admin UI.
 * - Graceful fallbacks when server returns nulls or errors.
 */

import React, { useEffect, useState } from 'react';

/**
 * StatsShape
 * @description Shape returned by the serverless stats endpoint
 */
interface StatsShape {
  totalUsers: number | null;
  usersWithCompanies: number | null;
  activeToday: number | null;
  storageUsed: number | null | undefined;
}

/**
 * RemoteStats
 * @description Fetch remote stats and render the stat cards.
 */
const RemoteStats: React.FC = () => {
  const [stats, setStats] = useState<StatsShape | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/.netlify/functions/supabase-stats');
        if (!res.ok) {
          const txt = await res.text().catch(() => 'Failed to fetch');
          throw new Error(txt || `Status ${res.status}`);
        }
        const json = await res.json();
        if (!mounted) return;
        setStats({
          totalUsers: typeof json.totalUsers === 'number' ? json.totalUsers : null,
          usersWithCompanies: typeof json.usersWithCompanies === 'number' ? json.usersWithCompanies : null,
          activeToday: typeof json.activeToday === 'number' ? json.activeToday : null,
          storageUsed: typeof json.storageUsed === 'number' ? json.storageUsed : null
        });
      } catch (err: any) {
        if (!mounted) return;
        setError(String(err?.message || err));
        setStats(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();
    return () => { mounted = false; };
  }, []);

  // Fallback client-side storage calculation (small helper)
  const calcLocalStorageKB = () => {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        const v = localStorage.getItem(k) || '';
        total += k.length + v.length;
      }
      // approximate bytes -> KB
      return Math.round(total / 1024);
    } catch {
      return 0;
    }
  };

  const display = {
    totalUsers: stats?.totalUsers ?? 0,
    usersWithCompanies: stats?.usersWithCompanies ?? 0,
    activeToday: stats?.activeToday ?? 0,
    storageUsed: (stats?.storageUsed ?? calcLocalStorageKB())
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center space-x-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users w-5 h-5 text-blue-400" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <div className="text-sm text-slate-400">Total Users</div>
        </div>
        <div className="text-2xl font-bold text-white">{loading ? '…' : display.totalUsers}</div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center space-x-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-building w-5 h-5 text-green-400" aria-hidden="true"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>
          <div className="text-sm text-slate-400">With Companies</div>
        </div>
        <div className="text-2xl font-bold text-white">{loading ? '…' : display.usersWithCompanies}</div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center space-x-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chart-column w-5 h-5 text-yellow-400" aria-hidden="true"><path d="M3 3v16a2 2 0 0 0 2 2h16"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path></svg>
          <div className="text-sm text-slate-400">Active Today</div>
        </div>
        <div className="text-2xl font-bold text-white">{loading ? '…' : display.activeToday}</div>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center space-x-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings w-5 h-5 text-purple-400" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          <div className="text-sm text-slate-400">Storage Used</div>
        </div>
        <div className="text-2xl font-bold text-white">{loading ? '…' : `${display.storageUsed} KB`}</div>
      </div>

      {error && (
        <div className="col-span-4 text-sm text-rose-400 mt-2">
          Error loading remote stats: {error}
        </div>
      )}
    </div>
  );
};

export default RemoteStats;