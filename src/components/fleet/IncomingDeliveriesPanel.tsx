/**
 * IncomingDeliveriesPanel.tsx
 *
 * Presentational list component for Incoming Deliveries.
 *
 * Responsibilities:
 * - Display a list of incoming deliveries (cards).
 * - Forward cancel/expedite actions to parent via callbacks.
 *
 * Notes:
 * - This component is intentionally agnostic about where the data comes from (props).
 * - It keeps UI responsibilities only and can be integrated into Fleet page or dashboard.
 */

import React from 'react';
import type { IncomingDelivery } from '../../types/incomingDelivery';
import IncomingDeliveryCard from './IncomingDeliveryCard';

interface Props {
  items: IncomingDelivery[];
  onCancel?: (id: string) => void;
  onExpedite?: (id: string) => void;
  className?: string;
}

/**
 * IncomingDeliveriesPanel
 * @param props - presentational props
 */
const IncomingDeliveriesPanel: React.FC<Props> = ({ items = [], onCancel, onExpedite, className }) => {
  return (
    <section className={`space-y-3 ${className || ''}`}>
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Incoming Deliveries</h3>
        <div className="text-sm text-slate-400">{items.length} in transit</div>
      </header>

      <div className="grid grid-cols-1 gap-3">
        {items.length === 0 && <div className="text-sm text-slate-400">No incoming deliveries.</div>}

        {items.map((it) => (
          <IncomingDeliveryCard key={it.id} item={it} onCancel={onCancel} onExpedite={onExpedite} />
        ))}
      </div>
    </section>
  );
};

export default IncomingDeliveriesPanel;