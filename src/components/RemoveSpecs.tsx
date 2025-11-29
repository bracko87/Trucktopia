/**
 * src/components/RemoveSpecs.tsx
 *
 * @file UI-only runtime sanitizer that removes specification-like blocks from DOM.
 *
 * Purpose:
 * - Aggressively (but safely) remove UI fragments that contain multiple specification lines,
 *   e.g. Capacity, Engine, Fuel, Durability, Reliability, Max payload.
 * - Use a MutationObserver + debounce to catch lazy-rendered content (modals, lists, tooltips).
 *
 * Notes:
 * - This component performs UI-side removal only. It does not modify or persist data.
 * - It tries to be conservative by requiring multiple keyword matches before removing.
 * - Logs removals in development mode to help verify behavior.
 */

import React, { useEffect } from 'react';

/**
 * List of keywords to look for in specification blocks.
 * If an element contains several of these, we consider it a spec block.
 */
const SPEC_KEYWORDS = [
  'capacity',
  'max payload',
  'engine',
  'fuel',
  'fuel consumption',
  'durability',
  'reliability',
  'hp',
  'km/h',
  'kW',
  'ps',
  'payload'
];

/**
 * sanityCheckElement
 * @description Ensure the element is safe to remove (avoid html/body/head).
 * @param el Element
 * @returns boolean
 */
function sanityCheckElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (!tag) return false;
  if (tag === 'html' || tag === 'body' || tag === 'head') return false;
  return true;
}

/**
 * removeAncestorSafely
 * @description Remove the most reasonable ancestor for the node: prefer grandparent -> parent -> node.
 * Avoid removing body/html.
 * @param node Element to base the removal on
 */
function removeAncestorSafely(node: Element) {
  try {
    if (!sanityCheckElement(node)) return;
    const parent = node.parentElement;
    const grand = parent?.parentElement;

    if (grand && sanityCheckElement(grand)) {
      grand.remove();
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('RemoveSpecs: removed grandparent for', node, grand);
      }
      return;
    }

    if (parent && sanityCheckElement(parent)) {
      parent.remove();
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('RemoveSpecs: removed parent for', node, parent);
      }
      return;
    }

    node.remove();
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('RemoveSpecs: removed node', node);
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('RemoveSpecs.removeAncestorSafely error', err);
    }
  }
}

/**
 * textMatchesKeywordCount
 * @description Count how many distinct specification keywords appear in the element's text.
 * @param el Element
 * @returns number of keyword matches
 */
function textMatchesKeywordCount(el: Element): number {
  try {
    const text = (el.textContent || '').toLowerCase();
    if (!text) return 0;
    let count = 0;
    for (const kw of SPEC_KEYWORDS) {
      if (text.includes(kw)) count++;
    }
    return count;
  } catch {
    return 0;
  }
}

/**
 * detectAndRemoveSpecBlocks
 * @description Scan the DOM for elements that look like spec blocks and remove them.
 * Heuristic: element containing at least `threshold` distinct keywords.
 */
function detectAndRemoveSpecBlocks(threshold = 3) {
  try {
    // Look for common container types
    const nodes = Array.from(document.querySelectorAll('div, section, article, li, p, span'));

    for (const n of nodes) {
      // small optimization: only examine nodes that contain at least one of the keywords
      const text = (n.textContent || '').toLowerCase();
      if (!text) continue;

      // Quick check: does text include any of the keywords?
      let hasAny = false;
      for (const kw of SPEC_KEYWORDS) {
        if (text.includes(kw)) {
          hasAny = true;
          break;
        }
      }
      if (!hasAny) continue;

      const matches = textMatchesKeywordCount(n);

      // Additional heuristic: the snippet you provided often sits in a grid/flex small text block.
      const classList = (n.className || '').toString().toLowerCase();
      const hasGridClass = classList.includes('grid') || classList.includes('flex') || classList.includes('grid-cols');

      // Require either matches >= threshold OR (matches >= 2 and looks like a compact grid/flex)
      const considerRemoval = matches >= threshold || (matches >= 2 && hasGridClass);

      if (considerRemoval) {
        removeAncestorSafely(n);
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('RemoveSpecs.detectAndRemoveSpecBlocks error', err);
    }
  }
}

/**
 * RemoveSpecs
 * @description UI-less React component that removes specification/capacity blocks at runtime.
 */
const RemoveSpecs: React.FC = () => {
  useEffect(() => {
    // Run initial scan
    detectAndRemoveSpecBlocks();

    // Debounced handler for mutations
    let scheduled = false;
    const scheduleScan = () => {
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => {
        detectAndRemoveSpecBlocks();
        scheduled = false;
      }, 120);
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          scheduleScan();
          break;
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Also run a scan on visibilitychange (helps when content is injected while in background)
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        detectAndRemoveSpecBlocks();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    // Cleanup
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibilityHandler);
    };
  }, []);

  return null;
};

export default RemoveSpecs;