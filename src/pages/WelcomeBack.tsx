/**
 * WelcomeBack.tsx
 *
 * Compact welcome-back page shown to authenticated users.
 *
 * Responsibilities:
 * - Provide a focused, friendly "welcome back" dashboard for signed-in users.
 * - Surface essential company summary (name, balance, HQ) and quick actions.
 * - Keep layout visually consistent with the landing theme while remaining compact.
 *
 * Notes:
 * - This component reads game state from GameContext (useGame).
 * - The component is split into small internal units (HeroPanel, SummaryCard)
 *   to keep responsibilities tidy and reusable.
 */

import React from 'react';
import { useGame } from '../contexts/GameContext';
import { Truck, Building, Users, DollarSign, Clock } from 'lucide-react';
import LevelBadge from '../components/levels/LevelBadge';

interface SummaryCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
}

/**
 * SummaryCard
 * @description Small reusable card used for company summary tiles.
 */
const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subtitle, icon }) => {
  return (
    <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center space-x-4">
      <div className="p-3 rounded-lg bg-white/5 flex items-center justify-center text-slate-200">
        {icon}
      </div>
      <div>
        <div className="text-xs text-slate-400">{title}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {subtitle ? <div className="text-sm text-slate-500 mt-1">{subtitle}</div> : null}
      </div>
    </div>
  );
};

/**
 * WelcomeHero
 * @description Top hero panel for the welcome-back page showing company and CTAs.
 */
const WelcomeHero: React.FC<{ company: any }> = ({ company }) => {
  const companyName = company?.name ?? 'Your Company';
  const balance = typeof company?.capital === 'number' ? company.capital : company?.capital ?? 0;
  const hubName = company?.hub?.name ?? '—';
  const companyLevel = company?.level ?? '—';

  return (
    <header className="relative mb-6">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">{companyName}</h1>
            <p className="text-slate-400 mt-1">Welcome back — quick overview of your company</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-700 text-slate-300 text-sm">
                <Building className="w-4 h-4 mr-2" /> HQ: {hubName}
              </span>
{'              '}<LevelBadge company={company} />
            </div>
          </div>


        </div>
      </div>
    </header>
  );
};

/**
 * WelcomeBack
 * @description Default compact dashboard shown to authenticated users.
 *              Uses GameContext to display company details and basic quick actions.
 */
const WelcomeBack: React.FC = () => {
  const { gameState } = useGame();
  const company = gameState.company;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col">
      <main className="flex-1 p-6">
        <div className="container mx-auto">
          <WelcomeHero company={company} />

          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <SummaryCard
              title="Total Staff"
              value={company?.staff?.length ?? 0}
              subtitle="Active employees"
              icon={<Users className="w-6 h-6 text-blue-400" />}
            />
            <SummaryCard
              title="Fleet"
              value={`${(company?.trucks?.length ?? 0)} trucks • ${(company?.trailers?.length ?? 0)} trailers`}
              subtitle="Available vehicles"
              icon={<Truck className="w-6 h-6 text-amber-400" />}
            />
            <SummaryCard
              title="Active Jobs"
              value={company?.activeJobs?.length ?? 0}
              subtitle="Ongoing deliveries"
              icon={<DollarSign className="w-6 h-6 text-green-400" />}
            />
          </section>

          <section className="bg-slate-800 rounded-2xl border border-slate-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Quick Navigation</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a href="/dashboard" className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg p-4 text-left transition-colors inline-flex items-start gap-4">
                <div className="text-amber-400 mt-1"><Clock className="w-6 h-6" /></div>
                <div>
                  <div className="font-medium text-white">Open Dashboard</div>
                  <div className="text-sm text-slate-400 mt-1">View full company operations</div>
                </div>
              </a>

              <a href="/staff" className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg p-4 text-left transition-colors inline-flex items-start gap-4">
                <div className="text-blue-400 mt-1"><Users className="w-6 h-6" /></div>
                <div>
                  <div className="font-medium text-white">Manage Staff</div>
                  <div className="text-sm text-slate-400 mt-1">Hire, fire and schedule</div>
                </div>
              </a>

              <a href="/market" className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg p-4 text-left transition-colors inline-flex items-start gap-4">
                <div className="text-amber-400 mt-1"><Truck className="w-6 h-6" /></div>
                <div>
                  <div className="font-medium text-white">Find Jobs</div>
                  <div className="text-sm text-slate-400 mt-1">Browse the freight market</div>
                </div>
              </a>
            </div>
          </section>

          <section className="bg-slate-800 rounded-2xl border border-slate-700 p-6 text-slate-300">
            <h3 className="text-xl font-semibold text-white mb-3">Recent Activity</h3>
            <p className="text-sm text-slate-400">No recent activity available — use the dashboard to see live updates and job history.</p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default WelcomeBack;
