/**
 * src/components/fleet/HideTrailerPackageIconBox.tsx
 *
 * File-level description:
 * Background helper to remove compact header boxes that only show the package/trailer icon
 * (svg with class "lucide-package") even when the textual header may be missing.
 *
 * Responsibilities:
 * - Locate svg elements that render the package/trailer icon.
 * - Remove or hide an appropriate ancestor container so the small icon box is removed.
 * - Keep watching the DOM with a MutationObserver and interval fallback to handle re-renders.
 *
 * This helper is intentionally non-visual and conservative about which ancestor it removes.
 */

import React, { useEffect } from 'react';

/**
 * normalize
 * @description Normalize string for robust comparisons (trim, collapse spaces, lowercase).
 * @param s input string
 * @returns normalized string
 */
function normalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * removePackageIconBoxes
 * @description Find package icon SVGs (lucide-package / contains 'package') and remove
 *              a compact ancestor likely representing the small header box. This function
 *              tries several heuristics (text match, class match, climb fixed depth) and then
 *              either removes the node or hides it as a fallback.
 */
function removePackageIconBoxes() {
  try {
    // Select candidate SVGs that indicate the package/trailer icon
    const svgs = Array.from(document.querySelectorAll<SVGElement>('svg.lucide-package, svg[class*="package"], svg[aria-hidden="true"]'));
    for (const svg of svgs) {
      // Defensive: ensure this svg actually contains a path (skip unrelated svgs)
      if (!svg.querySelector('path')) continue;

      // Heuristic 1: climb to find an ancestor with both "trailer fleet" and "manage your trailers"
      let ancestor: HTMLElement | null = svg as HTMLElement;
      let depth = 0;
      let removed = false;
      while (ancestor && ancestor !== document.body && depth < 7) {
        const text = normalize(ancestor.innerText || ancestor.textContent);
        if (text.includes('trailer fleet') && text.includes('manage your trailers')) {
          try {
            ancestor.remove();
          } catch {
            (ancestor as HTMLElement).style.display = 'none';
          }
          removed = true;
          break;
        }
        ancestor = ancestor.parentElement;
        depth += 1;
      }
      if (removed) continue;

      // Heuristic 2: find a compact header row (common classes used in the UI)
      // Look for ancestor that contains both "items-center" and "mb-4" class tokens or "justify-between"
      ancestor = svg.parentElement;
      depth = 0;
      while (ancestor && ancestor !== document.body && depth < 6) {
        const cls = ancestor.className || '';
        if (typeof cls === 'string' && (cls.includes('items-center') && (cls.includes('mb-4') || cls.includes('justify-between')))) {
          try {
            ancestor.remove();
          } catch {
            (ancestor as HTMLElement).style.display = 'none';
          }
          removed = true;
          break;
        }
        ancestor = ancestor.parentElement;
        depth += 1;
      }
      if (removed) continue;

      // Heuristic 3: remove the most compact logical wrapper:
      // if we find a wrapper having the size classes (w-10 h-10) remove its parent container.
      const wrapper = svg.closest('div.w-10.h-10, div[class*="w-10"][class*="h-10"]') as HTMLElement | null;
      if (wrapper) {
        const parent = wrapper.parentElement?.parentElement || wrapper.parentElement;
        if (parent) {
          try {
            parent.remove();
          } catch {
            parent.style.display = 'none';
          }
          continue;
        }
      }

      // Heuristic 4: fallback — climb 3 levels and remove that container (safe, conservative)
      let candidate: HTMLElement | null = svg.parentElement;
      for (let i = 0; i < 3 && candidate && candidate.parentElement; i++) {
        candidate = candidate.parentElement;
      }
      if (candidate && candidate !== document.body) {
        try {
          candidate.remove();
        } catch {
          candidate.style.display = 'none';
        }
      }
    }
  } catch (err) {
    // Non-fatal; keep quiet in production-like preview
    // eslint-disable-next-line no-console
    console.debug('HideTrailerPackageIconBox: cleanup failed', err);
  }
}

/**
 * HideTrailerPackageIconBox
 * @description React background component that removes compact package-icon boxes across the app.
 *              Mount at the app root so it runs everywhere.
 */
const HideTrailerPackageIconBox: React.FC = () => {
  useEffect(() => {
    // Run immediate attempts
    const t1 = window.setTimeout(removePackageIconBoxes, 50);
    const t2 = window.setTimeout(removePackageIconBoxes, 300);
    const t3 = window.setTimeout(removePackageIconBoxes, 1200);

    // MutationObserver to watch for later insertions / re-renders
    const observer = new MutationObserver(() => {
      removePackageIconBoxes();
    });

    if (document && document.body) {
      try {
        observer.observe(document.body, { childList: true, subtree: true });
      } catch {
        // ignore observer initialization errors
      }
    }

    // Interval fallback
    const interval = window.setInterval(removePackageIconBoxes, 2000);

    // Run once immediately as well
    removePackageIconBoxes();

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

  // Non-visual helper
  return null;
};

export default HideTrailerPackageIconBox;