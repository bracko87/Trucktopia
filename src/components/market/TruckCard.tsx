/**
 * TruckCard.tsx
 *
 * Visual card for a truck used in the Vehicle Market and other lists.
 *
 * Responsibilities:
 * - Render a single truck with clear truck emblem and key information.
 * - Display year and kilometers for used trucks only (keeps layout identical otherwise).
 * - Expose an onClick callback for opening details / purchase modal.
 *
 * The component is intentionally small and focused so it can be reused across
 * market and fleet views without altering layout or behaviour.
 */

/**
 * @file Provides a compact TruckCard used by market and listing pages.
 */

import React from 'react';
import { Truck, Calendar, Clock, DollarSign } from 'lucide-react';

/**
 * TruckCardProps
 * @description Props accepted by TruckCard. year and kilometers are optional and
 *              only rendered for used trucks.
 */
export interface TruckCardProps {
  id: string;
  brand?: string;
  model?: string;
  price?: number | string;
  condition?: number | null;
  availability?: string;
  tonnage?: number | string | null;
  leaseRate?: number | string | null;
  truckCategory?: string | null; // 'new' | 'used' etc.
  cargoTypes?: string[] | null;
  capacity?: number | null;
  gcw?: number | string | null;
  onClick?: () => void;
  year?: number | null;
  kilometers?: number | null;
  marketSource?: string | null; // e.g. 'used-generator' to mark generator offers
}

/**
 * formatKm
 * @description Nicely format kilometres with thousand separators and 'km' suffix.
 */
function formatKm(km: number | null | undefined) {
  if (km === null || km === undefined || Number.isNaN(Number(km))) return '—';
  return `${Number(km).toLocaleString()} km`;
}

/**
 * TruckCard
 * @description Display basic truck information. Year & kilometres are shown only
 *              when the truck is a used vehicle (truckCategory === 'used' or marketSource indicates used).
 */
const TruckCard: React.FC<TruckCardProps> = ({
  brand,
  model,
  price,
  condition,
  availability,
  tonnage,
  leaseRate,
  truckCategory,
  cargoTypes,
  capacity,
  gcw,
  onClick,
  year,
  kilometers,
  marketSource,
}) => {
  const title = `${brand ?? 'Unknown'} ${model ?? ''}`.trim();
  const isUsed =
    (truckCategory ?? '').toString().toLowerCase() === 'used' ||
    (marketSource ?? '') === 'used-generator';

  const conditionLabel =
    typeof condition === 'number'
      ? `${condition}%`
      : condition === null || condition === undefined
      ? '—'
      : String(condition);

  const conditionColor =
    typeof condition === 'number'
      ? condition >= 80
        ? 'text-green-400'
        : condition >= 60
        ? 'text-yellow-400'
        : 'text-rose-400'
      : 'text-slate-400';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-all duration-200 cursor-pointer border border-slate-600 hover:border-blue-500/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="w-2 h-12 rounded-full text-blue-400 bg-blue-400/10" />

          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-white text-sm">
                {title}
                <span className="text-slate-400 font-normal"> {` ${model ? '' : ''}`}</span>
              </h3>

              <span className="inline-block px-3 py-0.5 rounded-full text-xs font-medium text-indigo-400 bg-indigo-400/10 ml-2">
                {isUsed ? 'Used' : 'Truck'}
              </span>
            </div>

            <div className="flex items-center space-x-3 text-xs text-slate-400 mt-3">
              <span className={conditionColor + ' text-sm'}>{conditionLabel} condition</span>

              <span className="flex items-center space-x-1 text-green-400 text-sm">
                <span className="text-slate-300 text-sm mr-1">Available in:</span>
                <Calendar className="w-3 h-3" />
                <span className="text-slate-300 text-sm">{availability ?? '—'}</span>
              </span>

              {/* Year & Kilometres: included inline with condition & availability for used trucks */}
              {isUsed && (
                <>
                  <span className="flex items-center gap-1 text-slate-300 text-sm">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-300">{year ?? '—'}</span>
                  </span>

                  <span className="flex items-center gap-1 text-slate-300 text-sm">
                    {/* small kilometers icon kept as an inline svg for compactness */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12h3l3 8 4-16 3 8h4"></path>
                    </svg>
                    <span className="text-slate-300">{formatKm(kilometers ?? null)}</span>
                  </span>
                </>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {Array.isArray(cargoTypes) &&
                cargoTypes.slice(0, 5).map((c, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-indigo-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"></path>
                      <path d="M12 22V12"></path>
                    </svg>
                    <span>{c}</span>
                  </span>
                ))}
            </div>

            {/* Note: Year & Kilometres rendering moved above to the same line as condition/availability for used trucks */}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs text-slate-400">Purchase</div>
            <div className="text-sm font-bold text-white">€{Number(price ?? 0).toLocaleString()}</div>
          </div>
          <div className="w-2 h-2 bg-blue-400 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default TruckCard;
