/**
 * src/data/remove-company-level-badge.ts
 *
 * Runtime DOM patcher to remove the small "Level: <tier>" inline badge (with a compact progress bar).
 *
 * Purpose:
 * - Immediately hide and remove the visual "Level: ..." badge wherever it appears.
 * - Use both DOM removal and a fallback CSS hide rule to guarantee the badge is not visible.
 * - Be conservative and safe: only targets elements that look like the level badge (contain "Level:" and
 *   a progressbar with aria-label "Progress to next tier").
 *
 * Behavior:
 * - Runs only in the browser environment.
 * - Performs an initial scan on load and removes matches right away.
 * - Observes DOM mutations for a short period (15s) to catch dynamically inserted badges.
 *
 * Safety:
 * - Uses conservative heuristics to avoid removing unrelated elements.
 * - Only removes or hides nodes when the text "Level:" and a progressbar with the expected aria-label
 *   are both present in the same compact container.
 */

/**
 * isBrowser
 * @description Returns true when running in a browser environment.
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

if (isBrowser()) {
  /**
   * CSS fallback: hide elements marked by this script in case removal misses a render.
   * We add a unique class and a strict !important rule so the badge is invisible even when
   * React re-renders quickly.
   */
  const HIDE_CLASS = '__removed-company-level-badge';
  try {
    const style = document.createElement('style');
    style.setAttribute('data-remover', 'company-level-badge');
    style.textContent = `
      /* Hide any element we tag as a removed company level badge */
      .${HIDE_CLASS} { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }
      /* Defensive: Hide compact inline badges that include a progressbar labelled like the in-app widget */
      [role="progressbar"][aria-label*="Progress to next tier"] { isolation: isolate; }
    `;
    document.head?.appendChild(style);
  } catch (err) {
    // ignore style injection failures
  }

  /**
   * isBadgeContainer
   * @description Heuristically determine if the given element is the small "Level:" badge container.
   * Matches when:
   *  - The element text contains "Level:" (case sensitive as rendered by UI)
   *  - There is a descendant progressbar with an aria-label containing "Progress to next tier"
   *
   * @param el Element to test
   */
  function isBadgeContainer(el: Element): boolean {
    try {
      const text = (el.textContent || '').trim();
      if (!text.includes('Level:')) return false;

      // Look for the progressbar with expected aria-label
      const prog = el.querySelector('[role="progressbar"][aria-label*="Progress to next tier"], [aria-label*="Progress to next tier"]');
      if (!prog) return false;

      // Make sure the container is likely the small inline badge (compact)
      const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
      if (rect && rect.width > 0 && rect.height > 0) {
        // small height/pill expected (heuristic)
        if (rect.height > 80) {
          // too tall to be the small inline badge; skip
          // (some larger panels may include similar text)
          return false;
        }
      }

      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * hideOrRemove
   * @description Remove the target element safely. If removal fails, apply the hide class as fallback.
   * @param el Element to remove/hide
   */
  function hideOrRemove(el: Element) {
    try {
      // Prefer removing the compact wrapper if present
      const wrapper = el.closest('.inline-flex, .rounded-full, .level-badge, div') || el;
      if (wrapper && wrapper.parentElement) {
        wrapper.remove();
        return;
      }
      el.remove();
    } catch (err) {
      try {
        (el as HTMLElement).classList.add(HIDE_CLASS);
      } catch (e) {
        // ignore failures
      }
    }
  }

  /**
   * scanAndRemoveAll
   * @description Find badge candidates across the document and remove them.
   */
  function scanAndRemoveAll() {
    try {
      // Prefer scanning compact containers likely to include the badge
      const candidates = Array.from(document.querySelectorAll('.inline-flex, .rounded-full, [role="progressbar"], div, span'));
      for (const node of candidates) {
        if (!(node instanceof Element)) continue;
        if (isBadgeContainer(node)) {
          hideOrRemove(node);
        } else {
          // if node contains descendant that matches heuristics, remove that descendant
          const descendants = node.querySelectorAll('*');
          for (const d of Array.from(descendants)) {
            if (!(d instanceof Element)) continue;
            if (isBadgeContainer(d)) {
              hideOrRemove(d);
            }
          }
        }
      }

      // Extra pass: search for elements that explicitly contain the text "Level:" (broad),
      // and test them precisely.
      const broad = document.querySelectorAll('div, span, p, a, li');
      for (let i = 0; i < broad.length; i++) {
        const el = broad[i] as Element;
        if (!el) continue;
        const txt = (el.textContent || '');
        if (txt.includes('Level:') && isBadgeContainer(el)) {
          hideOrRemove(el);
        }
      }
    } catch (err) {
      // ignore scanning errors
    }
  }

  // Initial immediate scan (best-effort)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(scanAndRemoveAll, 0);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(scanAndRemoveAll, 0), { once: true });
  }

  /**
   * MutationObserver to catch dynamically inserted badges (e.g. React mounts)
   * Observes for a short window and disconnects after inactivity/time.
   */
  const observer = new MutationObserver((mutations) => {
    let found = false;
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes || [])) {
        if (!(node instanceof Element)) continue;
        if (isBadgeContainer(node)) {
          hideOrRemove(node);
          found = true;
        } else {
          // check descendants
          try {
            const desc = node.querySelector && node.querySelector('[role="progressbar"][aria-label*="Progress to next tier"], [aria-label*="Progress to next tier"]');
            if (desc) {
              // climb up to the smallest ancestor that includes 'Level:' text
              let candidate: Element | null = desc;
              let limit = 5;
              while (candidate && limit-- > 0) {
                if ((candidate.textContent || '').includes('Level:')) break;
                candidate = candidate.parentElement;
              }
              if (candidate && isBadgeContainer(candidate)) {
                hideOrRemove(candidate);
                found = true;
              }
            }
          } catch (e) {
            // ignore descendant checks
          }
        }
      }
    }
    if (found) {
      // extra full scan to be safe
      scanAndRemoveAll();
    }
  });

  try {
    observer.observe(document.body, { childList: true, subtree: true });
  } catch (err) {
    // ignore observation errors
  }

  // Stop observing after 15 seconds to avoid long running observers
  setTimeout(() => {
    try {
      observer.disconnect();
    } catch (e) {
      // ignore
    }
  }, 15000);
}