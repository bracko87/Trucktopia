/**
 * ExposeGameState.tsx
 *
 * Purpose:
 * - Small development helper that attaches convenience accessors to window so
 *   developers can inspect game / company / truck data from the browser console.
 *
 * Notes:
 * - This component is purely dev-only and read-only (it does not modify state).
 * - It mounts inside GameProvider (App) so useGame() exists.
 */

import React, { useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';

declare global {
  interface Window {
    __getGameState?: () => any;
    __getCompany?: () => any;
    __findTruckById?: (id: string) => any | null;
    __findTrailerById?: (id: string) => any | null;
  }
}

/**
 * ExposeGameState
 * @description Mounts helper functions on window for debugging the current game state.
 */
const ExposeGameState: React.FC = () => {
  const { gameState } = useGame();

  useEffect(() => {
    // Read-only helpers that always return the latest snapshot from closure
    const getGameState = () => gameState;
    const getCompany = () => (gameState ? (gameState.company ?? null) : null);

    const findTruckById = (id?: string) => {
      const c = getCompany();
      if (!c || !id) return null;
      const trucks = Array.isArray(c.trucks) ? c.trucks : [];
      return trucks.find((t: any) => String(t.id) === String(id)) ?? null;
    };

    const findTrailerById = (id?: string) => {
      const c = getCompany();
      if (!c || !id) return null;
      const trailers = Array.isArray(c.trailers) ? c.trailers : [];
      return trailers.find((t: any) => String(t.id) === String(id)) ?? null;
    };

    // Attach to window
    window.__getGameState = getGameState;
    window.__getCompany = getCompany;
    window.__findTruckById = findTruckById;
    window.__findTrailerById = findTrailerById;

    // Keep available while mounted; cleanup on unmount
    return () => {
      try {
        delete window.__getGameState;
        delete window.__getCompany;
        delete window.__findTruckById;
        delete window.__findTrailerById;
      } catch {
        // ignore deletion errors
      }
    };
  }, [gameState]);

  // Render nothing (UI-less helper)
  return null;
};

export default ExposeGameState;
