/**
 * src/components/fleet/ForceHidePackageIconBox.tsx
 *
 * File-level description:
 * Aggressive runtime helper to hide compact package/trailer icon boxes that remain
 * visible even after other cleanup attempts. This helper:
 * - Finds SVGs that represent the lucide "package" icon.
 * - Hides the SVG and climbs ancestors to hide compact wrapper boxes using inline
 *   styles with !important so they remain hidden even if re-rendered.
 * - Injects a small CSS fallback rule to hide package SVGs.
 * - Uses a MutationObserver + interval fallback for resilience.
 *
 * This is non-destructive (runtime-only) and reversible by removing the mount/import.
 */

import React, { useEffect } from 'react';

/**
 * normalize
 * @description Normalizes strings for robust comparisons.
 * @param s input string
 * @returns normalized string
 */
function normalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * hidePackageIconBoxesForce
 * @description Force-hide package SVGs and reasonable ancestor wrappers by applying
 * inline styles with the 'important' priority. Tries multiple heuristics and falls
 * back to hiding the SVG itself.
 */
function hidePackageIconBoxesForce() {
  try {
    const svgs = Array.from(
      document.querySelectorAll<SVGElement>(
        'svg.lucide-package, svg[class*="lucide-package"], svg[class*="package"], svg[aria-hidden="true"]'
      )
    );

    svgs.forEach((svg) => {
      // Defensive: ensure svg has a path (likely a real icon)
      if (!svg.querySelector('path')) {
        return;
      }

      // Heuristic: climb up to 6 ancestors and hide the first that looks like the compact icon box
      let ancestor: HTMLElement | null = svg as HTMLElement;
      let depth = 0;
      let hidden = false;
      while (ancestor && ancestor !== document.body && depth < 7) {
        const cls = (ancestor.className || '').toString();
        const txt = normalize(ancestor.innerText || ancestor.textContent);
        // Typical indicators for the small icon box: width/height classes / ring / bg token
        if (
          (typeof cls === 'string' &&
            (cls.includes('w-10') ||
              cls.includes('h-10') ||
              cls.includes('ring-1') ||
              cls.includes('rounded-lg'))) ||
          txt.length < 40 // very compact container
        ) {
          try {
            ancestor.style.setProperty('display', 'none', 'important');
            ancestor.style.setProperty('pointer-events', 'none', 'important');
            ancestor.setAttribute('data-hidden-by', 'force-hide-package');
            hidden = true;
            break;
          } catch {
            // ignore and continue
          }
        }
        ancestor = ancestor.parentElement;
        depth += 1;
      }

      if (hidden) return;

      // Fallback: hide parent chain up to 4 levels
      let parent: HTMLElement | null = svg.parentElement;
      for (let i = 0; i < 4 && parent; i++) {
        try {
          parent.style.setProperty('display', 'none', 'important');
          parent.style.setProperty('pointer-events', 'none', 'important');
          parent.setAttribute('data-hidden-by', 'force-hide-package');
        } catch {
          // ignore
        }
        parent = parent.parentElement;
      }

      // Final fallback: hide the svg itself
      try {
        (svg as HTMLElement).style.setProperty('display', 'none', 'important');
        (svg as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
        (svg as HTMLElement).setAttribute('data-hidden-by', 'force-hide-package');
      } catch {
        // ignore
      }
    });
  } catch (err) {
    // Non-fatal
    // eslint-disable-next-line no-console
    console.debug('ForceHidePackageIconBox: hide attempt failed', err);
  }
}

/**
 * ForceHidePackageIconBox
 * @description React background component that aggressively hides package icon boxes.
 * Mount at app root so it runs across pages.
 */
const ForceHidePackageIconBox: React.FC = () => {
  useEffect(() => {
    // Initial attempts (catch different render timings)
    const t1 = window.setTimeout(hidePackageIconBoxesForce, 50);
    const t2 = window.setTimeout(hidePackageIconBoxesForce, 300);
    const t3 = window.setTimeout(hidePackageIconBoxesForce, 1200);

    // MutationObserver to handle dynamic insertions
    const observer = new MutationObserver(() => {
      hidePackageIconBoxesForce();
    });

    try {
      if (document && document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    } catch {
      // ignore observer errors
    }

    // Interval fallback
    const interval = window.setInterval(hidePackageIconBoxesForce, 800);

    // Inject small CSS as fallback to hide package SVGs too
    const style = document.createElement('style');
    style.setAttribute('data-injected', 'force-hide-package');
    style.textContent =
      'svg.lucide-package, svg[class*="lucide-package"], svg[class*="package"] { display: none !important; pointer-events: none !important; }';
    try {
      document.head?.appendChild(style);
    } catch {
      // ignore
    }

    // Run immediately as well
    hidePackageIconBoxesForce();

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
      try {
        style.remove();
      } catch {
        // ignore
      }
    };
  }, []);

  // Non-visual
  return null;
};

export default ForceHidePackageIconBox;