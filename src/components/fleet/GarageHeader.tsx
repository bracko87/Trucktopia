/**
 * GarageHeader.tsx
 *
 * Top header for the Garage page. Shows an icon badge, title and subtitle.
 * Optionally renders a right-side primary CTA button to open the Vehicle Market.
 */

import React from 'react';
import { useNavigate } from 'react-router';
import { Truck, Plus } from 'lucide-react';

interface GarageHeaderProps {
  /**
   * Whether to display the right-side purchase button.
   * Default: true
   */
  showPurchaseButton?: boolean;
  /**
   * Label for the CTA button.
   */
  purchaseLabel?: string;
}

/**
 * GarageHeader
 *
 * @description Visual header for the Garage page. Left-side icon + title/subtitle remain unchanged.
 *              If showPurchaseButton is true, renders a primary CTA that navigates to /vehicle-market.
 *
 * @param props GarageHeaderProps
 * @returns React.ReactElement
 */
const GarageHeader: React.FC<GarageHeaderProps> = ({ showPurchaseButton = true, purchaseLabel = 'Purchase Vehicle' }) => {
  const navigate = useNavigate();

  /**
   * handleOpenMarket
   * @description Navigate to the vehicle market route.
   */
  const handleOpenMarket = () => {
    navigate('/vehicle-market');
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-start space-x-4">
        <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-700/60 ring-1 ring-white/5 shadow-sm">
          <div className="absolute inset-0 rounded-xl opacity-30 bg-gradient-to-tr from-orange-400/6 to-blue-400/6" />
          <div className="relative z-10 p-1 rounded-md bg-slate-800/60">
            <Truck className="w-6 h-6 text-orange-400" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold text-white leading-tight">Truck Fleet</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage your truck fleet and maintenance</p>
        </div>
      </div>

      {showPurchaseButton && (
        <div>
          <button
            type="button"
            aria-label="Open Vehicle Market"
            onClick={handleOpenMarket}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{purchaseLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default GarageHeader;