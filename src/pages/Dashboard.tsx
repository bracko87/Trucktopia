/**
 * Dashboard page showing company overview and key metrics
 *
 * Notes:
 * - Safe guards for optional arrays and persisted date values
 * - If no company exists, shows a helpful placeholder (no redirects)
 */

import React from 'react';
import { useGame } from '../contexts/GameContext';
import {
  Truck,
  Package,
  FileText,
  DollarSign,
  TrendingUp,
  MapPin,
  Building,
  Calendar,
  BarChart3,
  Users,
  Briefcase,
  User,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { gameState } = useGame();

  if (!gameState.company) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Building className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Company Data</h2>
          <p className="text-slate-400">Please create a company to view the dashboard</p>
        </div>
      </div>
    );
  }

  const { company } = gameState;
  /** Force displayed reputation to 0 for UI widgets to avoid flicker or non-zero display */
  const displayedReputation = 0;

  // Safe array access with fallbacks
  const trucks = Array.isArray((company as any).trucks) ? (company as any).trucks : [];
  const trailers = Array.isArray((company as any).trailers) ? (company as any).trailers : [];
  const activeJobs = Array.isArray((company as any).activeJobs) ? (company as any).activeJobs : [];
  const contracts = Array.isArray((company as any).contracts) ? (company as any).contracts : [];
  const staff = Array.isArray((company as any).staff) ? (company as any).staff : [];

  // Calculate metrics safely
  const totalTrucks = trucks.length;
  const totalTrailers = trailers.length;
  const activeJobCount = activeJobs.length;
  const availableContracts = contracts.filter((c) => c?.status === 'available').length;
  const totalStaff = staff.length;

  // Normalize founded date from persistence (string) to Date for display
  const foundedRaw = (company as any).founded;
  const foundedDate =
    foundedRaw instanceof Date ? foundedRaw : foundedRaw ? new Date(foundedRaw) : new Date();

  // Mock financial data for demo
  const monthlyRevenue = 45200;
  const monthlyExpenses = 21500;
  const netProfit = monthlyRevenue - monthlyExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Company Dashboard</h1>
          <p className="text-slate-400">Welcome back, Manager! Here's your business overview</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Company Balance</div>
          <div className="text-2xl font-bold text-green-400">${company.capital.toLocaleString()}</div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Truck className="w-6 h-6 text-blue-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{totalTrucks}</h3>
          <p className="text-sm text-slate-300">Total Trucks</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <Package className="w-6 h-6 text-green-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{totalTrailers}</h3>
          <p className="text-sm text-slate-300">Total Trailers</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Briefcase className="w-6 h-6 text-blue-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{availableContracts}</h3>
          <p className="text-sm text-slate-300">Available Jobs</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-orange-500/10">
              <FileText className="w-6 h-6 text-orange-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{activeJobCount}</h3>
          <p className="text-sm text-slate-300">Active Jobs</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">{totalStaff}</h3>
          <p className="text-sm text-slate-300">Total Staff</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <Building className="w-5 h-5 text-yellow-400" />
            <span>Company Information</span>
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Company Name</span>
              <span className="text-white font-medium">{company.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Company Level</span>
              <span className="text-white font-medium capitalize">{company.level}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Headquarters</span>
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span className="text-white font-medium">
                  {(company as any).hub?.name}, {(company as any).hub?.country}
                </span>
              </div>
            </div>
            {/* Reputation - display forced to 0 to match global enforcement */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Reputation</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${displayedReputation}%` }}
                  />
                </div>
                <span className="text-white font-medium">{displayedReputation}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Founded</span>
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-white font-medium">{foundedDate.toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span>Financial Overview</span>
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Monthly Revenue</span>
              <span className="text-green-400 font-medium">${monthlyRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Monthly Expenses</span>
              <span className="text-red-400 font-medium">${monthlyExpenses.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-700 pt-3">
              <span className="text-slate-300 font-medium">Net Profit</span>
              <span className={`font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${netProfit.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Available Contracts</span>
              <span className="text-blue-400 font-medium">{availableContracts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
            <Truck className="w-5 h-5" />
            <span>Buy Truck</span>
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Hire Staff</span>
          </button>
          <button className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
            <Briefcase className="w-5 h-5" />
            <span>Find Jobs</span>
          </button>
          <button className="bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>View Reports</span>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="font-medium text-white text-sm">New contract accepted</p>
                <p className="text-xs text-slate-400">Electronics Transport to Milan</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-green-400 font-medium">+$18,500</div>
              <div className="text-xs text-slate-400">2 hours ago</div>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Truck className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-white text-sm">Truck maintenance completed</p>
                <p className="text-xs text-slate-400">Volvo FH16 #001</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-red-400 font-medium">-$1,200</div>
              <div className="text-xs text-slate-400">5 hours ago</div>
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="font-medium text-white text-sm">New driver hired</p>
                <p className="text-xs text-slate-400">Mark Johnson joined your team</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400 font-medium">Staff +1</div>
              <div className="text-xs text-slate-400">1 day ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
