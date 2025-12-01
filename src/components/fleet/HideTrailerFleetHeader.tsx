/**
 * src/components/fleet/HideTrailerFleetHeader.tsx
 *
 * File-level description:
 * Background helper component that removes any visible "Trailer Fleet" / "Manage your trailers"
 * header elements from the DOM. It is intentionally non-visual and safe: it doesn't touch React state
 * or other components — only the rendered DOM. It uses a MutationObserver + interval fallback to
 * stay resilient against re-renders.
 */

import React, { useEffect } from 'react';

/**
 * normalize
 * @description Utility to normalize text for robust comparisons (trim + collapse spaces + lowercase).
 * @param s string input
 * @returns normalized string
 */
function normalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * removeMatchingHeaderNodes
 * @description Find header blocks containing both "Trailer Fleet" and "Manage your trailers"
 * (case-insensitive). For each matching occurrence, remove the nearest ancestor (up to 6 levels)
 * whose innerText contains both phrases to avoid removing unrelated markup.
 */
function removeMatchingHeaderNodes() {
  try {
    const titleMatch = 'trailer fleet';
    const subtitleMatch = 'manage your trailers';

    // Look for likely title nodes first (h1/h2/h3) to minimize false positives
    const titleSelectors = ['h1', 'h2', 'h3', 'h4', 'b', 'strong', 'div'];
    for (const sel of titleSelectors) {
      const nodes = Array.from(document.querySelectorAll(sel));
      for (const node of nodes) {
        const text = normalize(node.textContent);
        if (!text.includes(titleMatch)) continue;

        // ascend up to 6 parent levels to find a container that also includes the subtitle
        let ancestor: HTMLElement | null = node as HTMLElement | null;
        let depth = 0;
        let removed = false;
        while (ancestor && ancestor !== document.body && depth < 7) {
          const combined = normalize(ancestor.innerText || ancestor.textContent);
          if (combined.includes(titleMatch) && combined.includes(subtitleMatch)) {
            // Remove the entire ancestor block
            try {
              ancestor.remove();
            } catch {
              // fallback: hide
              (ancestor as HTMLElement).style.display = 'none';
            }
            removed = true;
            break;
          }
          ancestor = ancestor.parentElement;
          depth += 1;
        }

        // If not removed by combined match, attempt a cautious nearby removal:
        if (!removed) {
          // Check sibling paragraph for subtitle text and remove parent container if safe
          const siblingP = (node.parentElement || node).querySelector('p,span,div');
          if (siblingP && normalize((siblingP as HTMLElement).innerText).includes(subtitleMatch)) {
            let container = node.parentElement;
            let depth2 = 0;
            while (container && container !== document.body && depth2 < 7) {
              const combined2 = normalize(container.innerText || container.textContent);
              if (combined2.includes(titleMatch) && combined2.includes(subtitleMatch)) {
                try {
                  container.remove();
                } catch {
                  container.style.display = 'none';
                }
                break;
              }
              container = container.parentElement;
              depth2++;
            }
          }
        }
      }
    }

    // As an extra precaution, look for any elements whose text includes both phrases anywhere
    const allEls = Array.from(document.querySelectorAll('body *'));
    for (const el of allEls) {
      const txt = normalize((el as HTMLElement).innerText || (el as HTMLElement).textContent);
      if (txt.includes('trailer fleet') && txt.includes('manage your trailers')) {
        // remove the most compact ancestor that contains both phrases (climb until text shrinks)
        let candidate: HTMLElement | null = el as HTMLElement;
        while (candidate && candidate.parentElement && normalize(candidate.parentElement.innerText || candidate.parentElement.textContent).includes('trailer fleet') && normalize(candidate.parentElement.innerText || candidate.parentElement.textContent).includes('manage your trailers')) {
          candidate = candidate.parentElement;
        }
        try {
          candidate?.remove();
        } catch {
          if (candidate) (candidate as HTMLElement).style.display = 'none';
        }
      }
    }
  } catch (err) {
    // keep quiet — this helper must be non-fatal
    // eslint-disable-next-line no-console
    console.debug('HideTrailerFleetHeader: cleanup failed', err);
  }
}

/**
 * HideTrailerFleetHeader
 * @description React background component. Mount this once at the top-level (App.tsx)
 * to remove the legacy "Trailer Fleet" header everywhere in the DOM.
 *
 * Behavior:
 * - Runs initial cleanup after short delays (to catch different render timings).
 * - Installs a MutationObserver that re-runs the cleanup for newly added nodes.
 * - Has an interval fallback to re-run cleanup periodically.
 */
const HideTrailerFleetHeader: React.FC = () => {
  useEffect(() => {
    // Run initial attempts on short delays to catch async rendering
    const t1 = window.setTimeout(removeMatchingHeaderNodes, 50);
    const t2 = window.setTimeout(removeMatchingHeaderNodes, 300);
    const t3 = window.setTimeout(removeMatchingHeaderNodes, 1200);

    // MutationObserver to watch for later insertions / re-renders
    const observer = new MutationObserver(() => {
      removeMatchingHeaderNodes();
    });

    // Start observing the document body if available
    if (document && document.body) {
      try {
        observer.observe(document.body, { childList: true, subtree: true });
      } catch {
        // ignore
      }
    }

    // Interval fallback — in case of re-render loops or missed mutations
    const interval = window.setInterval(removeMatchingHeaderNodes, 2000);

    // Run once immediately too (best-effort)
    removeMatchingHeaderNodes();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
      try {
        observer.disconnect();
      } catch {
        // ignore
      }
    };
  }, []);

  // Non-visual component
  return null;
};

export default HideTrailerFleetHeader;