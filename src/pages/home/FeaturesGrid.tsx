/**
 * FeaturesGrid.tsx
 *
 * Small features/benefits grid used on the landing page to describe the game.
 */

import React from 'react';
import { Truck, Map, DollarSign } from 'lucide-react';

/**
 * FeatureCardProps
 * @description Props for a single feature card.
 */
interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  accent?: string;
}

/**
 * FeatureCard
 * @description Presentational card describing one feature/benefit.
 */
const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon, accent = 'bg-slate-700' }) => {
  return (
    <div className="p-6 rounded-2xl border border-slate-700 shadow-sm bg-slate-800/60">
      <div className="flex items-start space-x-4">
        <div className="p-3 rounded-lg bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h4 className="text-lg font-semibold text-white">{title}</h4>
          <p className="text-sm text-slate-300 mt-2 max-w-md">{description}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * FeaturesGrid
 * @description Renders a 3-column responsive grid of features for the landing page.
 */
const FeaturesGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <FeatureCard
        title="Advanced Fleet Management"
        description="Buy, maintain and optimize your trucks. Hire drivers and improve profits through upgrades and maintenance."
        icon={<Truck className="w-6 h-6 text-amber-400" />}
      />
      <FeatureCard
        title="European Transport Network"
        description="Take freight contracts across different countries with dynamic markets and realistic delivery constraints."
        icon={<Map className="w-6 h-6 text-green-400" />}
      />
      <FeatureCard
        title="Strategic Growth & Markets"
        description="Earn profits, invest in equipment and expand your company strategically to dominate the market."
        icon={<DollarSign className="w-6 h-6 text-blue-400" />}
      />
    </div>
  );
};

export default FeaturesGrid;