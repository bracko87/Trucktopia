/**
 * RawJsonReplacer.tsx
 *
 * Client-only helper that finds raw JSON <pre> blocks which describe trailers
 * and replaces them with a friendly trailer technical details card.
 *
 * This implementation:
 * - Dynamically imports react-dom/client (createRoot) only on the client
 * - Observes the document for new <pre> nodes using MutationObserver
 * - Replaces the entire surrounding container when a preceding "Raw data" label
 *   is found (to avoid leaving the label visible)
 * - Marks processed nodes to avoid double-processing
 *
 * This file is intentionally self-contained and defensive so it can run in
 * environments where DOM APIs may be available only at runtime.
 */

import React from 'react';
import { Package, MapPin, Trash2 } from 'lucide-react';

/**
 * TrailerData
 * @description Minimal subset of trailer fields we care about for the card.
 */
export interface TrailerData {
  id?: string;
  brand?: string;
  model?: string;
  year?: number;
  condition?: number;
  capacity?: string | number;
  purchasePrice?: number;
  status?: string;
  deliveryEta?: string | null;
  deliveryHub?: { id?: string; name?: string } | string | null;
  specifications?: Record<string, any>;
  marketEntry?: Record<string, any>;
  image?: string;
  vehicleKind?: string;
  [key: string]: any;
}

/**
 * tryParseJson
 * @description Try to parse JSON from the given text. If strict parse fails,
 * attempt to extract the first {...} or [...] block and parse that.
 * @param text input string
 * @returns parsed object or null
 */
function tryParseJson(text: string): any | null {
  if (!text || typeof text !== 'string') return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // ignore
      }
    }
    const aStart = text.indexOf('[');
    const aEnd = text.lastIndexOf(']');
    if (aStart >= 0 && aEnd > aStart) {
      try {
        return JSON.parse(text.slice(aStart, aEnd + 1));
      } catch {
        // ignore
      }
    }
    return null;
  }
}

/**
 * isTrailerLike
 * @description Heuristic to determine whether the parsed JSON looks like a trailer object.
 * @param obj parsed JSON
 * @returns boolean
 */
function isTrailerLike(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const keys = new Set(Object.keys(obj));
  const indicators = [
    'trailerClass',
    'capacity',
    'tonnage',
    'axles',
    'length',
    'vehicleKind',
    'marketEntry',
    'specifications'
  ];
  if (obj.vehicleKind && String(obj.vehicleKind).toLowerCase().includes('trailer')) return true;
  if (obj.marketEntry && (obj.marketEntry.type === 'trailer' || String(obj.marketEntry?.type).toLowerCase().includes('trailer'))) return true;
  for (const k of indicators) {
    if (keys.has(k)) return true;
  }
  if ((keys.has('brand') || keys.has('model')) && keys.has('deliveryEta')) return true;
  return false;
}

/**
 * formatDateShort
 * @description Friendly local date/time string for ETA display
 * @param iso ISO date string
 */
function formatDateShort(iso?: string | null): string {
  if (!iso) return 'Unknown';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
}

/**
 * TrailerCardRenderer
 * @description Small React renderer for a trailer's essential details —
 * used when we mount a client root into a replaced <pre> node's container.
 */
const TrailerCardRenderer: React.FC<{ data: TrailerData }> = ({ data }) => {
  const brand = data.brand ?? data.marketEntry?.brand ?? 'Trailer';
  const model = data.model ?? data.marketEntry?.model ?? data.trailerClass ?? '';
  const year = data.year ?? data.marketEntry?.year ?? '—';
  const condition = typeof data.condition === 'number' ? `${data.condition}%` : (data.marketEntry?.condition ? `${data.marketEntry.condition}%` : '—');
  const capacity = data.capacity ?? data.specifications?.capacity ?? data.marketEntry?.specifications?.capacity ?? '—';
  const eta = data.deliveryEta ?? data.marketEntry?.estimatedDeliveryDate ?? null;
  const hub = typeof data.deliveryHub === 'string' ? data.deliveryHub : (data.deliveryHub?.name ?? data.deliveryHub?.id ?? data.marketEntry?.deliveryHub?.name ?? null);
  const image = data.image ?? data.marketEntry?.image ?? null;

  return (
    <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 w-full text-sm text-slate-200">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-20 h-12 rounded bg-slate-800 overflow-hidden flex items-center justify-center">
          {image ? (
            // eslint-disable-next-line jsx-a11y/img-redundant-alt
            // intentionally using a simple <img> for runtime display
            <img src={image} alt={`${brand} ${model}`} className="object-cover w-full h-full" />
          ) : (
            <div className="text-xs text-slate-400">No image</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <div className="text-sm font-semibold text-white truncate">{brand} {model ? `— ${model}` : ''}</div>
              <div className="text-xs text-slate-400 mt-1">Class: {String(data.trailerClass ?? (data.marketEntry?.trailerClass ?? '—'))}</div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">Year</div>
              <div className="text-sm text-white">{year}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>Condition: <span className="text-slate-200 ml-1">{condition}</span></div>
            <div>Capacity: <span className="text-slate-200 ml-1">{capacity}</span></div>
            <div>Location: <span className="text-slate-200 ml-1">{hub ?? '-'}</span></div>
            <div>ETA: <span className="text-slate-200 ml-1">{formatDateShort(eta)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * processPreElement
 * @description Inspect a <pre> node and, if it contains trailer JSON, replace it
 * with a mounted React card or fallback HTML. Also removes preceding "Raw data" labels
 * when present so the raw object is not left visible.
 * @param pre pre element
 * @param createRootFn optional createRoot function (if available)
 * @param createdRoots array to track created roots for cleanup
 */
async function processPreElement(pre: HTMLPreElement, createRootFn: ((el: Element) => any) | null, createdRoots: Array<{ root: any; container: Element }>) {
  try {
    if (pre.dataset.rawjsonReplaced === '1') return;

    const text = (pre.textContent || '').trim();
    if (!text) return;

    // Quick guard for JSON-like content
    if (!(text.startsWith('{') || text.startsWith('[') || text.includes('{'))) {
      return;
    }

    const parsed = tryParseJson(text);
    if (!parsed) return;
    if (!isTrailerLike(parsed)) return;

    // Create the new container that will hold the card
    const container = document.createElement('div');
    container.className = 'tm-trailer-specs-replaced';
    container.dataset.rawjsonReplaced = '1';

    // If a preceding sibling looks like the "Raw data" label, replace the parent
    // container (so the label is removed as well). This matches markup like:
    // <div><div class="text-xs">Raw data</div><pre>...</pre></div>
    const parent = pre.parentElement;
    const prev = pre.previousElementSibling;
    const prevText = prev?.textContent?.trim() ?? '';
    const looksLikeLabel = /raw\s*data/i.test(prevText);

    if (looksLikeLabel && parent && parent.parentElement) {
      // Replace the parent element (keeps layout) with our container
      parent.parentElement.replaceChild(container, parent);
    } else if (parent) {
      parent.replaceChild(container, pre);
    } else {
      pre.replaceWith(container);
    }

    // If we have createRoot, mount the React renderer
    if (createRootFn) {
      try {
        const root = createRootFn(container);
        root.render(React.createElement(TrailerCardRenderer, { data: parsed }));
        createdRoots.push({ root, container });
        return;
      } catch (err) {
        // If mounting fails, fall back to innerHTML below
        // eslint-disable-next-line no-console
        console.error('RawJsonReplacer: createRoot render failed', err);
      }
    }

    // Fallback minimal markup for environments without react-dom/client
    const brand = parsed.brand ?? parsed.marketEntry?.brand ?? 'Trailer';
    const model = parsed.model ?? parsed.marketEntry?.model ?? parsed.trailerClass ?? '';
    const etaStr = formatDateShort(parsed.deliveryEta ?? parsed.marketEntry?.estimatedDeliveryDate ?? null);
    const html = `
      <div class="bg-slate-700 rounded-lg p-3 border border-slate-600 text-sm text-slate-200">
        <div style="font-weight:600; margin-bottom:6px;">${String(brand)} ${model ? `— ${String(model)}` : ''}</div>
        <div style="font-size:12px;color:#94a3b8;">ETA: ${etaStr}</div>
        <div style="margin-top:6px;font-size:12px;color:#cbd5e1;">Client renderer unavailable — enable client bundle for full card.</div>
      </div>
    `;
    container.innerHTML = html;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('RawJsonReplacer: processPreElement error', err);
  }
}

/**
 * RawJsonReplacer
 * @description React component that mounts an observer to replace raw JSON <pre> blocks.
 */
const RawJsonReplacer: React.FC = () => {
  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let mounted = true;
    const createdRoots: Array<{ root: any; container: Element }> = [];
    let createRootFn: ((el: Element) => any) | null = null;

    /**
     * loadCreateRoot
     * @description Dynamically import react-dom/client and prepare createRoot function.
     */
    const loadCreateRoot = async () => {
      try {
        const mod = await import('react-dom/client');
        if (mod && typeof mod.createRoot === 'function') {
          createRootFn = (el: Element) => mod.createRoot(el);
        }
      } catch {
        createRootFn = null;
      }
    };

    /**
     * processExisting
     * @description Find existing <pre> elements and try to replace trailer JSON.
     */
    const processExisting = async () => {
      await loadCreateRoot();
      const pres = Array.from(document.querySelectorAll('pre')) as HTMLPreElement[];
      for (const p of pres) {
        if (!mounted) break;
        // Process aggressively: ignore class heuristics; try parse if content looks JSON-like
        await processPreElement(p, createRootFn, createdRoots);
      }
    };

    // Debounced mutation processing
    let mutationTimeout: number | null = null;
    const scheduleProcess = () => {
      if (mutationTimeout) window.clearTimeout(mutationTimeout);
      mutationTimeout = window.setTimeout(() => {
        processExisting().catch(() => {});
      }, 80);
    };

    // Observe DOM changes to catch lazily inserted <pre> nodes
    const observer = new MutationObserver((mutations) => {
      if (!mounted) return;
      let shouldRun = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          for (const n of Array.from(m.addedNodes)) {
            if (n.nodeType !== 1) continue;
            const el = n as Element;
            if (el.tagName.toLowerCase() === 'pre' || el.querySelector?.('pre')) {
              shouldRun = true;
              break;
            }
          }
        }
        if (shouldRun) break;
      }
      if (shouldRun) scheduleProcess();
    });

    // Kick off initial processing and start observer
    processExisting().catch(() => {});
    observer.observe(document.body, { childList: true, subtree: true });

    // Cleanup on unmount
    return () => {
      mounted = false;
      observer.disconnect();
      if (mutationTimeout) window.clearTimeout(mutationTimeout);
      for (const entry of createdRoots) {
        try {
          entry.root.unmount();
        } catch {
          // ignore
        }
        try {
          entry.container.remove();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return null;
};

export default RawJsonReplacer;
