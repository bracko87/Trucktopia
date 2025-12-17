/**
 * Footer.tsx
 *
 * Footer component showing game information and a compact in-game clock.
 *
 * Responsibilities:
 * - Render persistent footer information (copyright, version).
 * - Show saved-game indicator and an authoritative in-game clock (Berlin + UTC).
 * - Subscribe to the central game clock so the displayed time updates in real-time.
 */

import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { nowUtcMs, getState, subscribe } from '../../utils/gameClock';

/**
 * formatBerlin
 * @description Format epoch ms into Europe/Berlin wall-clock readable string.
 * @param ms epoch milliseconds
 * @returns formatted string like "02/12/2025, 09:00:00"
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
 * Footer
 * @description Footer UI including game saved state and a small live in-game clock.
 */
const Footer: React.FC = () => {
  const { gameState } = useGame();

  const [nowMs, setNowMs] = useState<number>(() => nowUtcMs());
  const [clockState, setClockState] = useState(() => getState());

  useEffect(() => {
    // Subscribe to gameClock updates (emitted when time/state changes)
    const unsub = subscribe(() => {
      setNowMs(nowUtcMs());
      setClockState(getState());
    });

    // Ticker for second-level updates even when clock engine is paused
    const id = window.setInterval(() => {
      setNowMs(nowUtcMs());
    }, 1000);

    return () => {
      unsub();
      clearInterval(id);
    };
  }, []);

  return (
    <footer className="bg-slate-800 border-t border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <div className="flex items-center space-x-6">
          <span>© 2024 Trucktopia Simulator</span>
          <span>•</span>
          <span>Season 2024</span>
          <span>•</span>
          <span>Version 1.0</span>
        </div>

        <div className="flex items-center space-x-6">
          {/* Saved indicator and in-game time block */}
          {gameState.company && (
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-200">
                <div>Game Saved</div>
              </div>

              <div className="flex items-center space-x-3 bg-slate-700 px-3 py-2 rounded-md border border-slate-600">
                <Clock className="w-4 h-4 text-slate-300" />
                <div className="leading-tight text-right">
                  <div className="text-sm font-medium text-white">{formatBerlin(nowMs)}</div>
                  
                </div>
                <div className="ml-3 text-xs text-slate-400 text-right">
                  <div>{clockState.running ? `${clockState.speed}x` : 'paused'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Fallback info when no company exists */}
          {!gameState.company && (
            <div className="text-sm text-slate-400">Not in a company</div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;