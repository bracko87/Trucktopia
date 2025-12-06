/**
 * PriceTextReplacer.tsx
 *
 * File-level:
 *  - Lightweight deterministic helper to condense the previously inserted long
 *    price sentence into a concise numeric value string.
 *
 * Responsibilities:
 *  - Find elements that were previously replaced or that live in the
 *    "Estimated Price" context and set their visible textContent to a short
 *    numeric value (no layout or style changes).
 *  - Run immediately on import and persistently observe DOM mutations so the
 *    condensed value persists across React updates.
 *
 * Safety:
 *  - Only updates element.textContent (no classes, attributes or structure are
 *    modified except for an unobtrusive data attribute used for idempotency).
 *  - Targets by context and by a safe marker (data-tm-price-replaced) to reduce
 *    accidental replacements.
 */
import React from 'react';

/**
 * CONDENSED_VALUE
 * @description The concise numeric value to display instead of the long sentence.
 *              Change this if you prefer a different formatting.
 */
const CONDENSED_VALUE = '600.00$ — 1.800.000$';

/**
 * isCurrencyLike
 * @description Heuristically check whether a string looks like currency/price.
 * @param txt candidate string
 * @returns boolean
 */
function isCurrencyLike(txt: string | null | undefined): boolean {
  if (!txt) return false;
  const t = txt.trim();
  if (!t) return false;
  // Accept common currency patterns (e.g. $80.000, €31,500, 12000$)
  const moneyRegex = /[\\$\\€\\£]?\\s?\\d{1,3}([.,\\s]\\d{3})*(?:[.,]\\d+)?\\s?[\\$\\€\\£]?/;
  const digits = /\\d/;
  return !!t && digits.test(t) && moneyRegex.test(t);
}

/**
 * findEstimatedPriceLabels
 * @description Find label nodes that include "Estimated Price" text.
 * @returns HTMLElement[] array of label elements
 */
function findEstimatedPriceLabels(): HTMLElement[] {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('*')).filter((el) => {
    const text = (el.textContent || '').trim().toLowerCase();
    return text.includes('estimated price');
  });
  return candidates;
}

/**
 * findPriceNodeNearby
 * @description Given a label element, attempt to find the associated price node
 *              by checking siblings and children of the label's parent.
 * @param labelEl label element
 * @returns HTMLElement | null
 */
function findPriceNodeNearby(labelEl: HTMLElement): HTMLElement | null {
  if (!labelEl) return null;

  // Prefer nextElementSibling
  const next = labelEl.nextElementSibling as HTMLElement | null;
  if (next && (isCurrencyLike(next.textContent) || next.dataset.tmPriceReplaced === 'true')) return next;

  // Search parent for an element that looks like currency
  const parent = labelEl.parentElement;
  if (parent) {
    // Look for specially styled candidate
    const candidate = parent.querySelector<HTMLElement>('.text-xl.font-bold.text-amber-400');
    if (candidate && (isCurrencyLike(candidate.textContent) || candidate.dataset.tmPriceReplaced === 'true')) return candidate;

    // Fallback: any child that looks like currency
    const childCurrency = Array.from(parent.querySelectorAll<HTMLElement>('*')).find((c) =>
      isCurrencyLike(c.textContent) || c.dataset.tmPriceReplaced === 'true'
    );
    if (childCurrency) return childCurrency;
  }

  // As last resort check previous sibling
  const prev = labelEl.previousElementSibling as HTMLElement | null;
  if (prev && (isCurrencyLike(prev.textContent) || prev.dataset.tmPriceReplaced === 'true')) return prev;

  return null;
}

/**
 * replaceWithCondensedValue
 * @description Replace the target element's visible text with the condensed value
 *              if not already condensed. Mark with data-tm-price-condensed="true".
 * @param el target element
 * @returns boolean whether replacement happened
 */
function replaceWithCondensedValue(el: HTMLElement | null): boolean {
  if (!el) return false;
  try {
    // If already condensed, skip
    if (el.dataset.tmPriceCondensed === 'true') return false;

    // Only replace if it either contains the long sentence or looks like currency
    const current = (el.textContent || '').trim();
    const isAlreadyLongSentence = current.includes('Price can go between') || current.includes('depends on area');
    if (!isAlreadyLongSentence && !isCurrencyLike(current) && el.dataset.tmPriceReplaced !== 'true') {
      // Not a target candidate
      return false;
    }

    // Replace visible text only
    el.textContent = CONDENSED_VALUE;
    try {
      el.dataset.tmPriceCondensed = 'true';
    } catch {
      // ignore dataset write failures
    }
    // Also keep tmPriceReplaced marker if not present
    try {
      if (!el.dataset.tmPriceReplaced) el.dataset.tmPriceReplaced = 'true';
    } catch {
      // ignore
    }

    console.info('[PriceTextReplacer] condensed price for element', el);
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[PriceTextReplacer] replaceWithCondensedValue error', err);
    return false;
  }
}

/**
 * runReplacementPass
 * @description Single pass to find candidate price elements and condense them.
 * @returns number of replacements performed
 */
function runReplacementPass(): number {
  if (typeof document === 'undefined') return 0;
  let replaced = 0;

  try {
    // 1) First, prefer elements that were already marked by the earlier replacer
    const marked = Array.from(document.querySelectorAll<HTMLElement>('[data-tm-price-replaced="true"]'));
    marked.forEach((el) => {
      if (replaceWithCondensedValue(el)) replaced += 1;
    });

    // 2) Then, detect by context: labels that mention "Estimated Price"
    const labels = findEstimatedPriceLabels();
    labels.forEach((label) => {
      const priceNode = findPriceNodeNearby(label);
      if (priceNode && replaceWithCondensedValue(priceNode)) replaced += 1;
    });

    // 3) Fallback: find currency-like nodes which are not yet condensed but are close to "Estimated Price"
    if (replaced === 0) {
      const candidates = Array.from(document.querySelectorAll<HTMLElement>('*')).filter((el) => {
        const txt = (el.textContent || '').trim();
        return isCurrencyLike(txt) && el.dataset.tmPriceCondensed !== 'true';
      });

      candidates.forEach((el) => {
        // confirm context: check up to 4 ancestor levels for "Estimated Price" label
        let anc: HTMLElement | null = el.parentElement;
        let depth = 0;
        let contextFound = false;
        while (anc && depth < 5) {
          if ((anc.textContent || '').toLowerCase().includes('estimated price')) {
            contextFound = true;
            break;
          }
          anc = anc.parentElement;
          depth += 1;
        }
        if (contextFound) {
          if (replaceWithCondensedValue(el)) replaced += 1;
        }
      });
    }

    if (replaced > 0) {
      console.info(`[PriceTextReplacer] condensed ${replaced} price element(s).`);
    }

    return replaced;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[PriceTextReplacer] runReplacementPass error', err);
    return replaced;
  }
}

/**
 * initCondensingReplacer
 * @description Initialize persistent replacer:
 *  - Run an immediate pass
 *  - Observe DOM mutations and re-run passes on changes
 *  - Keep a periodic fallback run to handle edge-cases
 */
function initCondensingReplacer() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    // Initial pass
    runReplacementPass();

    // MutationObserver to reapply replacements on DOM updates
    const root = document.body || document.documentElement;
    const observer = new MutationObserver(() => {
      // schedule via rAF to avoid thrash
      if (!window.requestAnimationFrame) {
        runReplacementPass();
        return;
      }
      window.requestAnimationFrame(() => {
        runReplacementPass();
      });
    });

    observer.observe(root, { childList: true, subtree: true, characterData: true });

    // Periodic fallback
    const intervalId = window.setInterval(() => {
      runReplacementPass();
    }, 1000); // every second

    // Expose debug stop in dev to allow manual teardown
    try {
      // @ts-ignore
      window.__tmPriceReplacerCondense = {
        stop: () => {
          observer.disconnect();
          clearInterval(intervalId);
          // eslint-disable-next-line no-console
          console.info('[PriceTextReplacer] stopped condensing replacer.');
        }
      };
    } catch {
      // ignore
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[PriceTextReplacer] initialization error', err);
  }
}

// Run on import in browser contexts so the change is applied without mounting the component
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  try {
    initCondensingReplacer();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[PriceTextReplacer] import-time init failed', err);
  }
}

/**
 * Default export: UI-less component kept for compatibility with App imports.
 */
export default function PriceTextReplacer(): null {
  React.useEffect(() => {
    // Nothing required on mount; import-time side-effects already run.
  }, []);
  return null;
}