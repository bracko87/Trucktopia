/**
 * ConfirmPurchaseHubInfo.tsx
 *
 * Presentational line used inside Confirm Purchase dialogs.
 *
 * Responsibilities:
 * - Render a single informative line showing how many vehicles are already assigned
 *   to the chosen hub and what the hub maximum is (based on hub level).
 * - Show a subtle warning when the hub is at or above capacity.
 *
 * Usage:
 * - Import and include inside any purchase confirmation modal. The component accepts
 *   a precomputed HubCapacityInfo (from hubCapacityEngine.getHubCapacityInfo) so it can
 *   be reused and remains purely presentational.
 */

import React from 'react';

export interface HubInfoProps {
  hubName?: string | null;
  assignedCount: number;
  maxAllowed: number;
  level: number;
}

/**
 * ConfirmPurchaseHubInfo
 * @description Show a single line like:
 * "Assigned to Hub Frankfurt: 8 / 10 vehicles (Level 1)"
 */
const ConfirmPurchaseHubInfo: React.FC<HubInfoProps> = ({ hubName, assignedCount, maxAllowed, level }) => {
  const atCapacity = assignedCount >= maxAllowed;
  return (
    <div className="text-sm text-slate-300 mt-3">
      <div className="text-xs text-slate-400">Hub capacity</div>
      <div className={`text-sm ${atCapacity ? 'text-rose-300' : 'text-white'} mt-1`}>
        {hubName ? `${hubName}: ` : ''}
        <span className="font-semibold">{assignedCount}</span> / <span className="font-semibold">{maxAllowed}</span> vehicles
        <span className="text-slate-400"> {' '} (Level {level})</span>
        {atCapacity && <span className="ml-2 text-rose-300"> — hub at capacity</span>}
      </div>
    </div>
  );
};

export default ConfirmPurchaseHubInfo;