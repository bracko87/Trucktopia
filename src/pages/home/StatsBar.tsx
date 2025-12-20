/**
 * StatsBar.tsx
 *
 * File-level:
 * Fetches and displays global stats (Users, Trucks, Jobs, Cities).
 * Connects to three distinct Netlify functions for data.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Users, Truck, Briefcase, MapPin } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';

/**
 * StatCard
 * @description Individual stat item with icon and label.
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
 * @description Orchestrates fetching from Supabase Stats, Job Engine, and Cities Count.
 */
const StatsBar: React.FC = () => {
  const { gameState } = useGame();
  const company = gameState.company;

  const [stats, setStats] = useState<{
    users: number | null;
    trucks: number | null;
    jobs: number | null;
    cities: number | null;
  }>(({
    users: null,
    trucks: null,
    jobs: null,
    cities: null
  }));

  const [loading, setLoading] = useState(true);

  /**
   * loadAllStats
   * @description Fetches data from multiple Netlify endpoints in parallel.
   */
  const loadAllStats = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, jobsRes, citiesRes] = await Promise.all([
        fetch('/.netlify/functions/supabase-stats').then(r => r.ok ? r.json() : null),
        fetch('/.netlify/functions/total-jobs').then(r => r.ok ? r.json() : null),
        fetch('/.netlify/functions/cities-count').then(r => r.ok ? r.json() : null)
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
  }, [loadAllStats]);

  /**
   * displayValue
   * @description Formats the number or provides a fallback/loading state.
   */
  const displayValue = (val: number | null, localFallback?: number) => {
    if (val !== null) return val.toLocaleString();
    if (loading) return '...';
    if (typeof localFallback === 'number') return localFallback.toLocaleString();
    return '0';
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
        value={displayValue(stats.trucks, company?.trucks?.length)} 
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
        value={displayValue(stats.cities, company?.hubs?.length)} 
        ariaLabel="Total cities" 
      />
    </div>
  );
};

export default StatsBar;