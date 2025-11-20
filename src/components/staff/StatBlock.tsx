/**
 * StatBlock.tsx
 *
 * File-level:
 * Small stat display with label and value used in the staff panels.
 */

import React from 'react';

/**
 * StatBlockProps
 * @description Props for StatBlock
 */
export interface StatBlockProps {
  /** label shown above the value */
  label: string;
  /** main value text */
  value: React.ReactNode;
  /** optional small helper text */
  helper?: string;
}

/**
 * StatBlock
 * @description Compact vertical stat with label and value.
 */
const StatBlock: React.FC<StatBlockProps> = ({ label, value, helper }) => {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-white font-medium">{value}</div>
      {helper ? <div className="text-xs text-slate-500 mt-1">{helper}</div> : null}
    </div>
  );
};

export default StatBlock;