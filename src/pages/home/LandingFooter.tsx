/**
 * LandingFooter.tsx
 *
 * Compact landing footer used at the bottom of the landing page. The footer
 * stretches the full horizontal width of the page and contains an inner
 * container to align content with the rest of the site.
 *
 * Responsibilities:
 * - Render landing footer content (about text, version, in-game time, company info).
 * - Stretch full width while keeping content aligned to the site container.
 */

import React from 'react';
import { Clock } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';

/**
 * LandingFooter
 * @description Full-width footer for the landing page with centered container.
 *              Uses the game context for company information when available.
 */
const LandingFooter: React.FC = () => {
  const { gameState } = useGame();
  const company = gameState.company;

  return (
    <footer className="w-full mt-12 bg-slate-900 border-t border-slate-800">
      {/* Inner container keeps the content aligned with the page layout.
          Footer background stretches full width while content remains centered. */}
      <div className="container mx-auto px-4 py-6 rounded-none">
        <div className="bg-slate-900/0 rounded-2xl p-6 text-slate-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="text-sm text-slate-400">About Truck Manager</div>
              <div className="text-lg font-semibold text-white">A logistics simulation for strategic managers</div>
              <div className="text-sm text-slate-400 mt-2 max-w-xl">
                Build and run a trucking company — buy vehicles, hire staff, take contracts and grow your logistics empire.
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-sm text-slate-400">
                <div>© 2025 Truck Manager Simulator</div>
                <div>Version 1.0</div>
              </div>

              <div className="bg-slate-800 px-3 py-2 rounded-md border border-slate-700 flex items-center space-x-3">
                <Clock className="w-4 h-4 text-slate-300" />
                <div className="text-right">
                  <div className="text-sm text-slate-400">In-game time</div>
                  <div className="text-sm text-white">Berlin • UTC</div>
                </div>
              </div>

              {/* Company info / fallback */}
              <div className="text-sm text-slate-400 text-right">
                {company ? (
                  <div>
                    <div className="text-xs text-slate-400">Company</div>
                    <div className="text-lg font-semibold text-white">{company.name}</div>
                    <div className="text-sm text-emerald-400">€{(company.capital || 0).toLocaleString()}</div>
                  </div>
                ) : (
                  <div>Not in a company</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;