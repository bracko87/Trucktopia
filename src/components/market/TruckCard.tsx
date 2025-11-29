/**
 * TruckCard.tsx
 *
 * Market truck card used by the Vehicle Market page.
 *
 * Responsibilities:
 * - Render a single truck market entry with brand/model, price, condition, availability and actions.
 * - Ensure the availability label is consistently prefixed with "Available in:" for all trucks.
 * - Render cargo type badges so cargo information remains visible.
 * - Show GCW Category badge for big trucks (>= 13 t) directly below the availability line.
 * - Keep visual layout and behaviour unchanged. Hide the literal "New" tag from the inline info row
 *   while preserving percentage-based condition when < 100%.
 */

import React from 'react';
import { Calendar, Package } from 'lucide-react';

/**
 * TruckCardData
 * @description Minimal data shape expected by TruckCard. Allows extra fields.
 */
export interface TruckCardData {
  id: string;
  brand?: string;
  model?: string;
  year?: number;
  condition?: number; // percentage 0-100
  capacity?: number | string;
  tonnage?: number | string;
  price?: number | string;
  leaseRate?: number | string | null;
  status?: string;
  truckCategory?: string;
  cargoTypes?: string[];
  specifications?: any;
  availability?: string | null;
  deliveryDays?: number | null;
  gcw?: string | null;
  [key: string]: any;
}

/**
 * Props
 * @description Component props for market TruckCard.
 */
interface Props {
  id?: string | number;
  brand?: string;
  model?: string;
  price?: number | string;
  condition?: number;
  availability?: string | null;
  tonnage?: number | null | string;
  leaseRate?: number | string | null;
  truckCategory?: string;
  cargoTypes?: string[];
  capacity?: number | null | string;
  onClick?: () => void;
  /**
   * explicit GCW hint (A/B/C or numeric). Optional — when provided it will be preferred
   * for label display for big trucks.
   */
  gcw?: string | number | null;

  /**
   * hidden
   * @description When true the card renders nothing (useful to hide a listing in a given view).
   */
  hidden?: boolean;
}

/**
 * CargoTypeBadge
 * @description Small visual badge for a cargo type. Kept local and tiny to follow component principles.
 */
const CargoTypeBadge: React.FC<{ label: string }> = ({ label }) => {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
      <Package className="w-3 h-3 text-indigo-300" />
      <span>{label}</span>
    </span>
  );
};

/**
 * parseTonnes
 * @description Parse a numeric tonne value from various possible inputs (number, numeric string,
 *              strings like "18 t" or "18t"). Returns NaN if parsing fails.
 * @param v any incoming value
 */
function parseTonnes(v: any): number {
  if (v === undefined || v === null) return NaN;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  const m = s.match(/([\d.]+)/);
  if (m) return Number(m[1]);
  return NaN;
}

/**
 * TruckCard
 * @description Market truck card. Shows an "Available in:" prefix before the calendar + time label,
 *              renders cargo type badges, and for big trucks (>=13t) shows a GCW badge directly below availability.
 *
 * @param {Props} props Component props
 * @returns React.ReactElement
 */
const TruckCard: React.FC<Props> = ({
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
  onClick,
  gcw,
  hidden = false,
}) => {
  // When hidden is true, render nothing. This is an explicit, non-destructive way
  // to hide specific cards from any view that chooses to pass hidden={true}.
  if (hidden) return null;

  const title = brand ?? model ?? 'Truck';
  const subtitle = model ?? brand ?? '';
  const conditionIsNumber = typeof condition === 'number';
  const conditionPercent = conditionIsNumber ? condition : undefined;

  /**
   * resolveAvailabilityText
   * @description Determine the display text for availability from deliveryDays / availability.
   */
  const resolveAvailabilityText = (): string => {
    if (typeof availability === 'string' && availability.trim() !== '') {
      return availability;
    }
    return '—';
  };

  /**
   * capacityTonnes
   * @description Use capacity or tonnage hints to determine size in tonnes (number).
   */
  const capacityTonnes = (() => {
    // Prefer numeric capacity field (could be number or string).
    const candidates = [capacity, tonnage, (typeof (gcw as any) === 'number' ? gcw : undefined), undefined];
    for (const c of candidates) {
      const parsed = parseTonnes(c);
      if (!Number.isNaN(parsed) && Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    // Try nested specifications if present in props via (capacity/tonnage) keys
    // (Note: optional — the parent may pass full truck object in other props)
    return 0;
  })();

  /**
   * isBigTruck
   * @description Conservative detection: treat trucks with capacity/tonnage >= 13 as big trucks.
   */
  const isBigTruck = capacityTonnes >= 13;

  /**
   * renderGcwBadge
   * @description Render the GCW badge for big trucks. Prefer explicit gcw (string/letter like 'A|B|C'),
   *              otherwise show a numeric "GCW ≥ Nt" derived from capacityTonnes.
   */
  const renderGcwBadge = () => {
    if (!isBigTruck) return null;
    if (gcw) {
      return (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-amber-400 bg-amber-400/10">
            {typeof gcw === 'string' && gcw.length <= 2 ? `GCW ${gcw}` : String(gcw)}
          </span>
        </div>
      );
    }
    // Fallback numeric representation
    return (
      <div className="mt-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-amber-400 bg-amber-400/10">
          {capacityTonnes ? `GCW ≥ ${Math.floor(capacityTonnes)}t` : 'GCW ≥ 13t'}
        </span>
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className="bg-slate-700 rounded-lg p-3 hover:bg-slate-600 transition-all duration-200 cursor-pointer border border-slate-600 hover:border-blue-500/50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className={`w-2 h-12 rounded-full ${'text-blue-400 bg-blue-400/10'}`} />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-white text-sm">
                {title} {subtitle ? <span className="text-slate-400 font-normal"> {subtitle}</span> : null}
              </h3>
              <span className="inline-block px-3 py-0.5 rounded-full text-xs font-medium text-indigo-400 bg-indigo-400/10 ml-2">
                {truckCategory ?? 'Truck'}
              </span>
            </div>

            {/* Availability / (numeric) condition row moved directly under title.
                NOTE: the explicit "New" textual tag is intentionally hidden here.
                If condition is a number and less than 100 we show "NN% condition", otherwise nothing. */}
            <div className="flex items-center space-x-3 text-xs text-slate-400 mt-3">
              {conditionPercent !== undefined && conditionPercent < 100 ? (
                <span className="text-yellow-400">{`${conditionPercent}% condition`}</span>
              ) : null}

              {/* AVAILABILITY: prefixed with "Available in:" as requested */}
              <span className="flex items-center space-x-1 text-green-400 text-sm">
                <span className="text-slate-300 text-sm mr-1">Available in:</span>
                <Calendar className="w-3 h-3" />
                <span className="text-slate-300 text-sm">{resolveAvailabilityText()}</span>
              </span>
            </div>

            {/* GCW Category (for big trucks only): inserted directly below the availability row */}
            {renderGcwBadge()}

            {/* Cargo type badges (restored) positioned AFTER the availability / GCW row */}
            {cargoTypes && cargoTypes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {cargoTypes.slice(0, 4).map((ct: string, idx: number) => (
                  <CargoTypeBadge key={`${ct}-${idx}`} label={ct} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-xs text-slate-400">Purchase</div>
            <div className="text-sm font-bold text-white">€{Number(price || 0).toLocaleString()}</div>
          </div>
          {leaseRate && (
            <div className="text-right">
              <div className="text-xs text-slate-400">Lease</div>
              <div className="text-sm font-bold text-green-400"> €{leaseRate}/mo</div>
            </div>
          )}
          <div className="w-2 h-2 bg-blue-400 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default TruckCard;
