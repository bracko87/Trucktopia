/**
 * RemoveSimulationBadge.tsx
 *
 * UI-less helper that locates and hides a small inline simulation badge used on some pages.
 *
 * Responsibilities:
 * - Run a DOM-safe client-side patch to hide any element that contains the exact
 *   badge text "Simulation • Logistics • Strategy".
 * - Be resilient to timing by running once on mount and again shortly after to catch
 *   late-rendered content.
 *
 * Rationale:
 * - Some pages render a decorative badge via static HTML; removing it by DOM patch
 *   avoids changing multiple source files and keeps visual layout intact.
 */

import React from 'react';

/**
 * RemoveSimulationBadge
 * @description React component that hides the simulation badge when detected in the DOM.
 *              This component intentionally has no visual output.
 */
const RemoveSimulationBadge: React.FC = () => {
  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    const targetText = 'Simulation • Logistics • Strategy';

    /**
     * hideMatches
     * @description Find nodes containing the target text and hide the closest visible wrapper.
     */
    const hideMatches = () => {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>('div,span,p,button'));
      candidates.forEach((node) => {
        try {
          if (!node?.textContent) return;
          if (node.textContent.trim().includes(targetText)) {
            // Prefer hiding the nearest rounded container if available
            const container =
              node.closest('div.bg-slate-800') ||
              node.closest('div.rounded-2xl') ||
              node.closest('div') ||
              node;
            if (container && container instanceof HTMLElement) {
              container.style.display = 'none';
              container.setAttribute('data-removed-by', 'RemoveSimulationBadge');
            }
          }
        } catch {
          // Swallow DOM errors to keep this safe
        }
      });
    };

    // Run immediately and schedule a follow-up to catch late renders
    hideMatches();
    const t = window.setTimeout(hideMatches, 600);

    return () => {
      window.clearTimeout(t);
    };
  }, []);

  return null;
};

export default RemoveSimulationBadge;