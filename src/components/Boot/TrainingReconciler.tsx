/**
 * TrainingReconciler.tsx
 *
 * UI-less background component.
 *
 * Responsibilities:
 * - Subscribe to the central game clock and reconcile staff training entries.
 * - When training.endDate (parsed via parseGameDate) <= nowUtcMs, finalize the training:
 *    - award skill progress
 *    - adjust fit/happiness
 *    - clear training entry and set status to 'available'
 *    - persist changes via createCompany (GameContext helper)
 *
 * Notes:
 * - This component is intentionally small and isolated (single responsibility).
 * - It uses existing utilities: nowUtcMs, subscribe (gameClock) and parseGameDate.
 */

import React from 'react';
import { useGame } from '../../contexts/GameContext';
import { nowUtcMs, subscribe as subscribeGameClock } from '../../utils/gameClock';
import { parseGameDate } from '../../utils/gameTime';
import { writeSkillProgress } from '../../utils/skillPersistence';

/**
 * TrainingReconciler
 * @description Background component that finalizes staff trainings when in-game time passes endDate.
 * @returns null (no UI)
 */
const TrainingReconciler: React.FC = () => {
  const { gameState, createCompany } = useGame();

  React.useEffect(() => {
    let mounted = true;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const FIT_DECAY_PER_DAY = 2; // fit lost per simulated day while training

    /**
     * reconcile
     * @description Walk company.staff and finalize trainings whose endDate has passed according to the in-game clock.
     */
    const reconcile = async () => {
      if (!mounted) return;
      if (!gameState || !gameState.company) return;

      try {
        const company = JSON.parse(JSON.stringify(gameState.company));
        let changed = false;
        const now = nowUtcMs();

        (company.staff || []).forEach((s: any) => {
          if (!s || !s.training) return;
          const endMs = parseGameDate(s.training.endDate);
          if (endMs === null) return; // can't parse - skip
          if (now >= endMs) {
            try {
              const skill = s.training.skill;
              const prevPct = Number(s.skillsProgress?.[skill] ?? 0);
              const added = Math.floor(Math.random() * 3) + 3; // award 3..5%
              const nextPct = Math.min(100, prevPct + added);

              // Persist skill progress via utility (best-effort)
              try {
                writeSkillProgress(s.id, skill, nextPct);
              } catch {
                // ignore persistence errors
              }

              s.skillsProgress = { ...(s.skillsProgress || {}), [skill]: nextPct };

              // Determine total training days (fall back to 1 if missing)
              const startMs = parseGameDate(s.training.startDate) ?? Math.max(0, endMs - MS_PER_DAY);
              const totalDays = Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY));

              // Fit decay and happiness boost
              const fitPrev = typeof s.fit === 'number' ? s.fit : 100;
              s.fit = Math.max(0, Number((fitPrev - FIT_DECAY_PER_DAY * totalDays).toFixed(2)));

              const hPrev = typeof s.happiness === 'number' ? s.happiness : 100;
              const happinessBoost = Math.floor(2 + Math.random() * 4); // 2..5
              s.happiness = Math.min(100, hPrev + happinessBoost);

              // Finalize
              s.training = null;
              s.status = 'available';
              // Ephemeral marker for external logic (not persisted long-term)
              s.__trainingCompleted = { skill, added, prevPct, nextPct };
              changed = true;
            } catch (err) {
              // swallow per-staff errors to avoid breaking the loop
              // eslint-disable-next-line no-console
              console.warn('[TrainingReconciler] finalize error', err);
            }
          } else {
            // training still ongoing; keep status
            s.status = 'training';
          }
        });

        if (changed) {
          // Persist via createCompany when available; otherwise try to set through known API patterns.
          try {
            if (typeof createCompany === 'function') {
              createCompany({ ...company });
            } else {
              // Fallback: try to persist into localStorage compatible key (best-effort)
              try {
                localStorage.setItem('tm_admin_state', JSON.stringify({ company }));
              } catch {
                // ignore
              }
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[TrainingReconciler] persist error', err);
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[TrainingReconciler] reconcile error', err);
      }
    };

    // Subscribe to authoritative clock updates and run once immediately
    const unsub = subscribeGameClock(() => {
      void reconcile();
    });

    // Run immediate reconcile for quick startup
    void reconcile();

    // Fallback interval for environments where gameClock events might not fire
    const fallback = window.setInterval(() => {
      void reconcile();
    }, 5000);

    return () => {
      mounted = false;
      try {
        unsub();
      } catch {
        // ignore
      }
      clearInterval(fallback);
    };
    // NOTE: intentionally only re-run when top-level gameState reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  return null;
};

export default TrainingReconciler;