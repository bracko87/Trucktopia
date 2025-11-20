/**
 * ProgressBar.tsx
 *
 * File-level:
 * Simple horizontal progress bar used for happiness/fit indicators.
 */

import React from 'react';

/**
 * ProgressBarProps
 * @description Props for ProgressBar
 */
export interface ProgressBarProps {
  /** label shown above the bar */
  label: string;
  /** percent value 0..100 */
  value: number;
  /** color class for the inner bar (Tailwind color class) */
  colorClass?: string;
}

/**
 * ProgressBar
 * @description Small progress bar with label and percentage.
 */
const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, colorClass = 'bg-emerald-400' }) => {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-xs text-slate-400">
        <div>{label}</div>
        <div className="text-white font-medium">{pct}%</div>
      </div>
      <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`${colorClass} h-full`}
          aria-hidden="true"
          style={{ width: `${pct}%`, transition: 'width 300ms' }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;