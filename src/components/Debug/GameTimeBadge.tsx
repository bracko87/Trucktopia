/**
 * GameTimeBadge.tsx
 *
 * Purpose:
 * - Small global badge that shows the current authoritative in-game time.
 * - Reads from the central game clock utilities (nowUtcMs / getState / subscribe).
 *
 * Notes:
 * - Designed to be compact and visually clear (dark theme, high contrast).
 * - Updates every second and listens to gameClock events for immediate updates.
 */

import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { nowUtcMs, getState, subscribe } from '../../utils/gameClock';

/**
 * formatBerlin
 * @description Format epoch ms into Europe/Berlin wall-clock readable string.
 * @param ms epoch ms
 */
function formatBerlin(ms: number) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

/**
 * GameTimeBadge
 * @description Compact floating badge displaying the game's current time and clock state.
 */
const GameTimeBadge: React.FC = () => {
  const [nowMs, setNowMs] = useState<number>(() => nowUtcMs());
  const [clockState, setClockState] = useState(() => getState());

  useEffect(() => {
    // Subscribe to gameClock updates (emitted when time/state changes)
    const unsub = subscribe(() => {
      setNowMs(nowUtcMs());
      setClockState(getState());
    });

    // Also update on an interval so seconds tick even if clock engine is paused
    const id = window.setInterval(() => {
      setNowMs(nowUtcMs());
    }, 1000);

    return () => {
      unsub();
      clearInterval(id);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg shadow px-3 py-2 flex items-center gap-3">
        <Clock className="w-4 h-4 text-slate-300" />
        <div className="leading-tight">
          <div className="text-sm font-medium">{formatBerlin(nowMs)}</div>
          <div className="text-xs text-slate-400">UTC: {new Date(nowMs).toISOString()}</div>
        </div>
        <div className="ml-3 text-xs text-slate-400 text-right">
          <div>{clockState.running ? `${clockState.speed}x` : 'paused'}</div>
        </div>
      </div>
    </div>
  );
};

export default GameTimeBadge;