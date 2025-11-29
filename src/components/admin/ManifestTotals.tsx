/**
 * ManifestTotals.tsx
 *
 * Small stat box that reads counts from the canonical manifest (src/data/game-rules-engines.ts)
 * and renders a 3-card grid (Game Rules / Engines / Cron Jobs).
 *
 * Responsibilities:
 * - Import the manifest and compute counts.
 * - Render the three stat cards using the same visual classes used in the admin UI.
 * - Keep the component tiny and reusable.
 */

import React from 'react';
import manifestDefault, { GameRule, EngineEntry, CronJob } from '../../data/game-rules-engines';

/**
 * ManifestShape
 * @description Local typing for the manifest structure imported from data file.
 */
interface ManifestShape {
  gameRules?: GameRule[];
  engines?: EngineEntry[];
  cronJobs?: CronJob[];
}

/**
 * getCounts
 * @description Return numeric counts for rules/engines/cronJobs from manifest safely.
 * @param manifest manifest object
 */
const getCounts = (manifest: ManifestShape) => {
  return {
    rules: Array.isArray(manifest.gameRules) ? manifest.gameRules.length : 0,
    engines: Array.isArray(manifest.engines) ? manifest.engines.length : 0,
    crons: Array.isArray(manifest.cronJobs) ? manifest.cronJobs.length : 0
  };
};

/**
 * ManifestTotals
 * @description Component that displays three small stat cards with counts
 *              sourced from the canonical manifest file.
 */
const ManifestTotals: React.FC = () => {
  // Normalize import: some builds export default manifest object
  const manifest = (manifestDefault as ManifestShape) || {};
  const { rules, engines, crons } = getCounts(manifest);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
        <div className="text-sm text-slate-400">Game Rules</div>
        <div className="text-xl font-bold text-white">{rules}</div>
      </div>

      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
        <div className="text-sm text-slate-400">Engines</div>
        <div className="text-xl font-bold text-white">{engines}</div>
      </div>

      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
        <div className="text-sm text-slate-400">Cron Jobs</div>
        <div className="text-xl font-bold text-white">{crons}</div>
      </div>
    </div>
  );
};

export default ManifestTotals;