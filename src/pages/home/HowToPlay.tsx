/**
 * HowToPlay.tsx
 *
 * Short, focused "How to play" steps for new players. Simple, screenshot-friendly layout.
 *
 * Responsibilities:
 * - Provide 4 concise steps for getting started.
 * - Keep markup accessible and easily styled.
 */

import React from 'react';
import { List, ShoppingCart, Settings, Repeat } from 'lucide-react';

/**
 * StepItemProps
 * @description Props for a single step item.
 */
interface StepItemProps {
  index: number;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

/**
 * StepItem
 * @description Presentational item for one how-to step.
 */
const StepItem: React.FC<StepItemProps> = ({ index, title, description, icon }) => (
  <div className="flex items-start space-x-4">
    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-semibold">
      {index}
    </div>
    <div>
      <div className="flex items-center space-x-2">
        {icon}
        <h4 className="text-lg font-semibold text-white">{title}</h4>
      </div>
      <p className="text-sm text-slate-300 mt-2">{description}</p>
    </div>
  </div>
);

/**
 * HowToPlay
 * @description Renders a short guide of steps to help players start quickly.
 */
const HowToPlay: React.FC = () => {
  const steps = [
    {
      title: 'Create Your Company',
      description: 'Register and set up your HQ to begin operations.',
      icon: <List className="w-5 h-5 text-slate-300" />
    },
    {
      title: 'Buy Your First Truck',
      description: 'Open the vehicle market and pick a truck that fits your strategy.',
      icon: <ShoppingCart className="w-5 h-5 text-slate-300" />
    },
    {
      title: 'Hire Staff & Assign Routes',
      description: 'Recruit drivers and mechanics. Assign jobs, schedule maintenance and manage payroll.',
      icon: <Settings className="w-5 h-5 text-slate-300" />
    },
    {
      title: 'Scale & Optimize',
      description: 'Monitor profit, expand hubs, and refine your fleet to take bigger contracts.',
      icon: <Repeat className="w-5 h-5 text-slate-300" />
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-6">
        {steps.map((s, i) => (
          <StepItem key={s.title} index={i + 1} title={s.title} description={s.description} icon={s.icon} />
        ))}
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 text-slate-300">
        <h3 className="text-xl font-semibold text-white mb-3">Tips for Success</h3>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>Balance hiring with fleet size — payroll is an ongoing cost.</li>
          <li>Maintain trucks regularly to avoid sudden breakdowns and fines.</li>
          <li>Use short and long-haul contracts strategically to stabilize income.</li>
          <li>Expand hubs to unlock regional job pools and higher-paying offers.</li>
        </ul>
      </div>
    </div>
  );
};

export default HowToPlay;