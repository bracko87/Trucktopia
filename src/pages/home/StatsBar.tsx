/**
 * StatsBar.tsx
 *
 * File-level:
 * Compact stats row that shows aggregated counts (users, trucks, jobs, cities).
 * 
 * Responsibilities:
 * - Fetch remote counts from Netlify functions.
 * - Provide local fallbacks from GameContext to ensure numbers are always visible.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Users, Truck, Briefcase, MapPin } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';

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
 * @description Fetches global stats from Netlify functions and renders cards.
 */
const StatsBar: React.FC = () => {
  const { gameState } = useGame();
  const company = gameState.company;

  const [stats, setStats] = useState<{
    users: number | null;
    trucks: number | null;
    jobs: number | null;
    cities: number | null;
  }>({
    users: null,
    trucks: null,
    jobs: null,
    cities: null
  });

  const [loading, setLoading] = useState(true);

  /**
   * loadStats
   * @description Call Netlify functions to get the latest global counts.
   */
  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch user/truck/job stats
      const statsRes = await fetch('/.netlify/functions/supabase-stats').then(r => r.ok ? r.json() : null);
      // Fetch cities count
      const citiesRes = await fetch('/.netlify/functions/cities-count').then(r => r.ok ? r.json() : null);

      setStats({
        users: statsRes?.totalUsers ?? null,
        trucks: statsRes?.totalTrucks ?? null,
        jobs: statsRes?.totalJobs ?? null,
        cities: citiesRes?.totalCities ?? null
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /**
   * getValue
   * @description Returns the remote value, or a local fallback, or a placeholder.
   */
  const getValue = (remote: number | null, local?: number) => {
    if (remote !== null) return remote.toLocaleString();
    if (loading && remote === null) return '...';
    if (typeof local === 'number') return local.toLocaleString();
    return '—';
  };

  // Local fallbacks from current company state
  const localTrucks = Array.isArray(company?.trucks) ? company.trucks.length : 0;
  const localCities = Array.isArray(company?.hubs) ? company.hubs.length : 1;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <StatCard 
        icon={<Users className="w-6 h-6 text-blue-400" />} 
        label="Total User Accounts" 
        value={getValue(stats.users)} 
        ariaLabel="Total user accounts" 
      />
      <StatCard 
        icon={<Truck className="w-6 h-6 text-amber-400" />} 
        label="Total Trucks (active in game)" 
        value={getValue(stats.trucks, localTrucks)} 
        ariaLabel="Total trucks" 
      />
      <StatCard 
        icon={<Briefcase className="w-6 h-6 text-green-400" />} 
        label="Total Jobs (open / global)" 
        value={getValue(stats.jobs)} 
        ariaLabel="Total jobs" 
      />
      <StatCard 
        icon={<MapPin className="w-6 h-6 text-indigo-400" />} 
        label="In-game Cities" 
        value={getValue(stats.cities, localCities)} 
        ariaLabel="Total cities" 
      />
    </div>
  );
};

export default StatsBar;