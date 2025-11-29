/**
 * src/components/MarketRedirectListener.tsx
 *
 * Purpose:
 * - Non-visual helper that tags and intercepts clicks on "Purchase Truck" type elements
 *   and navigates the SPA to the Vehicle Market in "trucks-only" view:
 *     /vehicle-market?show=trucks&tab=new-trucks&truckCategory=small
 *
 * Notes:
 * - Mount this component once at the app root (App.tsx). It performs DOM scanning + observation
 *   so dynamically injected controls are supported.
 * - Does not alter layout or visual styling, returns null.
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

/**
 * MarketRedirectListener
 * @description A small non-visual React component that:
 *  - Scans the DOM for actionable elements that indicate a "Purchase Truck" intent
 *  - Tags such elements so dynamically inserted ones are handled
 *  - Intercepts clicks and navigates SPA-style to vehicle market with show=trucks
 *
 * The heuristics are conservative (text and aria-label inspection). If you have a specific
 * purchase-button component, you can add data-open-market="new-truck-small" or
 * aria-label="Purchase Truck" to the element for deterministic behavior.
 */
const MarketRedirectListener: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    /** ATTR_NAME constant for DOM tagging. */
    const ATTR = 'data-open-market';
    /** The attribute value we use on elements we want to handle. */
    const TARGET_VALUE = 'new-truck-small';
    /** Destination SPA path (trucks-only market view). */
    const TARGET_URL = '/vehicle-market?show=trucks&tab=new-trucks&truckCategory=small';

    /**
     * scanAndTag
     * @description Heuristically find candidate interactive elements (button, a, [role=button])
     * and tag them with ATTR so future clicks are detected. This helps with dynamically added elements.
     */
    const scanAndTag = () => {
      const nodes = Array.from(document.querySelectorAll('button, a, [role="button"]')) as HTMLElement[];
      for (const n of nodes) {
        if (n.hasAttribute(ATTR)) continue;
        const txt = (n.textContent || '').trim().toLowerCase();
        const aria = (n.getAttribute('aria-label') || '').trim().toLowerCase();
        // Heuristic: either exact "purchase truck", aria-label containing those words,
        // or text containing both 'purchase' and 'truck' -> tag as actionable.
        if (
          txt === 'purchase truck' ||
          aria === 'purchase truck' ||
          (txt.includes('purchase') && txt.includes('truck')) ||
          (aria.includes('purchase') && aria.includes('truck'))
        ) {
          n.setAttribute(ATTR, TARGET_VALUE);
        }
      }
    };

    // Run initial scan
    scanAndTag();

    // Re-scan when DOM mutates (dynamic content)
    const mo = new MutationObserver(() => {
      scanAndTag();
    });
    mo.observe(document.body, { subtree: true, childList: true });

    /**
     * onClick
     * @description Document-level click handler (capture) — if click originates from
     * an element we tagged, navigate the SPA to the market view.
     */
    const onClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const el = target.closest(`[${ATTR}="${TARGET_VALUE}"]`) as HTMLElement | null;
      if (!el) return;
      // Prevent link default navigation (we want SPA navigation)
      ev.preventDefault();
      try {
        navigate(TARGET_URL);
      } catch (err) {
        // Fallback to full redirect if react-router fails for any reason
        // eslint-disable-next-line no-console
        console.error('MarketRedirectListener navigate error', err);
        window.location.href = TARGET_URL;
      }
    };

    // Use capture so we can intercept clicks before other handlers stopPropagation
    document.addEventListener('click', onClick, true);

    return () => {
      document.removeEventListener('click', onClick, true);
      mo.disconnect();
    };
  }, [navigate]);

  return null;
};

export default MarketRedirectListener;