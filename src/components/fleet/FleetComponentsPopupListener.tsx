/**
 * FleetComponentsPopupListener.tsx
 *
 * Background listener that intercepts clicks on inline "More Details" buttons
 * (aria-label="Open component details") and opens the PurchasedComponentsModal
 * on Fleet pages only. It tries to close other competing dialogs and prevents
 * the default details popup from opening.
 *
 * Responsibilities:
 * - Detect clicks on the "More Details" inline control inside fleet purchased truck cards.
 * - Prevent propagation so only the components popup opens.
 * - Parse the nearest displayed "Condition: N%" label to obtain the truck's current condition.
 * - Render PurchasedComponentsModal with parsed initial values.
 *
 * Important constraints honoured:
 * - Does NOT modify any TruckCard files.
 * - Only activates on Fleet pages (pathname includes '/garage', '/trucks', '/fleet' or '/fleet-control').
 */

import React from 'react';
import PurchasedComponentsModal from './PurchasedComponentsModal';

/**
 * Pathnames considered "Fleet pages".
 */
const FLEET_PATH_PARTS = ['/garage', '/trucks', '/fleet', '/fleet-control'];

/**
 * isFleetPath
 * @description Check whether current location pathname looks like a Fleet page.
 */
function isFleetPath(pathname: string) {
  return FLEET_PATH_PARTS.some((p) => pathname.includes(p));
}

/**
 * findClosestConditionText
 * @description Given a clicked element, traverse up the DOM to find a text node
 *              or element which contains "Condition: N%". Returns parsed number or null.
 */
function findClosestConditionValue(start: HTMLElement | null): number | null {
  if (!start) return null;
  let node: HTMLElement | null = start;
  const maxDepth = 8;
  let depth = 0;

  while (node && depth < maxDepth) {
    // Search this subtree for "Condition: N%"
    const textMatch = node.innerText?.match(/Condition[:\s]*([0-9]{1,3})\s*%/i);
    if (textMatch && textMatch[1]) {
      const n = Number(textMatch[1]);
      if (!Number.isNaN(n)) return Math.max(0, Math.min(100, n));
    }

    // If not found, try siblings and children
    // Look into children
    for (const child of Array.from(node.querySelectorAll('*'))) {
      const m = child.textContent?.match(/Condition[:\s]*([0-9]{1,3})\s*%/i);
      if (m && m[1]) {
        const n = Number(m[1]);
        if (!Number.isNaN(n)) return Math.max(0, Math.min(100, n));
      }
    }

    node = node.parentElement;
    depth += 1;
  }

  return null;
}

/**
 * tryCloseOtherDialogs
 * @description Best-effort attempt to close other open dialogs by clicking their
 *              close buttons if present. This keeps only the components modal visible.
 */
function tryCloseOtherDialogs() {
  try {
    // Find elements that look like modal close buttons (aria-label or button text)
    const possibleCloseSelectors = [
      '[aria-label="Close"]',
      '[aria-label="Cancel"]',
      '[aria-label="Close dialog"]',
      '[aria-label="Close details"]',
      'button[aria-label*="close" i]',
      'button:contains("Cancel")', // non-standard for querySelector; will not match
    ];

    // Simple approach: try to find any element with role=dialog and a button inside that can close it
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
    for (const d of dialogs) {
      // Skip if this dialog is the components modal we own (we cannot easily detect it here).
      // Try to find a close button inside dialog and click it.
      const closeBtn =
        d.querySelector('button[aria-label="Close"], button[aria-label="Cancel"], button[aria-label*="close" i], button:matches([title*="close" i])') as HTMLElement | null;

      if (closeBtn) {
        closeBtn.click();
      } else {
        // try to click X symbol buttons
        const a = d.querySelector('button');
        if (a && a.textContent && a.textContent.trim().length <= 3) {
          (a as HTMLElement).click();
        }
      }
    }
  } catch {
    // ignore any DOM exceptions (best-effort only)
  }
}

/**
 * FleetComponentsPopupListener
 * @description Mounts a capturing click listener and renders PurchasedComponentsModal.
 */
const FleetComponentsPopupListener: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [overallCondition, setOverallCondition] = React.useState<number>(100);
  const [truckId, setTruckId] = React.useState<string | null>(null);

  React.useEffect(() => {
    /**
     * onDocumentClick
     * @description Capture phase handler to intercept inline "More Details" clicks.
     */
    const onDocumentClick = (ev: MouseEvent) => {
      // Only capture left-clicks
      if (ev.button !== 0) return;

      // Ensure target is an Element
      const target = ev.target as HTMLElement | null;
      if (!target) return;

      // Check the control: aria-label or exact text match for "More Details"
      const isOpenDetailsControl =
        (target.getAttribute && target.getAttribute('aria-label') === 'Open component details')
        || (target.textContent && target.textContent.trim() === 'More Details');

      if (!isOpenDetailsControl) return;

      // Only act on Fleet pages
      if (!isFleetPath(window.location.pathname)) return;

      // Prevent other handlers from reacting (prevents full truck details popup)
      ev.stopPropagation();
      ev.preventDefault();

      // First try to close other dialogs so only our modal is visible
      tryCloseOtherDialogs();

      // Attempt to find current condition value in DOM
      // Start from the clicked element and search upwards
      const condition = findClosestConditionValue(target);

      setOverallCondition(condition ?? 100);

      // Try to get an id: look for a data-truck-id or id attribute in ancestors
      let node: HTMLElement | null = target;
      let depth = 0;
      let foundId: string | null = null;
      while (node && depth < 8) {
        const attrId = node.getAttribute('data-truck-id') || node.getAttribute('data-id') || node.getAttribute('data-id-truck');
        if (attrId) {
          foundId = attrId;
          break;
        }
        if (node.id && node.id.toLowerCase().startsWith('truck')) {
          foundId = node.id;
          break;
        }
        node = node.parentElement;
        depth += 1;
      }
      setTruckId(foundId);

      // Open modal
      setIsOpen(true);
    };

    // Use capture phase so we intercept before React handlers
    document.addEventListener('click', onDocumentClick, true);
    return () => {
      document.removeEventListener('click', onDocumentClick, true);
    };
  }, []);

  return (
    <>
      <PurchasedComponentsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        overallCondition={overallCondition}
        truckId={truckId}
      />
    </>
  );
};

export default FleetComponentsPopupListener;