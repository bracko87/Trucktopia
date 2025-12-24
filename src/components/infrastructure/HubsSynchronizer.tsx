/**
 * HubsSynchronizer.tsx
 *
 * Non-visual background helper that ensures hubs are synchronized into the active
 * company state from tolerant places in gameState (infrastructure.hubs, hubs).
 *
 * Responsibilities:
 * - Periodically check for hubs present in gameState.infrastructure.hubs or gameState.hubs
 *   and, when the active company is missing hubs, persist them into company via createCompany.
 * - Runs in the browser as a mounted UI-less component (like other normalizers).
 *
 * Notes:
 * - This is intentionally conservative: it will only write into company.hubs if the
 *   company exists and has no hubs array (or an empty one) while other hubs sources exist.
 * - For cross-user/server consistency you should run a backend job (cron / engine).
 */

import React, { useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';

interface AnyObject {
  [key: string]: any;
}

/**
 * HubsSynchronizer
 *
 * @description Background synchronizer to normalize hubs into active company state.
 *              Keeps client-side hub representations consistent without modifying UI.
 */
const HubsSynchronizer: React.FC = () => {
  const game = useGame() as any;

  useEffect(() => {
    let mounted = true;
    const syncOnce = () => {
      try {
        if (!mounted) return;
        const gs: AnyObject = (game && game.gameState) ? game.gameState : null;
        if (!gs) return;

        const currentUser = gs.currentUser ?? null;
        const company = gs.company ?? null;

        // Tolerant lookups for hubs
        const infraHubs = Array.isArray(gs.infrastructure?.hubs) ? gs.infrastructure.hubs : null;
        const topHubs = Array.isArray(gs.hubs) ? gs.hubs : null;
        const sourceHubs = (infraHubs && infraHubs.length > 0) ? infraHubs : (topHubs && topHubs.length > 0 ? topHubs : null);

        // If there's no source hubs or no company, nothing to do
        if (!sourceHubs || !company || !currentUser) return;

        // If company already has hubs -> nothing to do
        if (Array.isArray(company.hubs) && company.hubs.length > 0) return;

        // Create an updated company with hubs populated from sourceHubs
        const newCompany = {
          ...company,
          hubs: sourceHubs.map((h: AnyObject) => ({
            // copy minimal known fields and keep rest
            id: h.id ?? h.name ?? `${Math.random().toString(36).slice(2, 9)}`,
            name: h.name ?? h.title ?? h.city ?? null,
            city: h.city ?? null,
            capacity: typeof h.capacity === 'number' ? h.capacity : (typeof h.capacity === 'string' ? Number(h.capacity) : undefined),
            active: typeof h.active === 'boolean' ? h.active : (h.active ? true : false),
            description: h.description ?? h.notes ?? null,
            ...h
          }))
        };

        // Persist using createCompany so the GameContext performs normal persistence
        if (typeof game.createCompany === 'function') {
          // createCompany expects a Company shape. We won't change layout or other fields.
          game.createCompany(newCompany);
        } else {
          // Fallback: try to set gameState directly if available (defensive)
          try {
            game.setCurrentPage && game.setCurrentPage(game.gameState?.currentPage ?? 'dashboard');
          } catch {
            // ignore
          }
        }
      } catch (err) {
        // defensive: do not break app if sync fails
        // eslint-disable-next-line no-console
        console.warn('[HubsSynchronizer] sync error', err);
      }
    };

    // Run immediately and then periodically (30s)
    syncOnce();
    const interval = window.setInterval(syncOnce, 30_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
    // Intentionally depend on game.gameState reference to re-evaluate when gameState changes
  }, [game]);

  // UI-less
  return null;
};

export default HubsSynchronizer;