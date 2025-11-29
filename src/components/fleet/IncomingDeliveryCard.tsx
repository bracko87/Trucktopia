/**
 * IncomingDeliveryCard.tsx
 *
 * Presentational card for a single IncomingDelivery.
 *
 * Responsibilities:
 * - Render a single incoming delivery entry with ETA, title, price and action buttons.
 * - Be purely presentational; all mutations are forwarded via callbacks.
 */

import React from 'react';
import type { IncomingDelivery } from '../../types/incomingDelivery';
import { Truck, Package, Clock, X, ArrowRight } from 'lucide-react';

interface Props {
  item: IncomingDelivery;
  onCancel?: (id: string) => void;
  onExpedite?: (id: string) => void;
  className?: string;
}

/**
 * IncomingDeliveryCard
 * @param props - presentational props
 */
const IncomingDeliveryCard: React.FC<Props> = ({ item, onCancel, onExpedite, className }) => {
  const isTruck = item.type === 'truck';
  const Icon = isTruck ? Truck : Package;
  const etaDate = item.deliveryEta ? new Date(item.deliveryEta) : null;
  const etaText = etaDate ? etaDate.toLocaleString() : '—';

  return (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-start justify-between ${className || ''}`}>
      <div className="flex items-start space-x-3">
        <div className="rounded-md bg-indigo-500/10 p-2 text-indigo-400">
          <Icon className="w-5 h-5" />
        </div>

        <div>
          <div className="text-white font-medium">{item.title || item.sku || (isTruck ? 'Truck' : 'Trailer')}</div>
          <div className="text-sm text-slate-400">{item.spec?.model ?? item.metadata?.model ?? ''}</div>

          <div className="flex items-center space-x-3 text-xs text-slate-400 mt-2">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>ETA: {etaText}</span>
            </div>
            <div>{typeof item.price === 'number' ? `${item.price} €` : ''}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end space-y-2">
        <div className="text-sm text-slate-300">{item.year ?? '-'}</div>

        <div className="flex items-center space-x-2">
          {onExpedite && (
            <button
              onClick={() => onExpedite(item.id)}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs transition"
              aria-label={`Expedite ${item.id}`}
            >
              <ArrowRight className="w-3 h-3" />
              <span>Expedite</span>
            </button>
          )}
          {onCancel && (
            <button
              onClick={() => onCancel(item.id)}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs transition"
              aria-label={`Cancel ${item.id}`}
            >
              <X className="w-3 h-3" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncomingDeliveryCard;