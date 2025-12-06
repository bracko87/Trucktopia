/**
 * AdminDashboard.tsx
 *
 * Top-level admin dashboard page for system administrators.
 *
 * Responsibilities:
 * - Display system and job statistics
 * - Provide admin quick actions and navigation
 * - Show RemoteStats in a suppressed-error mode (hideErrors)
 *
 * NOTE: Migration panel intentionally removed to avoid exposing serverless migration endpoints.
 */

/**
 * @file Provides the AdminDashboard page for administrators.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import {
  Shield,
  UserCog,
  Cpu,
  Database,
  Truck,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import RemoteStats from '../components/admin/RemoteStats';
import UsedTruckGeneratorCard from '../components/admin/UsedTruckGeneratorCard';
import MigratedUsersPanel from '../components/migration/MigratedUsersPanel'; // <-- Added migration panel

/**
 * UserStats
 * @description Basic system user/statistics shape
 */
interface UserStats {
  totalUsers: number;
  usersWithCompanies: number;
  activeToday: number;
  storageUsed: number; // KB
}

/**
 * JobStats
 * @description Basic freight job database statistics
 */
interface JobStats {
  totalJobs: number;
  activeJobs: number;
  citiesWithJobs: number;
  averageValue: number;
  lastUpdate: string;
}

/**
 * CityJobCount
 * @description Job counts grouped by city
 */
interface CityJobCount {
  city: string;
  jobCount: number;
  averageValue: number;
}

/**
 * AdminDashboard
 * @description Root admin page component. Renders summary panels and actions.
 */
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { gameState } = useGame();

  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    usersWithCompanies: 0,
    activeToday: 0,
    storageUsed: 0
  });

  const [jobStats, setJobStats] = useState<JobStats>({
    totalJobs: 0,
    activeJobs: 0,
    citiesWithJobs: 0,
    averageValue: 0,
    lastUpdate: ''
  });

  const [cityJobCounts, setCityJobCounts] = useState<CityJobCount[]>([]);

  useEffect(() => {
    loadUserStats();
    loadJobMarketData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * loadUserStats
   * @description Read localStorage to populate simple user statistics and approximate storage usage
   */
  const loadUserStats = () => {
    try {
      const users = JSON.parse(localStorage.getItem('tm_users') || '[]');
      const today = new Date().toDateString();

      const stats: UserStats = {
        totalUsers: users.length,
        usersWithCompanies: users.filter((user: any) => user.company).length,
        activeToday: users.filter((user: any) => {
          const created = user?.lastActive || user?.createdAt || Date.now();
          return new Date(created).toDateString() === today;
        }).length,
        storageUsed: calculateStorageSize()
      };

      setUserStats(stats);
    } catch (e) {
      // If parsing fails, keep default zeroed stats
      console.error('loadUserStats error', e);
    }
  };

  /**
   * calculateStorageSize
   * @description Quick estimation of important localStorage keys (KB)
   */
  const calculateStorageSize = (): number => {
    try {
      const keys = ['tm_users', 'tm_game_state', 'tm_admin_account', 'tm_job_market'];
      let total = 0;
      keys.forEach((k) => {
        const v = localStorage.getItem(k);
        if (v) total += new Blob([v]).size;
      });
      return Math.round(total / 1024);
    } catch (e) {
      return 0;
    }
  };

  /**
   * loadJobMarketData
   * @description Load job market data from localStorage and derive summary stats
   */
  const loadJobMarketData = () => {
    try {
      const stored = localStorage.getItem('tm_job_market');
      if (!stored) {
        setJobStats((s) => ({ ...s, lastUpdate: new Date().toLocaleString() }));
        setCityJobCounts([]);
        return;
      }
      const parsed = JSON.parse(stored);
      const jobs = parsed.jobs || [];
      calculateJobStats(jobs);
    } catch (e) {
      console.error('loadJobMarketData error', e);
    }
  };

  /**
   * calculateJobStats
   * @description Compute aggregated job statistics and top city counts
   */
  const calculateJobStats = (jobs: any[]) => {
    const total = jobs.length;
    const avg = total > 0 ? Math.round(jobs.reduce((s, j) => s + (j.value || 0), 0) / total) : 0;
    const citiesWithJobs = new Set(jobs.map((j) => j.origin)).size;

    setJobStats({
      totalJobs: total,
      activeJobs: total,
      citiesWithJobs,
      averageValue: avg,
      lastUpdate: new Date().toLocaleString()
    });

    const cityMap: Record<string, { count: number; totalValue: number }> = {};
    jobs.forEach((job) => {
      const origin = job.origin || 'Unknown';
      if (!cityMap[origin]) cityMap[origin] = { count: 0, totalValue: 0 };
      cityMap[origin].count++;
      cityMap[origin].totalValue += job.value || 0;
    });

    const arr = Object.entries(cityMap).map(([city, d]) => ({
      city,
      jobCount: d.count,
      averageValue: Math.round(d.totalValue / d.count)
    }));

    setCityJobCounts(arr.sort((a, b) => b.jobCount - a.jobCount).slice(0, 10));
  };

  /**
   * getAllSystemTrucks
   * @description Collect trucks across all users (used for fleet overview)
   */
  const getAllSystemTrucks = () => {
    try {
      const users = JSON.parse(localStorage.getItem('tm_users') || '[]');
      const items: any[] = [];
      users.forEach((u: any) => {
        (u.company?.trucks || []).forEach((t: any) => items.push({ ...t, owner: u.email }));
      });
      return items;
    } catch (e) {
      return [];
    }
  };

  /**
   * getAllSystemTrailers
   * @description Collect trailers across all users
   */
  const getAllSystemTrailers = () => {
    try {
      const users = JSON.parse(localStorage.getItem('tm_users') || '[]');
      const items: any[] = [];
      users.forEach((u: any) => {
        (u.company?.trailers || []).forEach((t: any) => items.push({ ...t, owner: u.email }));
      });
      return items;
    } catch (e) {
      return [];
    }
  };

  // Basic admin guard: ensure logged-in user is the admin account
  const isAdmin = gameState.currentUser === 'bracko87@live.com';

  if (!isAdmin) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">This page is only accessible to system administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Shield className="w-8 h-8 text-green-400" />
            <span>Admin Dashboard</span>
          </h1>
          <p className="text-slate-400">System administration and user management</p>
        </div>

        <div className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-2">
          <Shield className="w-5 h-5 text-green-400" />
          <span className="text-white font-medium">Administrator</span>
        </div>
      </div>

      {/* RemoteStats: hideErrors enabled to suppress runtime banners */}
      <RemoteStats hideErrors />

      {/* Migration panel: quick access for admins to preview & install migrated users */}
      <div className="mt-6">
        <MigratedUsersPanel />
      </div>

      {/* Admin Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Game Rules & Engines */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Cpu className="w-6 h-6 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Game Rules & Engines</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Manage engines, game rules and scheduled jobs.
          </p>
          <button
            onClick={() => navigate('/admin/game-rules')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <Cpu className="w-5 h-5" />
            <span>Manage Rules & Engines</span>
          </button>
        </div>

        {/* User Management */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <UserCog className="w-6 h-6 text-green-400" />
            <h2 className="text-lg font-semibold text-white">User Management</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Manage user accounts and view activity.
          </p>
          <button
            onClick={() => navigate('/admin/users')}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <UserCog className="w-5 h-5" />
            <span>Manage Users</span>
          </button>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400">Registered Users</div>
              <div className="text-xl font-bold text-white">{userStats.totalUsers}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400">Active Companies</div>
              <div className="text-xl font-bold text-white">{userStats.usersWithCompanies}</div>
            </div>
          </div>
        </div>

        {/* Freight Job Database */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Database className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Freight Job Database</h3>
              <p className="text-sm text-slate-400">Overview of freight jobs</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-2">Total Jobs</div>
              <div className="text-2xl font-bold text-white">{jobStats.totalJobs.toLocaleString()}</div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-2">Avg Value</div>
              <div className="text-2xl font-bold text-white">€{jobStats.averageValue.toLocaleString()}</div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-2">Last Update</div>
              <div className="text-sm font-medium text-white">{jobStats.lastUpdate}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/job-database')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Database className="w-4 h-4" />
              <span>View Job Database</span>
            </button>
          </div>
        </div>

        {/* Fleet Management Control */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Truck className="w-6 h-6 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Fleet Management Control</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Admin panel for managing system-wide fleet items.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400">Total System Trucks</div>
              <div className="text-xl font-bold text-blue-400">{getAllSystemTrucks().length}</div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400">Total System Trailers</div>
              <div className="text-xl font-bold text-green-400">{getAllSystemTrailers().length}</div>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin/fleet-control')}
            className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <Truck className="w-5 h-5" />
            <span>Manage All Fleet</span>
          </button>
        </div>

        {/* Storage Management */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="w-6 h-6 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Storage Management</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">Export/import game data and manage local storage.</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400">Storage Items</div>
              <div className="text-xl font-bold text-white">{userStats.storageUsed} KB</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400">Total Users</div>
              <div className="text-xl font-bold text-white">{userStats.totalUsers}</div>
            </div>
          </div>

          <button
            onClick={() => navigate('/storage-management')}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <Database className="w-5 h-5" />
            <span>Manage Storage</span>
          </button>
        </div>

        {/* Used Truck Generator Card (moved here from Game Rules page) */}
        <div>
          <UsedTruckGeneratorCard />
        </div>

      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <span className="text-sm text-slate-400">Last 24 hours</span>
        </div>

        {userStats.activeToday > 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">System Active</h3>
            <p className="text-slate-400">{userStats.activeToday} user{userStats.activeToday !== 1 ? 's' : ''} active today</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Recent Activity</h3>
            <p className="text-slate-400">No users have been active in the last 24 hours</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
