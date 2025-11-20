/**
 * ManagerPanel.tsx
 *
 * File-level:
 * Role-specific panel for managers. Displays Nationality, Condition and Actions.
 */

import React from 'react';
import ProgressBar from '../ProgressBar';
import ActionButton from '../ActionButton';
import type { StaffData } from '../types';

/**
 * ManagerPanelProps
 * @description Props for ManagerPanel
 */
export interface ManagerPanelProps {
  data: StaffData;
  onAction?: (action: string) => void;
}

/**
 * ManagerPanel
 * @description UI panel for manager role. Age block removed.
 */
const ManagerPanel: React.FC<ManagerPanelProps> = ({ data, onAction }) => {
  /**
   * handle
   * @description Create click handler wrapper to forward action name
   */
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

      {/* Condition */}
      <div>
        <div className="text-xs text-slate-400 mb-2">Condition</div>
        <div className="space-y-3">
          <ProgressBar label="Happiness" value={data.happinessPct ?? 100} colorClass="bg-blue-400" />
          <ProgressBar label="Fit" value={data.fitPct ?? 100} colorClass="bg-emerald-400" />
        </div>
      </div>

      {/* Actions */ }
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

export default ManagerPanel;
