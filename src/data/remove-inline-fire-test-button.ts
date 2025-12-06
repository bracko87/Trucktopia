/**
 * remove-inline-fire-test-button.ts
 *
 * File-level:
 * Minimal client-side module to remove a very specific stray debug button that
 * may be injected into the DOM: the "Fire2" test button with aria-label/title
 * "Fire (test)" or visible text "Fire2".
 *
 * Purpose:
 * - Keep UI/layout unchanged.
 * - Target only the exact debug/test button so no other UI is affected.
 * - Run as a harmless side-effect module (import this from App.tsx).
 */

/**
 * isCandidateButton
 * @description Check whether a given button element matches the debug test button we want removed.
 * @param {HTMLButtonElement} btn Button element to test
 * @returns {boolean} True if the button appears to be the debug "Fire2" test button
 */
function isCandidateButton(btn: HTMLButtonElement): boolean {
  try {
    const aria = (btn.getAttribute('aria-label') || '').trim();
    const title = (btn.getAttribute('title') || '').trim();
    const text = (btn.textContent || '').trim();
    // Match by aria-label/title or by exact visible label text "Fire2"
    if (aria === 'Fire (test)' || title === 'Fire (test)') return true;
    if (text === 'Fire2') return true;
    // Also match the common class pattern just in case (keeps match narrow)
    const cls = btn.className || '';
    if (cls.includes('bg-rose-600') && cls.includes('text-white') && text === 'Fire2') return true;
  } catch {
    // ignore errors and treat as non-candidate
  }
  return false;
}

/**
 * removeMatchingButtons
 * @description Remove all buttons that match isCandidateButton.
 */
function removeMatchingButtons(): void {
  try {
    const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
    let removed = 0;
    buttons.forEach((btn) => {
      if (isCandidateButton(btn)) {
        btn.remove();
        removed += 1;
      }
    });
    if (removed && process && process.env && process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug(`[remove-inline-fire-test-button] removed ${removed} stray test button(s)`);
    }
  } catch (e) {
    // swallow errors - this module must never break the app
    // eslint-disable-next-line no-console
    console.error('[remove-inline-fire-test-button] error', e);
  }
}

/**
 * startObserver
 * @description Observe DOM changes for a short period to catch late-inserted buttons.
 */
function startObserver(): void {
  if (typeof MutationObserver === 'undefined') {
    return;
  }
  const observer = new MutationObserver((mutations, obs) => {
    let found = false;
    for (const m of mutations) {
      if (!m.addedNodes) continue;
      m.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (node.tagName === 'BUTTON' && isCandidateButton(node as HTMLButtonElement)) {
          (node as HTMLButtonElement).remove();
          found = true;
        } else {
          // also scan inside the added node for nested buttons
          const nested = Array.from(node.querySelectorAll ? node.querySelectorAll('button') : []);
          nested.forEach((nb) => {
            if (isCandidateButton(nb as HTMLButtonElement)) {
              (nb as HTMLButtonElement).remove();
              found = true;
            }
          });
        }
      });
    }
    // If we removed something, run a broader scan as well
    if (found) removeMatchingButtons();
  });

  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  });

  // Stop observing after 12s to avoid performance cost
  setTimeout(() => {
    try { observer.disconnect(); } catch {}
  }, 12_000);
}

/**
 * boot
 * @description Entry point: run once DOM is ready (or immediately if already).
 */
function boot(): void {
  try {
    removeMatchingButtons();
    startObserver();
  } catch {
    // ignore
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // run on next tick so other scripts can settle
    setTimeout(boot, 0);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once: true });
  }
}

export {};