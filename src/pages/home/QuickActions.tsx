/**
 * QuickActions.tsx
 *
 * Small grid of quick action tiles (Market, Garage, Jobs). Reusable and
 * presentational – keeps Link targets and text identical to previous UX.
 */

import React from 'react';
import { Link } from 'react-router';
import { Map, Truck, DollarSign } from 'lucide-react';

/**
 * ActionCardProps
 * @description Props for a quick action tile.
 */
interface ActionCardProps {
  to: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  gradient: string;
}

/**
 * ActionCard
 * @description Presentational tile linking to a route.
 */
const ActionCard: React.FC<ActionCardProps> = ({ to, title, subtitle, icon, gradient }) => {
  return (
    <Link to={to} className={`group block ${gradient} rounded-2xl p-5 border border-transparent hover:scale-[1.02] transform transition-all duration-250 shadow-lg`}>
      <div className="flex items-center space-x-4">
        <div className="p-3 rounded-lg bg-white/10 flex items-center justify-center">
          {icon}
        </div>
        <div className="text-left">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-white/80 mt-1">{subtitle}</p>
        </div>
      </div>
    </Link>
  );
};

/**
 * QuickActions
 * @description Grid of three quick actions used across home/dashboard.
 */
const QuickActions: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <ActionCard
        to="/market"
        title="Find Jobs"
        subtitle="Browse freight market opportunities"
        icon={<Map className="w-6 h-6 text-white" />}
        gradient="bg-gradient-to-br from-blue-700 to-blue-600"
      />
      <ActionCard
        to="/garage"
        title="Manage Fleet"
        subtitle="View and maintain your trucks"
        icon={<Truck className="w-6 h-6 text-white" />}
        gradient="bg-gradient-to-br from-green-700 to-green-600"
      />
      <ActionCard
        to="/jobs"
        title="Active Jobs"
        subtitle="Monitor ongoing deliveries"
        icon={<DollarSign className="w-6 h-6 text-white" />}
        gradient="bg-gradient-to-br from-orange-700 to-orange-600"
      />
    </div>
  );
};

export default QuickActions;