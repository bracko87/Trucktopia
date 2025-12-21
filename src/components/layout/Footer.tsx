/**
 * Footer.tsx
 * 
 * Bottom application footer.
 * 
 * Responsibilities:
 * - Display copyright and version info.
 * - Show authoritative in-game date and time synced via gameClock.
 * - Provide status indicators (Game Saved).
 */

import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck } from 'lucide-react';
import { subscribe, nowUtcMs } from '../../utils/gameClock';

/**
 * Footer
 * @description Renders the bottom bar with metadata and the live game clock.
 */
const Footer: React.FC = () => {
  const [gameTime, setGameTime] = useState<number>(nowUtcMs());

  /**
   * Listen to the global game clock event to keep the footer time live
   */
  useEffect(() => {
    const unsubscribe = subscribe(({ nowUtcMs: newTime }) => {
      setGameTime(newTime);
    });
    return () => unsubscribe();
  }, []);

  /**
   * Format the epoch into a readable string
   * Format: DD.MM.YYYY - HH:mm
   */
  const formatGameTime = (ms: number) => {
    const date = new Date(ms);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} - ${hours}:${minutes}`;
  };

  return (
    <footer className="bg-slate-900 border-t border-slate-800 px-6 py-3 sticky bottom-0 z-40">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Metadata */}
        <div className="flex items-center space-x-4 text-xs text-slate-500">
          <span>© 2024 Trucktopia Simulator</span>
          <span className="text-slate-700">•</span>
          <span>Version 1.2.0</span>
          <span className="text-slate-700">•</span>
          <div className="flex items-center space-x-1 text-emerald-500/80">
            <ShieldCheck className="w-3 h-3" />
            <span>Encrypted Session</span>
          </div>
        </div>

        {/* Live Game Clock & Status */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In-Game Time:</span>
            </div>
            <span className="text-sm font-mono text-white tabular-nums">
              {formatGameTime(gameTime)}
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cloud Synced</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
