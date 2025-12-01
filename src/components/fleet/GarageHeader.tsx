/**
 * GarageHeader.tsx
 *
 * Header component used on the Garage page.
 *
 * Purpose:
 * - Render the page heading and the purchase CTA for the Garage page.
 * - Keep behaviour: clicking the button navigates to the vehicle market.
 *
 * Notes:
 * - Visual layout and internal paddings are intentionally minimal here so
 *   the surrounding page controls spacing. The file preserves JSDoc comments
 *   and accessibility considerations.
 */

import React from 'react';
import { Truck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useGame } from '../../contexts/GameContext';

/**
 * handlePurchaseClick
 *
 * @description Navigate the user to the vehicle market page where trucks and trailers are purchased.
 * @param navigate navigate function from useNavigate
 */
function handlePurchaseClick(navigate: ReturnType<typeof useNavigate>) {
  navigate('/vehicle-market');
}

/**
 * GarageHeader
 *
 * @description Reusable header component for the Garage page.
 *              Simplified to render only a single purchase CTA (per request).
 *
 * Visual:
 * - Button uses the existing blue CTA visual used across the app.
 *
 * @returns React.ReactElement
 */
const GarageHeader: React.FC = () => {
  const navigate = useNavigate();
  // Attempt to access gameState to avoid removing context usage entirely.
  // This keeps the component consistent with other headers even if values are unused.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { gameState } = useGame();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Garage</h1>
        <p className="text-slate-400 text-sm">Manage your fleet and incoming deliveries</p>
      </div>

      {/* Right: only the purchase CTA remains per request */}
      <div>
        <button
          type="button"
          onClick={() => handlePurchaseClick(navigate)}
          className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium text-base transition-colors flex items-center justify-center space-x-2"
          aria-label="Purchase trucks and Trailers"
        >
          <Truck className="w-4 h-4" />
          <span>Purchase trucks and Trailers</span>
        </button>
      </div>
    </div>
  );
};

export default GarageHeader;