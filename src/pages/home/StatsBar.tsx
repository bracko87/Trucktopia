/**
 * StatsBar.tsx
 *
 * File-level:
 * Displays global metrics on the home page.
 * Fetches:
 * 1. Users & Trucks from supabase-stats
 * 2. Generated Jobs from total-jobs
 * 3. Total rows in cities table from cities-count
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Users, Truck, Briefcase, MapPin } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';

/**
 * StatCard
 * @description Visual card for a single metric.
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
 * @description Orchestrates parallel fetching from Netlify endpoints.
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

  const loadAllStats = useCallback(async () => {
    setLoading(true);
    try {
      // Execute all fetches in parallel
      const [statsRes, jobsRes, citiesRes] = await Promise.all([
        fetch('/.netlify/functions/supabase-stats').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/.netlify/functions/total-jobs').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/.netlify/functions/cities-count').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      setStats({
        users: statsRes?.totalUsers ?? null,
        trucks: statsRes?.totalTrucks ?? null,
        jobs: jobsRes?.totalJobs ?? null,
        cities: citiesRes?.totalCities ?? null
      });
    } catch (err) {
      console.error('Failed to load global stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllStats();
    // Refresh every 5 minutes
    const interval = setInterval(loadAllStats, 300000);
    return () => clearInterval(interval);
  }, [loadAllStats]);

  /**
   * displayValue
   * @description Formats the count with locale grouping or fallback string.
   */
  const displayValue = (val: number | null) => {
    if (val !== null && typeof val === 'number') return val.toLocaleString();
    if (loading) return '…';
    return '—';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <StatCard 
        icon={<Users className="w-6 h-6 text-blue-400" />} 
        label="Total User Accounts" 
        value={displayValue(stats.users)} 
        ariaLabel="Total user accounts" 
      />
      <StatCard 
        icon={<Truck className="w-6 h-6 text-amber-400" />} 
        label="Total Trucks (active in game)" 
        value={displayValue(stats.trucks)} 
        ariaLabel="Total trucks" 
      />
      <StatCard 
        icon={<Briefcase className="w-6 h-6 text-green-400" />} 
        label="Total Jobs (open / global)" 
        value={displayValue(stats.jobs)} 
        ariaLabel="Total jobs" 
      />
      <StatCard 
        icon={<MapPin className="w-6 h-6 text-indigo-400" />} 
        label="In-game Cities" 
        value={displayValue(stats.cities)} 
        ariaLabel="In-game Cities" 
      />
    </div>
  );
};

export default StatsBar;