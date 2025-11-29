/**
 * RuntimeSpecLocator.tsx
 *
 * Purpose:
 * - Development-only helper to locate DOM elements that render specific text
 *   (e.g. "Vehicle Data", "Max speed", "Maintenance Group") and print the
 *   nearest React component/fiber chain to the browser console.
 *
 * Notes:
 * - Runs only when process.env.NODE_ENV !== 'production'.
 * - Non-destructive: only inspects DOM and logs information. Highlights matches
 *   briefly to help visually locate them.
 */

import React, { useEffect, useState } from 'react';

/**
 * Extend HTMLElement to allow reading framework-internal keys (react fiber).
 */
declare global {
  interface HTMLElement {
    [key: string]: any;
  }
}

/**
 * Props for the component (none required).
 */
interface RuntimeSpecLocatorProps {}

/**
 * getReactFiberKey
 * @description Find the hidden React internal key on an element (if present).
 * @param el HTMLElement
 * @returns the property key string or null
 */
function getReactFiberKey(el: HTMLElement): string | null {
  const keys = Object.keys(el);
  for (const k of keys) {
    if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) {
      return k;
    }
  }
  return null;
}

/**
 * getComponentNameFromFiber
 * @description Helper to derive a human-friendly component name from a fiber node.
 * @param fiber any React Fiber node
 * @returns string | null
 */
function getComponentNameFromFiber(fiber: any): string | null {
  if (!fiber) return null;
  const t = fiber.type || fiber.elementType;
  if (!t) return null;
  if (typeof t === 'string') return t; // host component (div, span...)
  return t.displayName || t.name || null;
}

/**
 * RuntimeSpecLocator
 * @description Development helper UI that scans the DOM for matching texts,
 * highlights matches and logs React fiber/component chain for each match.
 */
const RuntimeSpecLocator: React.FC<RuntimeSpecLocatorProps> = () => {
  // Do not render at all in production
  if (process.env.NODE_ENV === 'production') return null;

  const [open, setOpen] = useState<boolean>(false);
  const [lastResults, setLastResults] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>('Vehicle Data,Max speed,Maintenance Group');

  /**
   * findMatchingNodes
   * @description Searches the document for text matches. Returns found elements.
   * @param texts array of text fragments to match (case-sensitive partial match)
   */
  function findMatchingNodes(texts: string[]): HTMLElement[] {
    const matches: HTMLElement[] = [];
    // Use TreeWalker to iterate text nodes for better performance in large DOMs
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    const visited = new Set<HTMLElement>();
    let node: Node | null = walker.nextNode();
    while (node) {
      try {
        const txt = node.textContent || '';
        for (const t of texts) {
          if (t && txt.includes(t)) {
            const el = node.parentElement as HTMLElement | null;
            if (el && !visited.has(el)) {
              matches.push(el);
              visited.add(el);
            }
          }
        }
      } catch (e) {
        // ignore
      }
      node = walker.nextNode();
    }
    return matches;
  }

  /**
   * highlightElement
   * @description Briefly apply a visual outline to the element to help locate it.
   * @param el HTMLElement
   */
  function highlightElement(el: HTMLElement) {
    const prevOutline = el.style.outline;
    el.style.outline = '3px solid rgba(96,165,250,0.9)'; // blue-400
    el.style.transition = 'outline 150ms ease-in-out';
    setTimeout(() => {
      el.style.outline = prevOutline;
    }, 2500);
  }

  /**
   * analyseAndLog
   * @description For each found element: highlight, log outerHTML and attempt to
   * walk the react fiber chain to find the nearest component owners.
   * @param els HTMLElement[]
   */
  function analyseAndLog(els: HTMLElement[]) {
    console.groupCollapsed(`[RuntimeSpecLocator] Found ${els.length} elements matching search terms`);
    els.forEach((el, idx) => {
      console.group(`Match ${idx + 1}`);
      try {
        console.log('outerHTML:', el.outerHTML);
        highlightElement(el);

        // Try to find the react internal key on the element or its ancestors
        let cur: HTMLElement | null = el;
        let foundFiber: any = null;
        let reactKey: string | null = null;
        while (cur && !foundFiber) {
          reactKey = getReactFiberKey(cur);
          if (reactKey) {
            foundFiber = cur[reactKey];
            break;
          }
          cur = cur.parentElement;
        }
        if (!foundFiber) {
          console.warn('No React internal fiber found on element or parents. Try expanding UI or inspect a different node.');
        } else {
          // Walk up the fiber chain and collect component names
          const chain: string[] = [];
          let f = foundFiber;
          let safety = 0;
          while (f && safety < 200) {
            const name = getComponentNameFromFiber(f) || `host(tag:${f.tag})`;
            chain.push(name);
            f = f.return;
            safety++;
          }
          console.log('React fiber chain (closest → root):', chain);
        }
      } catch (err) {
        console.error('Error analysing match', err);
      }
      console.groupEnd();
    });
    console.groupEnd();
  }

  /**
   * runScan
   * @description Main entrypoint to run a full scan using the searchText state.
   */
  function runScan() {
    const terms = searchText.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const results = findMatchingNodes(terms);
      setLastResults(results.length);
      analyseAndLog(results);
      if (results.length === 0) {
        console.info('[RuntimeSpecLocator] No matches found for:', terms);
        // Try a more lenient search (lowercase)
        const lowerTerms = terms.map(t => t.toLowerCase());
        const allEls = Array.from(document.querySelectorAll('body *')) as HTMLElement[];
        const fallback = allEls.filter(el => {
          try {
            return Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && (n.textContent || '').toLowerCase().includes(lowerTerms[0]));
          } catch {
            return false;
          }
        }).slice(0, 10);
        if (fallback.length) {
          console.info('[RuntimeSpecLocator] Fallback found some potential nodes (first 10):');
          analyseAndLog(fallback);
        }
      }
    } catch (e) {
      console.error('[RuntimeSpecLocator] Scan failed', e);
    }
  }

  // Auto-run scan on mount (helpful when panel is not used)
  useEffect(() => {
    // Delay briefly to let page render interactive panels/modals
    const t = setTimeout(() => {
      try {
        runScan();
      } catch (e) {
        // Ignore
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <div className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg shadow-lg w-72">
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
          <div className="text-xs font-medium">Spec Locator (dev)</div>
          <button
            onClick={() => setOpen(!open)}
            aria-label="Toggle Spec Locator panel"
            className="text-xs text-slate-400 hover:text-white"
          >
            {open ? 'Close' : 'Open'}
          </button>
        </div>

        {open && (
          <div className="p-3 space-y-2">
            <div className="text-xs text-slate-400">Search terms (comma separated)</div>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none"
            />

            <div className="flex gap-2 mt-2">
              <button
                onClick={runScan}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 rounded"
              >
                Scan
              </button>
              <button
                onClick={() => {
                  // Log instructions and last results
                  console.info('[RuntimeSpecLocator] Last result count:', lastResults);
                  alert(`Last scan found ${lastResults} matches. Check console for details.`);
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white text-sm py-1 px-2 rounded border border-slate-600"
              >
                Info
              </button>
            </div>

            <div className="text-xs text-slate-400 mt-2">
              Matches found: <span className="text-white font-medium">{lastResults}</span>
            </div>

            <div className="text-xs text-slate-500 mt-1">
              Tip: Open DevTools → Console to view grouped logs with component/fiber chains.
            </div>
          </div>
        )}

        {!open && (
          <div className="p-2 text-xs text-slate-400">Click "Open" for options — auto-scan ran on mount.</div>
        )}
      </div>
    </div>
  );
};

export default RuntimeSpecLocator;