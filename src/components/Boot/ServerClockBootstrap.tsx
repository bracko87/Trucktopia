/**
 * ServerClockBootstrap.tsx
 *
 * Minimal bootstrap component that mounts the client-side hook which syncs
 * the UI/game clock with an authoritative server-side time source.
 *
 * Responsibilities:
 * - Call useServerGameClock() once when mounted so the app's central clock is
 *   driven by the server time (with local ticking and periodic re-sync).
 *
 * This component is intentionally UI-less.
 */

import React from 'react';
import useServerGameClock from '../../hooks/useServerGameClock';

/**
 * ServerClockBootstrap
 * @description Mounts the useServerGameClock hook once for the running app.
 */
const ServerClockBootstrap: React.FC = () => {
  // The hook performs side-effects (fetch + setGameOffsetMs + periodic resync).
  // We just call it here so it runs when the component is mounted.
  useServerGameClock({ endpoint: '/.netlify/functions/get-game-time', resyncIntervalMs: 60_000, autoStart: true });

  // No UI
  return null;
};

export default ServerClockBootstrap;
