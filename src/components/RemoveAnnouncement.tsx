/**
 * RemoveAnnouncement.tsx
 *
 * File-level: Small UI-less helper that removes a specific announcement line from the DOM.
 *
 * Purpose:
 * - Detect and remove the one-line announcement:
 *   "Trucks and trailers are now separated into two tabs for clearer workflows."
 * - Defensive: uses a MutationObserver to remove the node if it is added later by dynamic UI code.
 * - Non-visual: returns null and only performs DOM side-effects.
 */

import React, { useEffect } from 'react';

interface Props {}

/**
 * RemoveAnnouncement
 *
 * Component-level:
 * - Runs a single effect which finds any elements whose trimmed textContent exactly matches
 *   the targeted announcement and removes them from the document.
 * - Uses a MutationObserver so dynamically injected occurrences are also removed.
 *
 * Note: Intentionally small and isolated so it can be safely mounted anywhere in the app tree.
 */
const RemoveAnnouncement: React.FC<Props> = () => {
  useEffect(() => {
    /**
     * phrase
     * @description Exact announcement text we want to remove.
     */
    const phrase = 'Trucks and trailers are now separated into two tabs for clearer workflows.';

    /**
     * removeMatchingNodes
     * @description Scan the document for text nodes wrapped in common elements and remove
     *              any element whose trimmed textContent exactly equals the phrase.
     */
    const removeMatchingNodes = () => {
      try {
        const candidates = Array.from(document.querySelectorAll('div, p, span, li, small'));
        candidates.forEach((el) => {
          if (el && el.textContent && el.textContent.trim() === phrase) {
            el.remove();
          }
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('RemoveAnnouncement: failed to remove nodes', err);
      }
    };

    // initial run
    removeMatchingNodes();

    // Observe DOM changes so dynamically rendered nodes are also removed
    const observer = new MutationObserver(() => {
      removeMatchingNodes();
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
};

export default RemoveAnnouncement;