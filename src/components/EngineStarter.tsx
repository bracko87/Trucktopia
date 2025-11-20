/**
 * EngineStarter
 *
 * A small component that starts the driver engine when mounted and stops it on unmount.
 *
 * This component is intentionally minimal and must be mounted once inside the app layout.
 */

import React, { useEffect } from 'react';
import { startDriverEngine } from '../engines/driverEngine';

interface EngineStarterProps {
  /**
   * Enable debug logs from the engine
   */
  debug?: boolean;
  /**
   * Tick interval in milliseconds (for testing you can reduce this)
   */
  tickIntervalMs?: number;
}

/**
 * EngineStarter component - mounts the driver engine
 *
 * @param props EngineStarterProps
 * @returns React element (null)
 */
const EngineStarter: React.FC<EngineStarterProps> = ({ debug = false, tickIntervalMs = 60_000 }) => {
  useEffect(() => {
    const stop = startDriverEngine({ debug, tickIntervalMs });
    return () => {
      stop();
    };
  }, [debug, tickIntervalMs]);

  // This component does not render UI
  return null;
};

export default EngineStarter;