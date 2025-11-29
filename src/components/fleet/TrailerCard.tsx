/**
 * TrailerCard.tsx
 *
 * Visual card for a trailer. This file guarantees trailers use a distinct
 * trailer/package icon (Package) so they never display the truck icon.
 *
 * Responsibilities:
 * - Render a single trailer with a clear trailer/package emblem.
 * - Display key trailer info (brand/model/class, year, condition, assignment).
 * - Provide a sell action callback.
 *
 * Behaviour extension:
 * - When this component is rendered inside a popup/modal (dialog), it will
 *   detect the dialog ancestor and return null so the card is hidden inside popups.
 *   Detection uses several common dialog selectors and is intentionally conservative.
 */

import React from 'react';
import { Package, Trash2, MapPin } from 'lucide-react';

/**
 * TrailerCardData
 * @description Minimal data shape expected by TrailerCard. Allows extra fields.
 */
export interface TrailerCardData {
  id: string;
  brand?: string;
  model?: string;
  trailerClass?: string;
  capacity?: number;
  tonnage?: number;
  year?: number;
  condition?: number;
  status?: string;
  deliveryHub?: { id?: string; name?: string } | string | null;
  deliveryEta?: string | null;
  [key: string]: any;
}

/**
 * Props
 * @description Component props for TrailerCard.
 */
interface Props {
  trailer: TrailerCardData;
  isAssigned?: boolean;
  onSell: (trailerId: string) => void;
}

/**
 * isRenderedInsideDialog
 * @description Walk up DOM ancestors from the provided element and check for
 *              common dialog/modal selectors. Returns true when a dialog-like
 *              ancestor is found.
 * @param el HTMLElement | null - starting element
 * @returns boolean
 */
function isRenderedInsideDialog(el: HTMLElement | null): boolean {
  if (!el || typeof window === 'undefined' || typeof document === 'undefined') return false;

  // Common dialog/modal selectors to detect
  const selectors = [
    '[role="dialog"]',
    '.modal',
    '.dialog',
    '[data-modal]',
    '.headlessui-dialog',
    '.react-modal',
    '.aria-modal'
  ];

  let node: HTMLElement | null = el;
  while (node && node !== document.documentElement) {
    try {
      for (const sel of selectors) {
        // matches may throw on SVG in some environments; wrap defensively
        // Use Element.prototype.matches via node.matches
        if ((node as Element).matches(sel)) {
          return true;
        }
      }
    } catch {
      // ignore and continue walking up
    }
    node = node.parentElement;
  }

  return false;
}

/**
 * TrailerCard
 * @description Visual card for a trailer. Uses Package icon (purple themed)
 *              to clearly differentiate trailers from trucks.
 *
 * When rendered inside a popup/modal, the component will hide itself by returning null.
 *
 * @param {Props} props Component props
 * @returns React.ReactElement | null
 */
const TrailerCard: React.FC<Props> = ({ trailer, isAssigned = false, onSell }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  /**
   * insideDialog
   * @description Local state indicating whether the component is rendered inside a dialog/modal.
   */
  const [insideDialog, setInsideDialog] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Run only on client after mount to safely access DOM
    const el = containerRef.current;
    if (!el) return;

    const detected = isRenderedInsideDialog(el);
    setInsideDialog(detected);
  }, []);

  // If we are inside a modal/dialog, do not render the visual card.
  if (insideDialog) {
    return null;
  }

  const title = trailer.brand ?? trailer.model ?? trailer.trailerClass ?? 'Trailer';
  const subtitle = trailer.model ?? trailer.trailerClass ?? '';
  const capacity = trailer.capacity ?? trailer.tonnage ?? null;
  const condition = typeof trailer.condition === 'number' ? `${trailer.condition}%` : '—';

  const hub =
    typeof trailer.deliveryHub === 'string'
      ? trailer.deliveryHub
      : trailer.deliveryHub?.name ?? trailer.deliveryHub?.id ?? null;

  /**
   * handleSell
   * @description Local wrapper that forwards the trailer id to the provided callback.
   * @param id trailer id
   */
  const handleSell = (id: string) => {
    onSell(id);
  };

  return (
    <div ref={containerRef} className="bg-slate-700 rounded-lg p-4 border border-slate-600 flex items-start justify-between">
      <div className="flex items-start space-x-3">
        {/* Trailer-specific icon: Package — explicit choice so trailers never show truck icon */}
        <div className="p-2 rounded bg-purple-400/10 text-purple-400">
          <Package className="w-5 h-5" />
        </div>

        <div>
          <div className="text-white font-medium">{title}</div>
          <div className="text-sm text-slate-400">{subtitle}{capacity ? ` • ${capacity}t` : ''}</div>

          <div className="flex items-center space-x-3 text-xs text-slate-400 mt-2">
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3 text-indigo-400" />
              <span>{hub ?? 'Hub: -'}</span>
            </div>
            <div>{condition} condition</div>
            {isAssigned && <div className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 text-xs">Assigned</div>}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end space-y-2">
        <div className="text-sm text-slate-300">{trailer.year ?? '-'}</div>
        <button
          onClick={() => handleSell(trailer.id)}
          className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-md text-xs transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          <span>Sell</span>
        </button>
      </div>
    </div>
  );
};

export default TrailerCard;