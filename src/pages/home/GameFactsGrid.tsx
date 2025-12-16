/**
 * GameFactsGrid.tsx
 *
 * Small white-card facts grid used on the landing page. Designed to be screenshot-friendly.
 *
 * Responsibilities:
 * - Present a handful of short, factual game highlights in white cards for clarity.
 * - Keep cards small, reusable, and visually distinct from the darker site background.
 */

import React from 'react';
import { Box, Clock, Award, Globe, Package } from 'lucide-react';

/**
 * FactCardProps
 * @description Props for a single fact card.
 */
interface FactCardProps {
  title: string;
  value?: string;
  description?: string;
  icon?: React.ReactNode;
}

/**
 * FactCard
 * @description Presentational white card showing one fact.
 */
const FactCard: React.FC<FactCardProps> = ({ title, value, description, icon }) => {
  return (
    <article className="bg-white text-slate-900 rounded-xl p-4 border shadow-sm">
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-md bg-slate-100 text-slate-700">
          {icon}
        </div>
        <div>
          <div className="text-xs text-slate-500">{title}</div>
          {value && <div className="text-xl font-semibold mt-1">{value}</div>}
          {description && <div className="text-sm text-slate-600 mt-2">{description}</div>}
        </div>
      </div>
    </article>
  );
};

/**
 * GameFactsGrid
 * @description Grid composing multiple fact cards for the landing page.
 */
const GameFactsGrid: React.FC = () => {
  const facts = [
    {
      title: 'Realistic Time Simulation',
      value: 'Dynamic day/night & schedule',
      description: 'World clock advances with configurable speed and running state.',
      icon: <Clock className="w-5 h-5" />
    },
    {
      title: 'Vehicle Variety',
      value: 'Small → Heavy Trucks',
      description: 'Wide selection of trucks, trailers and compatibility rules.',
      icon: <Package className="w-5 h-5" />
    },
    {
      title: 'Global Market',
      value: 'Dynamic Offers',
      description: 'Market driven freight offers across countries and hubs.',
      icon: <Globe className="w-5 h-5" />
    },
    {
      title: 'Progress & Rewards',
      value: 'Experience & Upgrades',
      description: 'Staff gain experience, unlock promotions and improve efficiency.',
      icon: <Award className="w-5 h-5" />
    },
    {
      title: 'Contract Variety',
      value: 'Multiple Contract Types',
      description: 'Work on contracts across delivery systems: standard freight, express, refrigerated, multi-stop and oversized loads.',
      icon: <Package className="w-5 h-5" />
    },
    {
      title: 'Play in Minutes',
      value: 'Quick Start',
      description: 'Tutorial and guided onboarding to make your first profit fast.',
      icon: <Clock className="w-5 h-5" />
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {facts.map((f) => (
        <FactCard key={f.title} title={f.title} value={f.value} description={f.description} icon={f.icon} />
      ))}
    </div>
  );
};

export default GameFactsGrid;