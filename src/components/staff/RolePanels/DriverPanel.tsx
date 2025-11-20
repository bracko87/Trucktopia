/**
 * DriverPanel.tsx
 *
 * File-level:
 * Role-specific panel for drivers. Reuses the shared primitives and can be extended with driver-specific UI.
 */

import React from 'react';
import StatBlock from '../StatBlock';
import ProgressBar from '../ProgressBar';
import ActionButton from '../ActionButton';
import type { StaffData } from '../types';

/**
 * DriverPanelProps
 * @description Props for DriverPanel
 */
export interface DriverPanelProps {
  data: StaffData;
  onAction?: (action: string) => void;
}

/**
 * DriverPanel
 * @description UI panel for driver role. Age block removed, showing only Nationality.
 */
const DriverPanel: React.FC<DriverPanelProps> = ({ data, onAction }) => {
  const handle = (action: string) => () => onAction?.(action);

  return (
    <div className="p-3 border-t border-slate-700 text-sm text-slate-300 space-y-3">
      {/* Nationality (Age removed) */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">Nationality</div>
          <div className="text-white font-medium">{data.nationality ?? '—'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1">Driver Stats</div>
          <div className="space-y-3">
            <div className="text-sm">
              <div className="text-xs text-slate-400">Kilometers</div>
              <div className="text-white font-medium">{data.kilometers ?? 0} km</div>
            </div>
            <div className="text-sm">
              <div className="text-xs text-slate-400">Tours</div>
              <div className="text-white font-medium">{data.tours ?? 0}</div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-400 mb-2">Condition</div>
          <div className="space-y-3">
            <ProgressBar label="Happiness" value={data.happinessPct ?? 100} colorClass="bg-blue-400" />
            <ProgressBar label="Fit" value={data.fitPct ?? 100} colorClass="bg-emerald-400" />
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-400 mb-2">Actions</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <ActionButton label="Salary" icon="salary" onClick={handle('salary')} />
          <ActionButton label="Vacation" icon="vacation" onClick={handle('vacation')} />
          <ActionButton label="Skill" icon="skill" onClick={handle('skill')} />
          <ActionButton label="Promote" icon="promote" onClick={handle('promote')} />
          <ActionButton label="Fire" icon="fire" variant="destructive" onClick={handle('fire')} />
        </div>
      </div>
    </div>
  );
};

export default DriverPanel;
