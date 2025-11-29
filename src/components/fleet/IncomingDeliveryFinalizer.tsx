/**
 * IncomingDeliveryFinalizer.tsx
 *
 * UI-less component that periodically runs processIncomingDeliveries and attempts to
 * persist the results via GameContext when available. It also emits a window event
 * ('incomingDeliveriesMoved') with details so other UI parts can listen and animate arrivals.
 *
 * Responsibilities:
 * - Periodically check for expired incoming deliveries and request the application to persist moves.
 * - Keep behaviour resilient if GameContext shape differs across projects (try best-effort).
 */

import React, { useEffect, useRef } from 'react';
import { processIncomingDeliveries } from '../../utils/incomingDeliveryUtils';
import { useGame } from '../../contexts/GameContext';

/**
 * IncomingDeliveryFinalizer
 * @description Runs in background and processes incoming deliveries periodically.
 */
const IncomingDeliveryFinalizer: React.FC = () => {
  const intervalRef = useRef<number | null>(null);

  // Try to obtain GameContext. We are defensive: GameContext may expose different shapes.
  let gameContext: any = null;
  try {
    // If useGame is not a function or not available, this will throw; we catch below.
    gameContext = useGame ? useGame() : null;
  } catch (e) {
    gameContext = null;
  }

  useEffect(() => {
    const runOnce = () => {
      try {
        if (!gameContext || !gameContext.company) {
          // If there's no GameContext or it does not expose company, emit a request event so a listener can pick it up.
          window.dispatchEvent(new CustomEvent('requestProcessIncomingDeliveries'));
          return;
        }

        const { updatedCompany, moved } = processIncomingDeliveries(gameContext.company);

        if (moved && moved.length > 0) {
          // Prefer to call context setter functions if present (conservative API checks)
          if (typeof gameContext.setCompany === 'function') {
            gameContext.setCompany(updatedCompany);
          } else if (typeof gameContext.updateCompany === 'function') {
            gameContext.updateCompany(updatedCompany);
          } else if (typeof gameContext.saveCompany === 'function') {
            gameContext.saveCompany(updatedCompany);
          } else {
            // If no setter is available, emit an event containing the needed updates. GameContext can listen and persist.
            window.dispatchEvent(new CustomEvent('incomingDeliveriesProcessed', { detail: { updatedCompany, moved } }));
          }

          // Always emit a user-level event for UI listeners / animations
          window.dispatchEvent(new CustomEvent('incomingDeliveriesMoved', { detail: { moved } }));
        }
      } catch (err) {
        // Keep the finalizer resilient: swallow errors and try again on next tick
        // eslint-disable-next-line no-console
        console.error('IncomingDeliveryFinalizer error', err);
      }
    };

    // Run immediately once, then start interval
    runOnce();
    // Default to 5s interval (dev); this is soft and can be adjusted later
    intervalRef.current = window.setInterval(runOnce, 5000) as unknown as number;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Intentionally run once on mount; do not include gameContext in deps to avoid rapid re-subscriptions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default IncomingDeliveryFinalizer;