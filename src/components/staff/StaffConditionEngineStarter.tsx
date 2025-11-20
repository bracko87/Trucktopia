/**
 * StaffConditionEngineStarter.tsx
 *
 * Small non-visual React component that starts the staff condition engine on mount
 * and stops it on unmount. Meant to be mounted at top-level (e.g. in App layout).
 */

import React, { useEffect } from 'react';
import { startStaffConditionEngine } from '../../engines/staffConditionEngine';

interface Props {
  tickIntervalMs?: number;
  debug?: boolean;
}

/**
 * StaffConditionEngineStarter
 * @description Start the Staff Condition Engine while this component is mounted.
 */
const StaffConditionEngineStarter: React.FC<Props> = ({ tickIntervalMs = 60_000, debug = false }) => {
  useEffect(() => {
    const stop = startStaffConditionEngine({ tickIntervalMs, debug });
    return () => {
      try { stop(); } catch { /* ignore */ }
    };
  }, [tickIntervalMs, debug]);

  // Non-visual helper
  return null;
};

export default StaffConditionEngineStarter;