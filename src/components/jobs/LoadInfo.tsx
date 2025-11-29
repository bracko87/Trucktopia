/**
 * LoadInfo.tsx
 *
 * Presentational component to display load summary for a job:
 * - Total load (tons)
 * - Tons delivered/assigned to the truck
 * - Remaining tons
 * - A compact progress bar with subtle color logic
 *
 * This component is defensive and will render friendly placeholders if values are missing.
 */

import React from 'react';

interface LoadInfoProps {
  /** Total job load in tons (may be undefined) */
  totalTons?: number | null;
  /** Tons assigned/delivering by this truck (may be undefined) */
  truckTons?: number | null;
  /** Remaining tons for the job (may be undefined) */
  remainingTons?: number | null;
  /** Optional label for total (keeps flexibility) */
  totalText?: string;
}

/**
 * formatTon
 * @description Format numeric tons to one decimal or return fallback string.
 */
function formatTon(v: number | null | undefined) {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return `${v.toFixed(1)} t`;
  }
  return '—';
}

/**
 * computeDeliveredPercent
 * @description Derive delivered percent from total vs remaining/truck values when possible.
 */
function computeDeliveredPercent(total?: number | null, truck?: number | null, remaining?: number | null) {
  if (typeof total === 'number' && total > 0) {
    if (typeof remaining === 'number') {
      const delivered = Math.max(0, total - remaining);
      return Math.min(100, Math.round((delivered / total) * 100));
    }
    if (typeof truck === 'number') {
      const delivered = Math.min(total, Math.max(0, truck));
      return Math.min(100, Math.round((delivered / total) * 100));
    }
  }
  return 0;
}

/**
 * LoadInfo
 * @description Presentational card for job load information.
 */
const LoadInfo: React.FC<LoadInfoProps> = ({ totalTons, truckTons, remainingTons, totalText }) => {
  const deliveredPct = computeDeliveredPercent(totalTons, truckTons, remainingTons);
  const totalLabel = totalText ?? formatTon(totalTons);

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-800 rounded-lg border border-slate-700 p-3 w-full">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-blue-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M16 3v4" />
              </svg>
            </div>
            <div>
              <div className="text-xs text-slate-400">Load</div>
              <div className="text-lg font-semibold text-white">{totalLabel}</div>
            </div>
          </div>
        </div>

        <div className="ml-4 w-36">
          <div className="text-xs text-slate-400">Delivered</div>
          <div className="text-sm font-medium text-white">{deliveredPct}%</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${deliveredPct >= 75 ? 'bg-emerald-400' : deliveredPct >= 40 ? 'bg-yellow-400' : 'bg-rose-400'}`}
            style={{ width: `${deliveredPct}%` }}
          />
        </div>
      </div>

      {/* Details row */}
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div className="flex flex-col">
          <span className="text-slate-400">Total</span>
          <span className="text-white font-medium">{formatTon(totalTons)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400">Truck delivering</span>
          <span className="text-white font-medium">{formatTon(truckTons)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400">Remaining</span>
          <span className="text-white font-medium">{formatTon(remainingTons)}</span>
        </div>
      </div>
    </div>
  );
};

export default LoadInfo;
