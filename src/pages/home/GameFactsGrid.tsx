/**
 * GameFactsGrid.tsx
 *
 * Small game facts grid used on the landing page to surface short, high-level facts.
 *
 * Responsibilities:
 * - Render a concise grid of fact cards used on the Home page.
 * - Keep markup small, accessible and consistent with the landing visual style.
 */

import React from 'react';
import { Box, Package, Globe } from 'lucide-react';

/**
 * FactCardProps
 * @description Props for a single fact card.
 */
interface FactCardProps {
  title: string;
  value: string;
  description: string;
  icon?: React.ReactNode;
}

/**
 * FactCard
 * @description Presentational small fact card used in the GameFactsGrid.
 */
const FactCard: React.FC<FactCardProps> = ({ title, value, description, icon }) => {
  return (
    <article className="bg-white/3 rounded-xl p-4 border border-slate-700 shadow-sm">
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-md bg-slate-100/6 text-slate-200">
          {icon}
        </div>
        <div>
          <div className="text-xs text-slate-400">{title}</div>
          <div className="text-xl font-semibold mt-1 text-white">{value}</div>
          <div className="text-sm text-slate-300 mt-2">{description}</div>
        </div>
      </div>
    </article>
  );
};

/**
 * GameFactsGrid
 * @description Grid component exposing short facts about the simulation.
 */
const GameFactsGrid: React.FC = () => {
  const facts = [
    {
      title: 'Contract Variety',
      value: 'Multiple Contract Types',
      description:
        'Work on contracts across delivery systems: standard freight, express, refrigerated, multi-stop and oversized loads.',
      icon: <Package className="w-5 h-5" />
    },
    {
      title: 'Dynamic Market',
      value: 'Supply & Demand',
      description: 'Prices and job availability change with the market — plan routes and investments accordingly.',
      icon: <Globe className="w-5 h-5" />
    },
    {
      title: 'Persistence',
      value: 'Save / Load',
      description: 'Company state persists locally and can be migrated between systems.',
      icon: <Box className="w-5 h-5" />
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {facts.map((f) => (
        <FactCard
          key={f.title}
          title={f.title}
          value={f.value}
          description={f.description}
          icon={f.icon}
        />
      ))}
    </div>
  );
};

export default GameFactsGrid;