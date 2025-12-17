/**
 * TotalTrucksTextPatch.tsx
 *
 * File-level:
 * Small client-side helper that patches any lingering DOM text nodes that still show the
 * old label "Total Trucks (global / yours)" and replaces them with the updated label
 * "Total Trucks (active in game)". This is a lightweight, UI-less component intended
 * to run only in the browser and correct text rendered by other components or legacy HTML.
 */

import React from 'react';

/**
 * Props interface
 * @description No props required for this helper component.
 */
interface Props {}

/**
 * normalizeText
 * @description Replace known variants of the old label in the provided element's textContent.
 * @param el DOM element to inspect and possibly update.
 */
function normalizeText(el: Element) {
  if (!el || !el.textContent) return false;
  const original = el.textContent.trim();

  // Known legacy variants to replace
  const variants = [
    'Total Trucks (global / yours)',
    'Total Trucks (global/yours)',
    'Total Trucks (global /yours)',
    'Total Trucks (global/ yours)',
    'Total Trucks (global / yours)' // exact match repeated for safety
  ];

  if (variants.includes(original)) {
    el.textContent = 'Total Trucks (active in game)';
    return true;
  }

  return false;
}

/**
 * TotalTrucksTextPatch
 * @description React component that runs a short-lived DOM patch to replace legacy text labels.
 *              It retries multiple times with a small interval to handle components that render later.
 */
const TotalTrucksTextPatch: React.FC<Props> = () => {
  React.useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20;
    const interval = 250;
    let found = false;

    const run = () => {
      attempts += 1;
      // Restrict search to elements that often carry small labels to reduce cost
      const nodes = Array.from(document.querySelectorAll('.text-xs, .text-sm, .text-base, .text-slate-400, .text-slate-500, .text-slate-400'));
      for (const n of nodes) {
        if (normalizeText(n)) {
          found = true;
        }
      }

      // As a fallback, if not found, scan all elements but only until max attempts
      if (!found) {
        const all = Array.from(document.querySelectorAll('div, span, p'));
        for (const el of all) {
          if (normalizeText(el)) {
            found = true;
            break;
          }
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

export default TotalTrucksTextPatch;
