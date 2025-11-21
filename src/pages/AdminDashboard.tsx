/**
 * Admin Dashboard page for system administrators
 * Shows real user statistics and management options
 */

import React, { useState, useEffect } from 'react';
import FirestoreMigrator from '../components/admin/FirestoreMigrator';
import { useGame } from '../contexts/GameContext';
import { useNavigate } from 'react-router';
import { Shield, Users, Building, BarChart3, Settings, UserCog, AlertTriangle, Cpu, Database, RefreshCw, Truck, MapPin, Edit, Trash2, ClockIcon, DollarSign, Search, Filter, X, TrendingUp, CheckCircle } from 'lucide-react';

interface UserStats {
  totalUsers: number;
  usersWithCompanies: number;
  activeToday: number;
  storageUsed: number;
}

interface JobStats {
  totalJobs: number;
  activeJobs: number;
  citiesWithJobs: number;
  averageValue: number;
  lastUpdate: string;
}

interface CityJobCount {
  city: string;
  jobCount: number;
  averageValue: number;
}

interface ExtendedJobOffer {
  id: string;
  title: string;
  client: string;
  value: number;
  distance: number;
  origin: string;
  destination: string;
  originCountry: string;
  destinationCountry: string;
  cargoType: string;
  trailerType: string;
  weight: number;
  experience: number;
  jobType: 'local' | 'state' | 'international';
  tags: string[];
  deadline: string;
  allowPartialLoad: boolean;
  remainingWeight: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    usersWithCompanies: 0,
    activeToday: 0,
    storageUsed: 0
  });
  
  // Job Database State
  const [jobStats, setJobStats] = useState<JobStats>({
    totalJobs: 0,
    activeJobs: 0,
    citiesWithJobs: 0,
    averageValue: 0,
    lastUpdate: ''
  });
  const [cityJobCounts, setCityJobCounts] = useState<CityJobCount[]>([]);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [jobSearchQuery, setJobSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');
  const [editingJob, setEditingJob] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ExtendedJobOffer>>({});

  useEffect(() => {
    loadUserStats();
    loadJobMarketData();
  }, []);

  const loadUserStats = () => {
    try {
      const users = JSON.parse(localStorage.getItem('tm_users') || '[]');
      const today = new Date().toDateString();
      
      const stats: UserStats = {
        totalUsers: users.length,
        usersWithCompanies: users.filter((user: any) => user.company).length,
        activeToday: users.filter((user: any) => {
          const userDate = new Date(user.createdAt || Date.now()).toDateString();
          return userDate === today;
        }).length,
        storageUsed: calculateStorageSize()
      };

      setUserStats(stats);
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const calculateStorageSize = (): number => {
    try {
      const usersData = localStorage.getItem('tm_users');
      const gameStateData = localStorage.getItem('tm_game_state');
      const adminData = localStorage.getItem('tm_admin_account');
      
      let totalSize = 0;
      if (usersData) totalSize += new Blob([usersData]).size;
      if (gameStateData) totalSize += new Blob([gameStateData]).size;
      if (adminData) totalSize += new Blob([adminData]).size;
      
      return Math.round(totalSize / 1024); // Convert to KB
    } catch (error) {
      return 0;
    }
  };

  const loadJobMarketData = () => {
    try {
      const stored = localStorage.getItem('tm_job_market');
      if (stored) {
        const data = JSON.parse(stored);
        calculateJobStats(data.jobs || []);
      }
    } catch (error) {
      console.log('Failed to load job market data');
    }
  };

  const calculateJobStats = (jobs: any[]) => {
    const totalJobs = jobs.length;
    const citiesWithJobs = new Set(jobs.map(job => job.origin)).size;
    const averageValue = jobs.length > 0 
      ? Math.round(jobs.reduce((sum, job) => sum + (job.value || 0), 0) / jobs.length)
      : 0;
    
    setJobStats({
      totalJobs,
      activeJobs: totalJobs, // All jobs in market are active
      citiesWithJobs,
      averageValue,
      lastUpdate: new Date().toLocaleString()
    });

    // Calculate job counts by city
    const cityCounts: { [key: string]: { count: number; totalValue: number } } = {};
    
    jobs.forEach(job => {
      if (!cityCounts[job.origin]) {
        cityCounts[job.origin] = { count: 0, totalValue: 0 };
      }
      cityCounts[job.origin].count++;
      cityCounts[job.origin].totalValue += job.value || 0;
    });

    const cityJobCountsArray: CityJobCount[] = Object.entries(cityCounts).map(([city, data]) => ({
      city,
      jobCount: data.count,
      averageValue: Math.round(data.totalValue / data.count)
    })).sort((a, b) => b.jobCount - a.jobCount).slice(0, 10);

    setCityJobCounts(cityJobCountsArray);
  };

  const handleRefreshJobs = async () => {
    try {
      localStorage.removeItem('tm_job_market');
      loadJobMarketData();
      alert('Job database has been refreshed. New jobs will be generated automatically.');
    } catch (error) {
      console.error('Error refreshing jobs:', error);
      alert('Error refreshing job database. Please try again.');
    }
  };

  const handleDeleteJob = (jobId: string) => {
    if (confirm(`Are you sure you want to delete job ${jobId}? This action cannot be undone.`)) {
      try {
        const stored = localStorage.getItem('tm_job_market');
        if (stored) {
          const data = JSON.parse(stored);
          const updatedJobs = data.jobs.filter((job: any) => job.id !== jobId);
          const updatedData = { ...data, jobs: updatedJobs, lastUpdate: Date.now() };
          localStorage.setItem('tm_job_market', JSON.stringify(updatedData));
          loadJobMarketData();
          alert(`Job ${jobId} has been deleted.`);
        }
      } catch (error) {
        console.error('Error deleting job:', error);
        alert('Error deleting job. Please try again.');
      }
    }
  };

  const handleExtendTime = (jobId: string) => {
    const newDeadline = prompt('Enter new deadline (e.g., 48h):', '48h');
    if (newDeadline) {
      try {
        const stored = localStorage.getItem('tm_job_market');
        if (stored) {
          const data = JSON.parse(stored);
          const updatedJobs = data.jobs.map((job: any) => 
            job.id === jobId ? { ...job, deadline: newDeadline } : job
          );
          const updatedData = { ...data, jobs: updatedJobs, lastUpdate: Date.now() };
          localStorage.setItem('tm_job_market', JSON.stringify(updatedData));
          loadJobMarketData();
          alert(`Job ${jobId} deadline extended to ${newDeadline}.`);
        }
      } catch (error) {
        console.error('Error extending deadline:', error);
        alert('Error extending deadline. Please try again.');
      }
    }
  };

  const handleChangeValue = (jobId: string) => {
    const newValue = prompt('Enter new job value:', '5000');
    if (newValue && !isNaN(Number(newValue))) {
      try {
        const stored = localStorage.getItem('tm_job_market');
        if (stored) {
          const data = JSON.parse(stored);
          const updatedJobs = data.jobs.map((job: any) => 
            job.id === jobId ? { ...job, value: Number(newValue) } : job
          );
          const updatedData = { ...data, jobs: updatedJobs, lastUpdate: Date.now() };
          localStorage.setItem('tm_job_market', JSON.stringify(updatedData));
          loadJobMarketData();
          alert(`Job ${jobId} value changed to €${newValue}.`);
        }
      } catch (error) {
        console.error('Error changing value:', error);
        alert('Error changing job value. Please try again.');
      }
    }
  };

  const handleCancelJob = (jobId: string) => {
    if (confirm(`Are you sure you want to cancel job ${jobId}?`)) {
      try {
        const stored = localStorage.getItem('tm_job_market');
        if (stored) {
          const data = JSON.parse(stored);
          const updatedJobs = data.jobs.map((job: any) => 
            job.id === jobId ? { ...job, status: 'cancelled' } : job
          );
          const updatedData = { ...data, jobs: updatedJobs, lastUpdate: Date.now() };
          localStorage.setItem('tm_job_market', JSON.stringify(updatedData));
          loadJobMarketData();
          alert(`Job ${jobId} has been cancelled.`);
        }
      } catch (error) {
        console.error('Error cancelling job:', error);
        alert('Error cancelling job. Please try again.');
      }
    }
  };

  const handleReassignJob = (jobId: string) => {
    const newAssignee = prompt('Enter user email to reassign job to:');
    if (newAssignee) {
      try {
        const stored = localStorage.getItem('tm_job_market');
        if (stored) {
          const data = JSON.parse(stored);
          const updatedJobs = data.jobs.map((job: any) => 
            job.id === jobId ? { ...job, assignedTo: newAssignee } : job
          );
          const updatedData = { ...data, jobs: updatedJobs, lastUpdate: Date.now() };
          localStorage.setItem('tm_job_market', JSON.stringify(updatedData));
          loadJobMarketData();
          alert(`Job ${jobId} reassigned to ${newAssignee}.`);
        }
      } catch (error) {
        console.error('Error reassigning job:', error);
        alert('Error reassigning job. Please try again.');
      }
    }
  };

  const handleEditJob = (job: any) => {
    setEditingJob(job.id);
    setEditForm({
      value: job.value,
      weight: job.weight,
      deadline: job.deadline,
      experience: job.experience
    });
  };

  const handleSaveEdit = () => {
    if (editingJob) {
      try {
        const stored = localStorage.getItem('tm_job_market');
        if (stored) {
          const data = JSON.parse(stored);
          const updatedJobs = data.jobs.map((job: any) => 
            job.id === editingJob ? { ...job, ...editForm } : job
          );
          const updatedData = { ...data, jobs: updatedJobs, lastUpdate: Date.now() };
          localStorage.setItem('tm_job_market', JSON.stringify(updatedData));
          loadJobMarketData();
          alert(`Changes for job ${editingJob} have been saved.`);
          setEditingJob(null);
          setEditForm({});
        }
      } catch (error) {
        console.error('Error saving job changes:', error);
        alert('Error saving changes. Please try again.');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingJob(null);
    setEditForm({});
  };

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case 'local': return 'text-green-400 bg-green-400/10';
      case 'state': return 'text-blue-400 bg-blue-400/10';
      case 'international': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getJobTypeIcon = (type: string) => {
    switch (type) {
      case 'local': return '🏙️';
      case 'state': return '🚛';
      case 'international': return '🌍';
      default: return '📦';
    }
  };

  /**
   * Get all system trucks from all users
   */
  const getAllSystemTrucks = () => {
    try {
      const users = JSON.parse(localStorage.getItem('tm_users') || '[]');
      const allTrucks = [];
      
      users.forEach((user: any) => {
        if (user.company && user.company.trucks) {
          user.company.trucks.forEach((truck: any) => {
            allTrucks.push({
              ...truck,
              userEmail: user.email,
              companyName: user.company?.name || 'Unknown Company'
            });
          });
        }
      });
      
      return allTrucks;
    } catch (error) {
      console.error('Error getting system trucks:', error);
      return [];
    }
  };

  /**
   * Get all system trailers from all users
   */
  const getAllSystemTrailers = () => {
    try {
      const users = JSON.parse(localStorage.getItem('tm_users') || '[]');
      const allTrailers = [];
      
      users.forEach((user: any) => {
        if (user.company && user.company.trailers) {
          user.company.trailers.forEach((trailer: any) => {
            allTrailers.push({
              ...trailer,
              userEmail: user.email,
              companyName: user.company?.name || 'Unknown Company'
            });
          });
        }
      });
      
      return allTrailers;
    } catch (error) {
      console.error('Error getting system trailers:', error);
      return [];
    }
  };

  /**
   * Open fleet control panel
   */
  const openFleetControlPanel = () => {
    navigate('/admin/fleet-control');
  };

  // Check if current user is admin - verify against admin credentials
  const { gameState } = useGame();
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <div className="text-sm text-slate-400">Total Users</div>
          </div>
          <div className="text-2xl font-bold text-white">{userStats.totalUsers}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <Building className="w-5 h-5 text-green-400" />
            <div className="text-sm text-slate-400">With Companies</div>
          </div>
          <div className="text-2xl font-bold text-white">{userStats.usersWithCompanies}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="w-5 h-5 text-yellow-400" />
            <div className="text-sm text-slate-400">Active Today</div>
          </div>
          <div className="text-2xl font-bold text-white">{userStats.activeToday}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center space-x-2 mb-2">
            <Settings className="w-5 h-5 text-purple-400" />
            <div className="text-sm text-slate-400">Storage Used</div>
          </div>
          <div className="text-2xl font-bold text-white">{userStats.storageUsed} KB</div>
        </div>
      </div>

      {/* Admin Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Game Rules & Engines */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Cpu className="w-6 h-6 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Game Rules & Engines</h2>
          </div>
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              Manage all game rules, engines, and scheduled cron jobs with full tracking.
            </p>
            <button
              onClick={() => navigate('/admin/game-rules')}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Cpu className="w-5 h-5" />
              <span>Manage Rules & Engines</span>
            </button>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-sm text-slate-400">Game Rules</div>
                <div className="text-xl font-bold text-white">5</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-sm text-slate-400">Engines</div>
                <div className="text-xl font-bold text-white">4</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-sm text-slate-400">Cron Jobs</div>
                <div className="text-xl font-bold text-white">4</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <UserCog className="w-6 h-6 text-green-400" />
            <h2 className="text-lg font-semibold text-white">User Management</h2>
          </div>
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              Manage user accounts, view user activity, and perform administrative actions.
            </p>
            <button
              onClick={() => navigate('/admin/users')}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <UserCog className="w-5 h-5" />
              <span>Manage Users</span>
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Freight Job Database */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Database className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Freight Job Database</h3>
              <p className="text-sm text-slate-400">Complete oversight of all freight jobs with unique 6-digit IDs</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-between mb-6">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Truck className="w-4 h-4 text-blue-400" />
                <div className="text-sm text-slate-400">Total Jobs</div>
              </div>
              <div className="text-2xl font-bold text-white">{jobStats.totalJobs.toLocaleString()}</div>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <div className="text-sm text-slate-400">Avg Value</div>
              </div>
              <div className="text-2xl font-bold text-white">€{jobStats.averageValue.toLocaleString()}</div>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <ClockIcon className="w-4 h-4 text-purple-400" />
                <div className="text-sm text-slate-400">Last Update</div>
              </div>
              <div className="text-sm font-medium text-white">{jobStats.lastUpdate}</div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/admin/job-database')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <Database className="w-4 h-4" />
              <span>View Job Database</span>
            </button>
          </div>
        </div>

        {/* Fleet Management Control - Admin Only */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Truck className="w-6 h-6 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Fleet Management Control</h2>
          </div>
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              Admin control panel for managing all users' trucks and trailers across the system.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Truck className="w-4 h-4 text-blue-400" />
                  <div className="text-sm text-slate-400">Total System Trucks</div>
                </div>
                <div className="text-xl font-bold text-blue-400">
                  {getAllSystemTrucks().length}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-4 h-4 bg-green-400 rounded" />
                  <div className="text-sm text-slate-400">Total System Trailers</div>
                </div>
                <div className="text-xl font-bold text-green-400">
                  {getAllSystemTrailers().length}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button 
                onClick={() => navigate('/admin/fleet-control')}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Truck className="w-5 h-5" />
                <span>Manage All Fleet</span>
              </button>
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">System Health</h2>
          </div>
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              Monitor system performance, storage usage, and application status.
            </p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Storage Usage</span>
                <span className="text-white font-medium">{userStats.storageUsed} KB</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((userStats.storageUsed / 5000) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>0 KB</span>
                <span>5 MB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Management */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="w-6 h-6 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">Storage Management</h2>
          </div>
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">
              Manage browser storage, export/import game data, and sync between devices.
            </p>
            <div className="grid grid-cols-2 gap-4">
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
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="w-6 h-6 text-orange-400" />
            <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          </div>
          <div className="space-y-3">
            <button className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg border border-slate-600 transition-colors text-left">
              Clear Cache
            </button>
            <button className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg border border-slate-600 transition-colors text-left">
              Backup Data
            </button>
            <button className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg border border-slate-600 transition-colors text-left">
              System Logs
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <span className="text-sm text-slate-400">Last 24 hours</span>
        </div>
        <div className="space-y-3">
          {userStats.activeToday > 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">System Active</h3>
              <p className="text-slate-400">
                {userStats.activeToday} user{userStats.activeToday !== 1 ? 's' : ''} active today
              </p>
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
    </div>
  );
};

export default AdminDashboard;