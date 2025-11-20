/**
 * DriverSkillsGrid.tsx
 *
 * Reusable grid component to display driver-position skills with short game-impact explanations.
 *
 * - Uses canonical DRIVER_SKILLS list from data/driverSkills
 * - Renders a card per skill with title, short description and an impact line (styled like provided snippet)
 * - Small SkillCard subcomponent keeps responsibilities minimal and reusable
 *
 * Notes:
 * - Layout and Tailwind styling preserved to match your example
 * - This component is presentation-only and does not change any page layout. Import and place where needed.
 */

import React from 'react';
import { Euro } from 'lucide-react';
import DRIVER_SKILLS from '../../data/driverSkills';

interface SkillImpact {
  /** Short subtitle / description of the skill */
  description: string;
  /** One-line game-impact summary (e.g. "10% better fuel efficiency") */
  impact: string;
  /** Optional color for the impact text */
  impactColor?: string;
}

/**
 * Map of driver skill -> game impact explanation
 * Keep concise and driver-focused. Add new keys if driver skill list grows.
 */
const DRIVER_SKILL_IMPACTS: Record<string, SkillImpact> = {
  'Long Haul': {
    description: 'Expert in long-distance transportation across multiple countries',
    impact: '10% better fuel efficiency on long routes',
    impactColor: 'text-green-400'
  },
  'ADR Certified': {
    description: 'Licensed to transport hazardous materials',
    impact: '20% bonus for hazardous cargo',
    impactColor: 'text-green-400'
  },
  'Route Planning': {
    description: 'Efficient route selection and ETA accuracy',
    impact: 'Reduces delivery time by ~8%',
    impactColor: 'text-green-400'
  },
  'Refrigerated Transport': {
    description: 'Safe handling of temperature-sensitive freight',
    impact: 'Reduces spoilage; enables refrigerated contracts',
    impactColor: 'text-green-400'
  },
  'Oversized Loads': {
    description: 'Experienced with wide/oversized combinations and permits',
    impact: 'Access to oversize contracts (+25% premium)',
    impactColor: 'text-green-400'
  },
  'International Routes': {
    description: 'Comfortable with paperwork and border procedures',
    impact: 'Enables cross-border jobs and reduces delays',
    impactColor: 'text-green-400'
  },
  'Night Driving': {
    description: 'Skilled at driving and managing fatigue at night',
    impact: 'Unlocks night jobs (+6% pay multiplier)',
    impactColor: 'text-green-400'
  },
  'Heavy Load Handling': {
    description: 'Safe operation with very heavy cargos',
    impact: 'Faster handling and lower damage risk',
    impactColor: 'text-green-400'
  },
  'City Navigation': {
    description: 'Expert at urban routes, narrow streets and tight schedules',
    impact: 'Reduces urban delivery time and fines',
    impactColor: 'text-green-400'
  },
  'Mountain Roads': {
    description: 'Experience with steep inclines and tight switchbacks',
    impact: 'Improves safety and reliability in mountain regions',
    impactColor: 'text-green-400'
  },
  'Forest Roads': {
    description: 'Skilled at remote/rough access roads and terrain',
    impact: 'Enables remote contracts and reduces delays',
    impactColor: 'text-green-400'
  },
  'Eco Driving': {
    description: 'Efficient acceleration/braking to minimize fuel',
    impact: 'Up to 7% fuel savings on compliant routes',
    impactColor: 'text-green-400'
  },
  'Multi-Axle Experience': {
    description: 'Knows handling and balancing of multi-axle rigs',
    impact: 'Allows specialized combinations and reduces wear',
    impactColor: 'text-green-400'
  },
  'Tanker Transport': {
    description: 'Trained for liquid cargo handling and safety',
    impact: 'Enables tanker jobs (+15% pay) and lowers incidents',
    impactColor: 'text-green-400'
  },
  'Livestock Transport': {
    description: 'Experienced in animal welfare during transit',
    impact: 'Reduces losses and qualifies for livestock contracts',
    impactColor: 'text-green-400'
  }
};

/**
 * SkillCard
 * @description Presentational card for a single skill + impact line
 */
const SkillCard: React.FC<{ title: string; impact: SkillImpact }> = ({ title, impact }) => {
  return (
    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
      <h4 className="font-medium text-white mb-2">{title}</h4>
      <p className="text-sm text-slate-400 mb-2">{impact.description}</p>
      <div className={`text-xs ${impact.impactColor ?? 'text-green-400'} font-medium`}>
        <span className="flex items-center space-x-1">
          <Euro className="w-3 h-3" />
          <span>{impact.impact}</span>
        </span>
      </div>
    </div>
  );
};

/**
 * DriverSkillsGrid
 * @description Renders the grid of all driver skills and their game impact.
 *
 * Props could be extended later to accept a subset, translations, or custom impacts.
 */
const DriverSkillsGrid: React.FC<{ skills?: string[] }> = ({ skills }) => {
  // Use provided skills or the canonical list for drivers
  const list = skills && skills.length > 0 ? skills : DRIVER_SKILLS;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <div className="flex items-center space-x-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info w-5 h-5 text-blue-400" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
        <h3 className="text-lg font-semibold text-white">Skills &amp; Game Impact</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((skill) => {
          const impact = DRIVER_SKILL_IMPACTS[skill] ?? {
            description: 'Driver skill that affects multiple operational outcomes.',
            impact: 'Improves related job performance',
            impactColor: 'text-green-400'
          };

          return <SkillCard key={skill} title={skill} impact={impact} />;
        })}
      </div>
    </div>
  );
};

export default DriverSkillsGrid;