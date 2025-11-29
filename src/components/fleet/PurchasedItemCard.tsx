/**
 * PurchasedItemCard.tsx
 *
 * Small, reusable card to render an incoming/purchased item that is currently in delivery.
 * Shows icon, title, ETA (if present), origin/destination and a lightweight progress bar.
 */

import React from 'react';
import { MapPin, Clock, Truck, Package, X } from 'lucide-react';

export interface PurchasedItem {
  id: string;
  type?: string;
  title?: string;
  origin?: string | null;
  destination?: string | null;
  eta?: string | null;
  etaLabel?: string | null;
  status?: string | null;
  progress?: number | null;
  [key: string]: any;
}

interface Props {
  item: PurchasedItem;
  onTrack: (item: PurchasedItem) => void;
  onCancel: (item: PurchasedItem) => void;
}

/**
 * PurchasedItemCard
 *
 * @description Presentational card for a single incoming delivery item.
 *
 * @param props Props
 * @returns React.ReactElement
 */
const PurchasedItemCard: React.FC<Props> = ({ item, onTrack, onCancel }) => {
  const icon = item.type === 'trailer' || item.trailerClass ? <Package className="w-5 h-5 text-blue-400" /> : <Truck className="w-5 h-5 text-amber-400" />;

  const progressValue = typeof item.progress === 'number' ? Math.max(0, Math.min(100, item.progress)) : null;

  return (
    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded bg-slate-800/40 text-white flex items-center justify-center">
          {icon}
        </div>

        <div>
          <div className="text-white font-medium">{item.title ?? item.model ?? item.name ?? 'Incoming Item'}</div>
          <div className="text-sm text-slate-400 mt-1">
            {item.status ?? 'In transit'} {item.etaLabel ? `• ${item.etaLabel}` : ''}
          </div>

          <div className="flex items-center space-x-4 text-xs text-slate-400 mt-2">
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3 text-indigo-400" />
              <span>{item.origin ?? 'Origin: —'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{item.eta ?? 'ETA: —'}</span>
            </div>
          </div>

          {progressValue !== null && (
            <div className="mt-3 w-64 max-w-full">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-amber-400"
                  style={{ width: `${progressValue}%`, transition: 'width 300ms ease' }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-1">{progressValue}%</div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center space-x-2">
        <button
          onClick={() => onTrack(item)}
          className="inline-flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-md text-sm transition-colors"
        >
          <MapPin className="w-4 h-4" />
          <span>View on Map</span>
        </button>

        <button
          onClick={() => onCancel(item)}
          className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
          title="Cancel delivery (UI-only)"
        >
          <X className="w-4 h-4" />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
};

export default PurchasedItemCard;