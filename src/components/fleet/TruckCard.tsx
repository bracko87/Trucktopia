/**
 * TruckCard.tsx
 *
 * Visual card for a truck. This file renders the truck card used across fleet views.
 *
 * Responsibilities:
 * - Render a single truck with icon, key info, assignment and actions.
 * - Display an "Available in:" prefix before the calendar/time availability label.
 * - Provide a sell action callback.
 *
 * Note: This component is intentionally compact and typed to match TruckSection usage.
 */

import React from 'react';
import { Truck as TruckIcon, Trash2, MapPin, Calendar, Star, Package } from 'lucide-react';

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
  capacity?: number;
  tonnage?: number;
  status?: string;
  assignedTrailer?: string | null;
  deliveryHub?: { id?: string; name?: string } | string | null;
  deliveryEta?: string | null;
  availableInDays?: number | string | null; // prefer this when available
  availableIn?: string | null; // alternate field name
  [key: string]: any;
}

/**
 * Props
 * @description Component props for TruckCard.
 */
interface Props {
  truck: TruckCardData;
  assignedTrailerLabel?: string | null;
  onSell: (truckId: string) => void;
}

/**
 * TruckCard
 * @description Visual card for a truck. Shows "Available in:" prefix in front of the
 *              calendar + time label for availability. Keeps styling consistent with
 *              existing fleet cards.
 *
 * @param {Props} props Component props
 * @returns React.ReactElement
 */
const TruckCard: React.FC<Props> = ({ truck, assignedTrailerLabel = null, onSell }) => {
  const title = truck.brand ?? truck.model ?? 'Truck';
  const subtitle = truck.model ?? truck.brand ?? '';
  const capacity = truck.capacity ?? truck.tonnage ?? null;
  const condition = typeof truck.condition === 'number' ? `${truck.condition}%` : '—';

  const hub =
    typeof truck.deliveryHub === 'string'
      ? truck.deliveryHub
      : truck.deliveryHub?.name ?? truck.deliveryHub?.id ?? null;

  /**
   * resolveAvailabilityText
   * @description Determine the display text for availability from availableInDays / availableIn / deliveryEta.
   */
  const resolveAvailabilityText = (): string => {
    if (truck.availableInDays !== undefined && truck.availableInDays !== null) {
      return typeof truck.availableInDays === 'number' ? `${truck.availableInDays} days` : String(truck.availableInDays);
    }
    if (truck.availableIn) return String(truck.availableIn);
    if (truck.deliveryEta) return String(truck.deliveryEta);
    return '—';
  };

  /**
   * handleSell
   * @description Local wrapper that forwards the truck id to the provided callback.
   * @param id truck id
   */
  const handleSell = (id: string) => {
    onSell(id);
  };

  return (
    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 flex items-start justify-between">
      <div className="flex items-start space-x-3">
        {/* Truck-specific icon */}
        <div className="p-2 rounded bg-blue-400/10 text-blue-400">
          <TruckIcon className="w-5 h-5" />
        </div>

        <div>
          <div className="text-white font-medium">{title}</div>
          <div className="text-sm text-slate-400">
            {subtitle}
            {capacity ? ` • ${capacity}t` : ''}
          </div>

          <div className="flex items-center space-x-3 text-xs text-slate-400 mt-2">
            <div className="flex items-center space-x-1">
              <span className="text-slate-400">Available in:</span>
              <div className="inline-flex items-center space-x-1 text-slate-300">
                <Calendar className="w-3 h-3 text-green-400" />
                <span>{resolveAvailabilityText()}</span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3 text-indigo-400" />
              <span>{hub ?? 'Hub: -'}</span>
            </div>

            <div>{condition} condition</div>

            {assignedTrailerLabel && (
              <div className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 text-xs">
                {assignedTrailerLabel}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end space-y-2">
        <div className="text-sm text-slate-300">{truck.year ?? '-'}</div>
        <button
          onClick={() => handleSell(truck.id)}
          className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-md text-xs transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          <span>Sell</span>
        </button>
      </div>
    </div>
  );
};

export default TruckCard;
