/**
 * Dashboard.tsx
 *
 * Main dashboard page showing company overview and key metrics.
 * Header-level balance elements have been removed to avoid duplicate displays.
 */

import React from 'react';
import { useGame } from '../contexts/GameContext';
import {
  Truck,
  Package,
  FileText,
  DollarSign,
  MapPin,
  Building,
  Compass,
  Navigation,
  Briefcase,
  Users,
  BarChart3
} from 'lucide-react';

/**
 * Dashboard
 * @description Main dashboard component showing company stats and HQ location.
 */
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
  const hub = (company as any).hub;
  
  const trucks = Array.isArray((company as any).trucks) ? (company as any).trucks : [];
  const trailers = Array.isArray((company as any).trailers) ? (company as any).trailers : [];
  const activeJobs = Array.isArray((company as any).activeJobs) ? (company as any).activeJobs : [];
  const contracts = Array.isArray((company as any).contracts) ? (company as any).contracts : [];
  const staff = Array.isArray((company as any).staff) ? (company as any).staff : [];

  const totalTrucks = trucks.length;
  const totalTrailers = trailers.length;
  const activeJobCount = activeJobs.length;
  const availableContracts = contracts.filter((c: any) => c?.status === 'available').length;
  const totalStaff = staff.length;

  const foundedRaw = (company as any).founded;
  const foundedDate = foundedRaw instanceof Date ? foundedRaw : foundedRaw ? new Date(foundedRaw) : new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Company Dashboard</h1>
          <p className="text-slate-400">Welcome back! Here's your business overview</p>
        </div>
        {/* Header balance elements intentionally removed to avoid duplicates */}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Truck className="w-5 h-5 text-blue-400" /></div>
            <span className="text-xs text-green-400">Status: OK</span>
          </div>
          <h3 className="text-xl font-bold text-white">{totalTrucks}</h3>
          <p className="text-xs text-slate-400">Trucks</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><Package className="w-5 h-5 text-purple-400" /></div>
            <span className="text-xs text-green-400">Active</span>
          </div>
          <h3 className="text-xl font-bold text-white">{totalTrailers}</h3>
          <p className="text-xs text-slate-400">Trailers</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><Briefcase className="w-5 h-5 text-orange-400" /></div>
          </div>
          <h3 className="text-xl font-bold text-white">{availableContracts}</h3>
          <p className="text-xs text-slate-400">Offers</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-indigo-500/10"><FileText className="w-5 h-5 text-indigo-400" /></div>
          </div>
          <h3 className="text-xl font-bold text-white">{activeJobCount}</h3>
          <p className="text-xs text-slate-400">Active Jobs</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><Users className="w-5 h-5 text-emerald-400" /></div>
          </div>
          <h3 className="text-xl font-bold text-white">{totalStaff}</h3>
          <p className="text-xs text-slate-400">Staff</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Identity */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <Building className="w-5 h-5 text-blue-400" />
            <span>Company Identity</span>
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Legal Name</span>
              <span className="text-white font-medium">{company.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Level</span>
              <span className="text-indigo-400 font-bold uppercase tracking-wider">{company.level || 'Seed'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Reputation</span>
              <div className="flex items-center space-x-1">
                <span className="text-amber-400 font-medium">{company.reputation || 0}%</span>
                <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500" 
                    style={{ width: `${company.reputation || 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Established</span>
              <span className="text-white font-medium">{foundedDate.toLocaleDateString()}</span>
            </div>

            {/* Credit Rating (wired to company.creditScore when present; otherwise computed) */}
            <div className="flex justify-between text-sm mt-3">
              <span className="text-slate-400">Credit Rating</span>
              {company ? (
                (() => {
                  // Compute canonical score fallback if company.creditScore absent
                  const capital = typeof company.capital === 'number' ? company.capital : 0;
                  const foundedRaw = (company as any).founded;
                  const founded = foundedRaw ? new Date(foundedRaw).getTime() : Date.now();
                  const years = Math.max(0, (Date.now() - founded) / (1000 * 60 * 60 * 24 * 365));
                  const capScore = Math.min(70, Math.round(Math.log10(Math.max(1, capital)) * 12));
                  const ageScore = Math.min(30, Math.round(Math.min(10, years) * 3));
                  const computedScore = Math.min(100, capScore + ageScore);

                  const cs = typeof (company as any).creditScore === 'number'
                    ? Math.max(0, Math.min(100, Math.round((company as any).creditScore)))
                    : computedScore;

                  const grade = cs >= 80 ? 'A' : cs >= 60 ? 'B' : cs >= 40 ? 'C' : 'D';
                  const range = grade === 'A' ? '≥ 150k' : grade === 'B' ? '50k–150k' : grade === 'C' ? '15k–50k' : '5k–15k';
                  return <span className="text-white font-medium">{cs} ({grade}) • {range}</span>;
                })()
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Hub Information */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-rose-400" />
            <span>Main Headquarters</span>
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Location</span>
              <span className="text-white font-medium">{hub?.city || hub?.name || 'Loading...'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Region</span>
              <span className="text-white">{hub?.country || 'International'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Parking Capacity</span>
              <span className="text-emerald-400 font-bold">{hub?.data?.capacity || 5} Slots</span>
            </div>
            {hub?.lat && (
              <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-700">
                <span className="flex items-center gap-1"><Compass className="w-3 h-3" /> {hub.lat.toFixed(4)}° N</span>
                <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> {hub.lon.toFixed(4)}° E</span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Overview */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span>Financials</span>
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Available Funds</span>
              <span className="text-green-400 font-bold">€{(company.balance ?? company.capital).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Initial Capital</span>
              <span className="text-slate-300">€{(company.capital || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">Management Portal</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2">
            <Truck className="w-4 h-4" />
            <span>Purchase Fleet</span>
          </button>
          <button className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2">
            <Users className="w-4 h-4" />
            <span>Recruit Staff</span>
          </button>
          <button className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2">
            <Briefcase className="w-4 h-4" />
            <span>Find Freight</span>
          </button>
          <button className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Reports</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;