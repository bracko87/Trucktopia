/**
 * FinalizeIncomingDeliveries.tsx
 *
 * Small helper UI shown inside fleet pages (Garage) to allow users to finalize
 * expired incoming deliveries (ETA reached) on demand.
 *
 * Responsibilities:
 * - Detect how many incoming deliveries would be moved by processIncomingDeliveries right now.
 * - Offer an inline, unobtrusive "Finalize" button to apply the migration and persist the company.
 * - Use GameContext.createCompany when available; otherwise dispatch an event to request persistence.
 *
 * Visual: compact slate card matching the existing fleet card design. Does not alter page layout.
 */

import React, { useMemo, useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import { processIncomingDeliveries } from '../../utils/incomingDeliveryUtils';

/**
 * safeDispatchToast
 * @description Fallback toast emitter using the global event bus so the app Toaster can pick it up.
 * @param detail Toast detail payload
 */
function safeDispatchToast(detail: { title?: string; message: string; variant?: 'info' | 'success' | 'error' | 'neutral' }) {
  try {
    window.dispatchEvent(new CustomEvent('app:toast', { detail }));
  } catch {
    // ignore in restricted environments
  }
}

/**
 * FinalizeIncomingDeliveries
 * @description Inline control that shows the number of expired/pending incoming deliveries
 *              and provides a Finalize button which moves them into company.trucks/trailers.
 */
const FinalizeIncomingDeliveries: React.FC = () => {
  const { gameState, createCompany } = useGame() as any;
  const [loading, setLoading] = useState(false);

  /**
   * pendingCount
   * @description Compute how many incoming deliveries would be moved if finalized now.
   *              Uses the pure processIncomingDeliveries() helper to avoid mutating state.
   */
  const pendingCount = useMemo(() => {
    try {
      if (!gameState || !gameState.company) return 0;
      const { moved } = processIncomingDeliveries(gameState.company);
      return moved?.length ?? 0;
    } catch {
      return 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.company?.incomingDeliveries, gameState?.company?.trucks, gameState?.company]);

  /**
   * handleFinalize
   * @description Perform the finalize operation and persist updated company state.
   *              Preference: call createCompany(updatedCompany). If not available, dispatch an event.
   */
  const handleFinalize = async () => {
    if (!gameState || !gameState.company || pendingCount === 0) {
      safeDispatchToast({ title: 'Nothing to finalize', message: 'No expired incoming deliveries detected.', variant: 'info' });
      return;
    }

    setLoading(true);
    try {
      const { updatedCompany, moved } = processIncomingDeliveries(gameState.company);

      // Try to persist via GameContext.createCompany first
      if (typeof createCompany === 'function') {
        try {
          const maybe = createCompany(updatedCompany);
          if (maybe && typeof maybe.then === 'function') await maybe;
          safeDispatchToast({ title: 'Deliveries finalized', message: `${moved.length} item(s) moved into your fleet.`, variant: 'success' });
          setLoading(false);
          return;
        } catch (err) {
          // continue to fallback
          // eslint-disable-next-line no-console
          console.warn('[FinalizeIncomingDeliveries] createCompany failed', err);
        }
      }

      // Fallback: emit an event so other persistence handlers can pick up the updated company
      try {
        window.dispatchEvent(new CustomEvent('applyCompanyUpdate', { detail: { updatedCompany } }));
        safeDispatchToast({ title: 'Deliveries finalized', message: `${moved.length} item(s) moved locally. Persistence requested.`, variant: 'neutral' });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[FinalizeIncomingDeliveries] fallback dispatch failed', err);
        safeDispatchToast({ title: 'Finalization failed', message: 'Could not persist finalized deliveries. Check console.', variant: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  // If there is nothing pending, render nothing so layout is unchanged.
  if (!pendingCount) return null;

  return (
    <div className="mt-4 bg-slate-800 rounded-lg p-3 border border-slate-700 flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="text-sm text-slate-300">Expired incoming deliveries</div>
        <div className="text-white font-medium">{pendingCount} item{pendingCount > 1 ? 's' : ''} ready to finalize</div>
        <div className="text-xs text-slate-400 mt-1">Finalize them to move into your fleet (ETA reached).</div>
      </div>

      <div className="flex-shrink-0">
        <button
          onClick={handleFinalize}
          disabled={loading}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${loading ? 'bg-slate-600 text-slate-300' : 'bg-green-600 hover:bg-green-700 text-white'}`}
        >
          {loading ? 'Processing…' : 'Finalize'}
        </button>
      </div>
    </div>
  );
};

export default FinalizeIncomingDeliveries;