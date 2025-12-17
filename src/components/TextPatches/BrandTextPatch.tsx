/**
 * BrandTextPatch.tsx
 *
 * File-level:
 * Small client-side helper that replaces legacy mentions of the app name
 * ("Truck Manager") with the new brand name ("Trucktopia") in rendered text nodes.
 * This component is UI-less and retries briefly to catch late-rendered content.
 */

import React from 'react';

/**
 * Props interface
 * @description No props required for this helper component.
 */
interface Props {}

/**
 * normalizeBrand
 * @description If the provided element's textContent contains a leading
 * "Truck Manager" phrase, replace it with "Trucktopia". Returns true when
 * a replacement was performed.
 * @param el DOM element to inspect and possibly update.
 */
function normalizeBrand(el: Element): boolean {
  if (!el || !el.textContent) return false;
  const original = el.textContent.trim();

  // Common legacy variants that start the sentence with the old product name.
  const variants = [
    'Truck Manager',
    'Truck Manager —',
    'Truck Manager -',
    'Truck Manager:',
    'Truck Manager is',
    'Truck Manager — a',
    'Truck Manager - a'
  ];

  for (const v of variants) {
    if (original.startsWith(v)) {
      // Replace only the leading occurrence to preserve the rest of the sentence.
      const replaced = original.replace(/^Truck Manager\b/, 'Trucktopia');
      el.textContent = replaced;
      return true;
    }
  }

  return false;
}

/**
 * BrandTextPatch
 * @description React component that runs a short-lived DOM patch to update
 * legacy brand mentions on the client. It retries multiple times with an interval
 * to handle dynamically-rendered content.
 */
const BrandTextPatch: React.FC<Props> = () => {
  React.useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20;
    const interval = 250;
    let found = false;

    const run = () => {
      attempts += 1;
      // Narrow search to likely text containers to reduce cost
      const nodes = Array.from(document.querySelectorAll('p, div, span'));
      for (const n of nodes) {
        if (normalizeBrand(n)) {
          found = true;
        }
      }

      if (found || attempts >= maxAttempts) {
        if (timer) window.clearInterval(timer);
      }
    };

    // initial immediate run then intervaled retries
    run();
    let timer = window.setInterval(run, interval);

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return null;
};

export default BrandTextPatch;