/**
 * HubConstructionFinalizer.tsx
 *
 * UI-less background helper that listens to the canonical game clock and finalizes
 * hub construction pending tasks when their completionGameMs is reached.
 *
 * Behaviour:
 * - On completion: removes pending task and appends the new hub to company.hubs
 * - Uses GameContext.createCompany when available (keeps existing persistence path)
 * - Dispatches tm:pendingTasksUpdated via pendingTasks helper
 */

import React, { useEffect } from 'react';
import { subscribe, nowUtcMs } from '../../utils/gameClock';
import { readTasks, removeTask } from '../../utils/pendingTasks';
import { useGame } from '../../contexts/GameContext';

/**
 * HubConstructionFinalizer
 * @description Mount this component in App so it runs in the background and finalizes hub builds.
 */
const HubConstructionFinalizer: React.FC = () => {
  const game = useGame() as any;

  useEffect(() => {
    let mounted = true;

    const checkAndFinalize = (detail?: { nowUtcMs?: number }) => {
      if (!mounted) return;
      try {
        const nowMs = typeof detail?.nowUtcMs === 'number' ? detail!.nowUtcMs : nowUtcMs();
        const tasks = readTasks();
        const completed = tasks.filter((t) => t.type === 'build-hub' && t.completionGameMs <= nowMs);

        if (completed.length === 0) return;

        // For each completed task: remove it and append a hub into company.hubs
        completed.forEach((t) => {
          try {
            // Build a simple hub object (level 1)
            const newHub = {
              id: `hub-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              name: `${t.city} Hub`,
              city: t.city,
              countryCode: t.countryCode,
              level: 1,
              createdAt: new Date().toISOString(),
            };

            // Persist into company using existing game.createCompany if available
            const gs = (game && game.gameState) ? game.gameState : null;
            const company = gs?.company ?? null;

            if (company) {
              const existingHubs = Array.isArray(company.hubs) ? company.hubs : (company.hub ? [company.hub] : []);
              const mergedHubs = [...existingHubs, newHub];
              const newCompany = { ...company, hubs: mergedHubs };
              if (typeof game.createCompany === 'function') {
                game.createCompany(newCompany);
              } else if (typeof game.setGameState === 'function') {
                // defensive fallback
                try {
                  const updated = { ...(game.gameState ?? {}), company: newCompany };
                  game.setGameState(updated);
                } catch {
                  // ignore
                }
              }
            }
          } catch (err) {
            // ignore per-task errors
            // eslint-disable-next-line no-console
            console.warn('[HubConstructionFinalizer] finalize error', err);
          } finally {
            // remove pending task in any case so it won't re-run
            try {
              removeTask(t.id);
            } catch {
              // ignore
            }
          }
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[HubConstructionFinalizer] check error', err);
      }
    };

    // Run immediately, then subscribe to game clock updates
    checkAndFinalize();
    const unsub = subscribe((d) => checkAndFinalize(d));

    return () => {
      mounted = false;
      if (typeof unsub === 'function') unsub();
    };
    // Intentionally depend on game reference so when GameContext is available it is used.
  }, [game]);

  return null;
};

export default HubConstructionFinalizer;