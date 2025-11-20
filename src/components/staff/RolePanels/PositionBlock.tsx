/**
 * PositionBlock.tsx
 *
 * File-level:
 * Small reusable block to display a staff member's assigned position (e.g. "COO")
 * with an optional "assigned since" date. Matches the styling used in role panels.
 */

import React from 'react';

export interface PositionBlockProps {
  /** Short position title, e.g. "COO", "Head of Ops" */
  position?: string | null;
  /** ISO date string when the position was assigned */
  assignedAt?: string | null;
}

/**
 * PositionBlock
 * @description Presentational component that shows the manager's assigned position
 *              and an optional assigned-since date. If no position is provided it renders null.
 */
const PositionBlock: React.FC<PositionBlockProps> = ({ position, assignedAt }) => {
  if (!position) return null;

  const assignedText = assignedAt ? new Date(assignedAt).toLocaleDateString() : null;

  return (
    <div>
      <div className="text-xs text-slate-400 mb-2">Position</div>
      <div className="bg-slate-800 p-3 rounded-md border border-slate-700">
        <div className="text-xs text-slate-400">Assigned role</div>
        <div className="text-white font-medium text-sm mb-2">{position}</div>
        {assignedText && (
          <div className="text-xs text-slate-400">Since <span className="text-white font-medium">{assignedText}</span></div>
        )}
      </div>
    </div>
  );
};

export default PositionBlock;
