/**
 * Footer.tsx
 *
 * Persistent footer showing game meta and a compact saved-game indicator.
 *
 * Responsibilities:
 * - Render footer information (copyright, season, version).
 * - Show saved-game indicator when a company exists.
 *
 * NOTE: The in-game clock and "Not in a company" fallback were removed per request.
 */

import React from 'react';
import { useGame } from '../../contexts/GameContext';

/**
 * Footer
 * @description Footer UI including game saved state. In-game clock removed.
 */
const Footer: React.FC = () => {
  const { gameState } = useGame();

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
          {/* Saved indicator (only when company exists). Clock removed intentionally. */}
          {gameState.company && (
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-200">
                <div>Game Saved</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;