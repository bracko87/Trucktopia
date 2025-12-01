/**
 * FacilitiesPanel.tsx
 *
 * Presentational panel for the Infrastructure -> Facilities view.
 *
 * Purpose:
 * - Render a lightweight grid/list of facility cards.
 * - Show whether each facility is unlocked by the company's main hub (grayed out when locked).
 *
 * Notes:
 * - Defensive lookups for company/main hub are used so this component works even if different
 *   gameState shapes exist (company.hubs, company.hub, etc).
 */

import React from 'react';
import { Home } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { ALL_FACILITIES, getHubLevel } from '../../data/hubLevels';

/**
 * FacilityCardProps
 *
 * @description Props for a single facility card (minimal, presentational).
 */
interface FacilityCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  unlocked?: boolean;
}

/**
 * FacilityCard
 *
 * @description Small, reusable visual card for a facility entry.
 * @param props FacilityCardProps
 */
const FacilityCard: React.FC<FacilityCardProps> = ({ title, subtitle, unlocked = false }) => {
  return (
    <div className={`rounded-lg p-4 border ${unlocked ? 'bg-slate-700 border-slate-600' : 'bg-slate-900/40 border-slate-800 opacity-60'} flex items-center space-x-3`}>
      <div className={`p-2 rounded ${unlocked ? 'bg-indigo-400/10 text-indigo-400' : 'bg-slate-700/10 text-slate-400'}`}>
        <Home className="w-5 h-5" />
      </div>

      <div className="flex-1">
        <div className={`font-medium ${unlocked ? 'text-white' : 'text-slate-400'}`}>{title}</div>
        <div className={`text-sm ${unlocked ? 'text-slate-300' : 'text-slate-500'}`}>{subtitle ?? (unlocked ? 'Unlocked' : 'Locked — upgrade main hub to unlock')}</div>
      </div>
    </div>
  );
};

/**
 * FacilitiesPanel
 *
 * @description Shows a lightweight display of facilities (garages, depots, workshops)
 *              and whether they are unlocked by the company's main hub.
 */
const FacilitiesPanel: React.FC = () => {
  const { gameState } = useGame() as any;

  // Determine main hub (company.mainHubId preferred, fallback to first)
  const hubs: any[] = Array.isArray(gameState?.company?.hubs) ? gameState.company.hubs : (gameState?.company?.hub ? [gameState.company.hub] : []);
  const mainHubId = gameState?.company?.mainHubId ?? (hubs[0] ? String(hubs[0].id ?? hubs[0].name ?? '') : null);
  const mainHub = hubs.find(h => String(h?.id ?? h?.name ?? '') === String(mainHubId)) ?? hubs[0] ?? null;
  const mainLevel = mainHub && typeof mainHub.level === 'number' ? mainHub.level : 1;

  // Aggregate unlocked facilities up to current level (previous levels also count)
  const unlockedSoFar: Set<string> = new Set();
  for (let l = 1; l <= mainLevel; l++) {
    try {
      const lvl = getHubLevel(l);
      for (const f of lvl.unlocks) unlockedSoFar.add(f);
    } catch {
      // ignore errors and continue
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ALL_FACILITIES.map((facility) => {
          const unlocked = unlockedSoFar.has(facility);
          return (
            <FacilityCard
              key={facility}
              title={facility}
              unlocked={unlocked}
              subtitle={unlocked ? 'Unlocked' : 'Locked — upgrade main hub to unlock'}
            />
          );
        })}
      </div>
    </div>
  );
};

export default FacilitiesPanel;