/**
 * MetricsGrid.tsx
 *
 * Small reusable metrics grid used on the authenticated home/dashboard view.
 * Each metric is a tiny presentational card.
 */

import React from 'react';
import { DollarSign, Truck, Users, Globe } from 'lucide-react';

interface CompanyBrief {
  capital?: number;
  trucks?: any[];
  staff?: any[];
  hub?: { name?: string };
}

/**
 * MetricCardProps
 * @description Props for a single metric card.
 */
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: string;
}

/**
 * MetricCard
 * @description Simple presentational card for a single metric.
 */
const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, accent = 'bg-blue-500/10 text-blue-400' }) => {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${accent} inline-flex items-center justify-center`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">{label}</div>
          <div className="text-2xl font-bold text-white">{value}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * MetricsGridProps
 * @description Props for MetricsGrid component.
 */
interface MetricsGridProps {
  company: CompanyBrief;
}

/**
 * MetricsGrid
 * @description Renders a responsive grid of company metrics.
 */
const MetricsGrid: React.FC<MetricsGridProps> = ({ company }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        icon={<DollarSign className="w-5 h-5" />}
        label="Company Capital"
        value={`€${(company.capital || 0).toLocaleString()}`}
        accent="bg-amber-500/10 text-amber-400"
      />
      <MetricCard
        icon={<Truck className="w-5 h-5" />}
        label="Active Trucks"
        value={Array.isArray(company.trucks) ? company.trucks.length : 0}
        accent="bg-green-500/10 text-green-400"
      />
      <MetricCard
        icon={<Users className="w-5 h-5" />}
        label="Team Members"
        value={Array.isArray(company.staff) ? company.staff.length : 0}
        accent="bg-purple-500/10 text-purple-400"
      />
      <MetricCard
        icon={<Globe className="w-5 h-5" />}
        label="Headquarters"
        value={company.hub?.name || 'No Hub'}
        accent="bg-blue-500/10 text-blue-400"
      />
    </div>
  );
};

export default MetricsGrid;