/**
 * src/components/fleet/PurchasedDeliveriesBox.tsx
 *
 * Purchased deliveries list + details modal.
 *
 * Responsibilities:
 * - Aggregate incoming deliveries from game state and optional deliveries prop.
 * - Render a compact list with details and a Cancel action.
 * - Cancel removes the delivery from company arrays and persists via GameContext.createCompany.
 * - Provide a localStorage fallback persistence to improve resilience across reloads.
 *
 * Behaviour change:
 * - When rendering delivery details for trailers, render the market-style TruckCard (TruckCardMarket)
 *   instead of the smaller TrailerCard so pending trailers use the same market visual box as trucks.
 *
 * Preservation notes:
 * - Layout / visual structure intentionally preserved from original design.
 * - All messages use window.alert for now to avoid changing visual UX.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import TruckCardMarket from '../market/TruckCard';
import TrailerCard from './TrailerCard';
import VehicleSpecsSelector from '../market/VehicleSpecsSelector';
import TrailerTechnicalSpecs from '../trailer/TrailerTechnicalSpecs';
import { isTrailer } from '../../utils/vehicleTypeUtils';

/**
 * Minimal normalized shape for deliveries used in this component.
 */
interface PurchasedDelivery {
  id: string;
  brand?: string;
  model?: string;
  year?: number;
  condition?: number;
  capacity?: any;
  tonnage?: any;
  purchasePrice?: number;
  location?: string;
  deliveryEta?: string | null;
  deliveryDays?: number | null;
  deliveryHub?: { id?: string; name?: string } | null;
  status?: string;
  specifications?: { [key: string]: any } | null;
  marketEntry?: { [key: string]: any } | null;
  vehicleKind?: 'truck' | 'trailer' | string;
  __source?: string;
  [key: string]: any;
}

/**
 * Props - optional deliveries array and cancel handler.
 */
interface Props {
  deliveries?: PurchasedDelivery[] | null;
  /**
   * Optional external handler for cancelling delivery.
   * If provided, it is called with the delivery id and should persist changes.
   */
  onCancelDelivery?: (id: string) => void | Promise<void>;
}

/**
 * getImageSrc
 * @description Choose a banner image for the modal. Prefer marketEntry images.
 */
function getImageSrc(item: PurchasedDelivery): string {
  const marketImg = item.marketEntry?.image ?? item.marketEntry?.images?.[0];
  if (marketImg && typeof marketImg === 'string' && marketImg.trim() !== '') return marketImg;
  // Smart placeholder is allowed by the environment rules.
  return 'https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/7ff04720-1eaf-4132-a888-4a80210f868e.jpg';
}

/**
 * formatAvailabilityText
 * @description Format ETA / deliveryDays into friendly text.
 */
function formatAvailabilityText(item: PurchasedDelivery) {
  if (item.deliveryEta) {
    try {
      const d = new Date(item.deliveryEta);
      if (!Number.isNaN(d.getTime())) return d.toLocaleString();
    } catch {
      // noop
    }
  }
  if (typeof item.deliveryDays === 'number') return `${item.deliveryDays} days`;
  return '—';
}

/**
 * stableId
 * @description Best-effort stable id extraction for incoming objects.
 */
function stableId(it: any) {
  return String(it?.id ?? it?._id ?? it?.vehicleId ?? it?.marketEntry?.id ?? '');
}

/**
 * PurchasedDeliveriesBox
 * @description Component that lists incoming deliveries and provides details + cancel with persistence.
 *
 * Behaviour note:
 * - When showing details for trailer deliveries we render the TruckCardMarket (market-style card)
 *   so pending trailers visually match truck listings and other market entries.
 */
const PurchasedDeliveriesBox: React.FC<Props> = ({ deliveries: deliveriesProp = null, onCancelDelivery }) => {
  const { gameState, createCompany } = useGame() as any;
  const [selected, setSelected] = useState<PurchasedDelivery | null>(null);
  const [open, setOpen] = useState(false);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [localDeliveries, setLocalDeliveries] = useState<PurchasedDelivery[] | null>(null);

  /**
   * deriveIncomingIds
   * @description Build a set of ids that are considered incoming/purchased so other components (TrailerSection)
   * can hide them until delivery completes. This scans common company arrays and global incoming arrays.
   */
  const deriveIncomingIds = useMemo(() => {
    const set = new Set<string>();
    try {
      const company = (gameState?.company ?? {}) as any;
      const candidateLists = [
        gameState?.incomingDeliveries,
        gameState?.purchasedDeliveries,
        company?.incomingDeliveries,
        company?.purchasedDeliveries,
        company?.incoming,
        company?.deliveries,
        company?.purchaseQueue,
        company?.incoming_items,
        company?.incoming_items_queue
      ];

      for (const arr of candidateLists) {
        if (!Array.isArray(arr)) continue;
        for (const it of arr) {
          const id = stableId(it);
          if (id) set.add(String(id));
        }
      }

      // Also include company.trucks/trailers entries that contain deliveryEta/status/in-transit tokens
      const collectTransitFrom = (arr: any[]) => {
        if (!Array.isArray(arr)) return;
        for (const it of arr) {
          const id = stableId(it);
          const hasTransit = !!(it?.deliveryEta || it?.deliveryDays || String(it?.status || '').toLowerCase().includes('in-transit') || it?.inTransit || it?.incoming);
          if (id && hasTransit) set.add(String(id));
        }
      };

      collectTransitFrom(company?.trucks ?? []);
      collectTransitFrom(company?.trailers ?? []);
    } catch {
      // ignore
    }
    return set;
  }, [gameState]);

  /**
   * Aggregate deliveries
   * - Accept deliveries prop if provided (highest priority)
   * - Otherwise derive from gameState incoming arrays and company trucks/trailers
   * - Deduplicate by id
   */
  const deliveries: PurchasedDelivery[] = useMemo(() => {
    // If a prop is supplied prefer it and keep it authoritative.
    if (Array.isArray(deliveriesProp)) return deliveriesProp;

    // If we've generated a local cached list (after generation) use it
    if (Array.isArray(localDeliveries)) return localDeliveries;

    const map = new Map<string, PurchasedDelivery>();

    try {
      const ctxList = (gameState?.incomingDeliveries ?? gameState?.purchasedDeliveries ?? []) as any[];
      if (Array.isArray(ctxList)) {
        for (const item of ctxList) {
          const id = stableId(item) || `incoming-${Math.random().toString(36).slice(2, 9)}`;
          const normalized: PurchasedDelivery = {
            id,
            brand: item.brand ?? item.marketEntry?.brand,
            model: item.model ?? item.marketEntry?.model,
            year: item.year,
            condition: item.condition,
            capacity: item.capacity ?? item.specifications?.capacity ?? item.marketEntry?.specifications?.capacity,
            tonnage: item.tonnage ?? item.specifications?.tonnage ?? item.marketEntry?.tonnage,
            purchasePrice: item.purchasePrice ?? item.marketEntry?.price,
            location: item.location ?? item.deliveryHub?.name ?? item.marketEntry?.location,
            deliveryEta: item.deliveryEta ?? item.marketEntry?.deliveryEta ?? null,
            deliveryDays: item.deliveryDays ?? item.marketEntry?.deliveryDays ?? null,
            deliveryHub: item.deliveryHub ?? item.marketEntry?.deliveryHub ?? null,
            status: item.status ?? item.marketEntry?.status,
            specifications: item.specifications ?? item.marketEntry?.specifications ?? null,
            marketEntry: item.marketEntry ?? item,
            vehicleKind: item.vehicleKind ?? item.marketEntry?.type ?? undefined,
            __source: 'gameState.incomingDeliveries',
          };
          map.set(String(id), normalized);
        }
      }

      // Company trucks / trailers that are in transit
      const company = (gameState?.company ?? {}) as any;
      if (Array.isArray(company?.trucks)) {
        for (const t of company.trucks) {
          const hasTransit = (String(t.status || '').toLowerCase() === 'in-transit') || !!t.deliveryEta || !!t.deliveryDays;
          if (!hasTransit) continue;
          const normalized: PurchasedDelivery = {
            id: stableId(t) || `truck-${Math.random().toString(36).slice(2, 9)}`,
            brand: t.brand ?? t.marketEntry?.brand,
            model: t.model ?? t.marketEntry?.model,
            year: t.year ?? t.marketEntry?.year,
            condition: t.condition ?? t.marketEntry?.condition,
            capacity: t.capacity ?? t.specifications?.capacity ?? t.marketEntry?.specifications?.capacity,
            tonnage: t.tonnage ?? t.specifications?.tonnage ?? t.marketEntry?.tonnage,
            purchasePrice: t.purchasePrice ?? t.marketEntry?.price,
            location: t.location ?? t.deliveryHub?.name ?? t.marketEntry?.location,
            deliveryEta: t.deliveryEta ?? t.marketEntry?.deliveryEta ?? null,
            deliveryDays: t.deliveryDays ?? t.marketEntry?.deliveryDays ?? null,
            deliveryHub: t.deliveryHub ?? t.marketEntry?.deliveryHub ?? null,
            status: t.status ?? t.marketEntry?.status,
            specifications: t.specifications ?? t.marketEntry?.specifications ?? null,
            marketEntry: t.marketEntry ?? t,
            vehicleKind: t.vehicleKind ?? t.marketEntry?.type ?? 'truck',
            __source: 'company.trucks',
          };
          map.set(String(normalized.id), normalized);
        }
      }
      if (Array.isArray(company?.trailers)) {
        for (const tr of company.trailers) {
          const hasTransit = (String(tr.status || '').toLowerCase() === 'in-transit') || !!tr.deliveryEta || !!tr.deliveryDays;
          if (!hasTransit) continue;
          const normalized: PurchasedDelivery = {
            id: stableId(tr) || `trailer-${Math.random().toString(36).slice(2, 9)}`,
            brand: tr.brand ?? tr.marketEntry?.brand,
            model: tr.model ?? tr.marketEntry?.model ?? tr.trailerClass,
            year: tr.year ?? tr.marketEntry?.year,
            condition: tr.condition ?? tr.marketEntry?.condition,
            capacity: tr.capacity ?? tr.specifications?.capacity ?? tr.marketEntry?.specifications?.capacity,
            tonnage: tr.tonnage ?? tr.specifications?.tonnage ?? tr.marketEntry?.tonnage,
            purchasePrice: tr.purchasePrice ?? tr.marketEntry?.price,
            location: tr.location ?? tr.deliveryHub?.name ?? tr.marketEntry?.location,
            deliveryEta: tr.deliveryEta ?? tr.marketEntry?.deliveryEta ?? null,
            deliveryDays: tr.deliveryDays ?? tr.marketEntry?.deliveryDays ?? null,
            deliveryHub: tr.deliveryHub ?? tr.marketEntry?.deliveryHub ?? null,
            status: tr.status ?? tr.marketEntry?.status,
            specifications: tr.specifications ?? tr.marketEntry?.specifications ?? null,
            marketEntry: tr.marketEntry ?? tr,
            vehicleKind: tr.vehicleKind ?? tr.marketEntry?.type ?? 'trailer',
            __source: 'company.trailers',
          };
          map.set(String(normalized.id), normalized);
        }
      }
    } catch {
      // ignore malformed structures
    }

    return Array.from(map.values());
  }, [gameState, deliveriesProp, localDeliveries]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setSelected(null);
        if (lastFocusedRef.current) lastFocusedRef.current.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  /**
   * handleOpenDetails
   * Open details modal and remember last focused element to return focus on close.
   */
  const handleOpenDetails = (ev: React.MouseEvent | React.KeyboardEvent, item: PurchasedDelivery) => {
    ev.preventDefault();
    lastFocusedRef.current = (ev.currentTarget as HTMLElement) || null;
    setSelected(item);
    setOpen(true);
  };

  /**
   * removeById utility - stable id extraction and filtering.
   */
  const removeById = (arr: any[] | undefined, id: string) => {
    if (!Array.isArray(arr)) return arr;
    return arr.filter((entry) => {
      try {
        const entryId = String(entry.id ?? entry.vehicleId ?? entry._id ?? entry.marketEntry?.id ?? '');
        return entryId !== String(id);
      } catch {
        return true;
      }
    });
  };

  /**
   * persistBackup
   * @description Save a backup of the updated company to localStorage. This is a resilient fallback
   * so cancelled state survives reload even if persistence endpoint fails or context is not hooked.
   */
  const persistBackup = (updatedCompany: any) => {
    try {
      const key = `company_backup_${String(updatedCompany?.id ?? updatedCompany?.hub?.country ?? 'default')}`;
      localStorage.setItem(key, JSON.stringify({ company: updatedCompany, ts: Date.now() }));
    } catch {
      // noop
    }
  };

  /**
   * handleCancel
   * Cancel the delivery, refund 100% and persist the company state so it survives reload.
   *
   * Strategy:
   *  - If onCancelDelivery prop is supplied, call it and trust it to persist.
   *  - Otherwise construct an updated company object without the delivery, add refund to capital,
   *    and persist via createCompany(...) exposed by GameContext.
   *  - As a resilience fallback also persist a localStorage backup.
   */
  const handleCancel = async (item: PurchasedDelivery) => {
    if (!item?.id) return;
    const ok = window.confirm('Cancel delivery (refund 100%)? This will refund 100% of the purchase price.');
    if (!ok) return;

    // Prevent double clicks
    setIsProcessingId(String(item.id));
    try {
      // 1) delegate to external handler if provided
      if (typeof onCancelDelivery === 'function') {
        try {
          await onCancelDelivery(item.id);
          // Remove item locally for immediate UI feedback
          setLocalDeliveries((prev) => (Array.isArray(prev) ? prev.filter(d => d.id !== item.id) : null));
          window.alert('Delivery cancelled and refunded.');
          return;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('onCancelDelivery handler failed', err);
          window.alert('Failed to cancel delivery via handler. See console for details.');
          return;
        }
      }

      // 2) Build updated company and persist via createCompany
      const company = (gameState as any)?.company;
      if (!company) {
        window.alert('No active company found. Cannot cancel delivery.');
        return;
      }

      // Determine refund amount
      const refundAmount = Number(item.purchasePrice ?? item.marketEntry?.price ?? 0);

      const updatedCompany: any = { ...company };

      // Remove from trucks/trailers arrays and any incoming arrays on company
      updatedCompany.trucks = removeById(updatedCompany.trucks, item.id);
      updatedCompany.trailers = removeById(updatedCompany.trailers, item.id);

      const incomingKeys = ['incomingDeliveries', 'purchasedDeliveries', 'incoming', 'incoming_deliveries', 'purchaseQueue', 'incoming_items', 'deliveries'];
      for (const k of incomingKeys) {
        if (Array.isArray(updatedCompany[k])) {
          updatedCompany[k] = removeById(updatedCompany[k], item.id);
        }
      }

      // Ensure activeJobs or other arrays aren't referencing the id - clear simple fields if needed
      try {
        if (Array.isArray(updatedCompany.activeJobs)) {
          updatedCompany.activeJobs = updatedCompany.activeJobs.map((j: any) => {
            if (String(j.assignedTruck) === String(item.id)) j.assignedTruck = '';
            if (String(j.assignedTrailer) === String(item.id)) j.assignedTrailer = '';
            return j;
          });
        }
      } catch {
        // ignore
      }

      // Apply refund (100% of purchasePrice)
      const currentCapital = Number(updatedCompany.capital ?? 0);
      updatedCompany.capital = currentCapital + refundAmount;

      // Persist using createCompany exposed by GameContext
      try {
        if (typeof createCompany === 'function') {
          // If createCompany returns a promise await it
          const maybe = createCompany(updatedCompany);
          if (maybe && typeof maybe.then === 'function') {
            await maybe;
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn('PurchasedDeliveriesBox: createCompany not available - attempting local backup.');
        }

        // Local backup as an additional persistence layer
        persistBackup(updatedCompany);

        // Remove item locally for immediate UI feedback
        setLocalDeliveries((prev) => (Array.isArray(prev) ? prev.filter(d => d.id !== item.id) : null));

        window.alert(`Delivery cancelled. €${refundAmount.toLocaleString()} refunded to company capital.`);
        setOpen(false);
        setSelected(null);
        return;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Cancellation failed', err);
        window.alert('Failed to cancel delivery. See console for details.');
      }
    } finally {
      setIsProcessingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Incoming Deliveries</h3>
            <div className="text-sm text-slate-400">Items purchased and currently in transit</div>
          </div>
          <div className="text-sm text-slate-400">{deliveries.length} item(s)</div>
        </div>

        {deliveries.length === 0 ? (
          <div className="bg-slate-700 rounded-lg border border-slate-700 p-4 text-slate-300">No incoming deliveries.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {deliveries.map((d) => (
              <div key={d.id} className="relative z-0 bg-slate-700 rounded-lg p-4 border border-slate-600 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0 w-full text-xs md:text-sm">
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-white font-medium whitespace-nowrap overflow-hidden truncate"
                      title={`${d.brand ?? d.marketEntry?.brand ?? 'Vehicle'} — ${d.model ?? d.marketEntry?.model ?? ''} • ${d.deliveryHub?.name ?? d.location ?? '—'} • ${formatAvailabilityText(d)}`}
                    >
                      {d.brand ?? d.marketEntry?.brand ?? 'Vehicle'}{' '}
                      <span className="text-slate-400">— {d.model ?? d.marketEntry?.model ?? ''}</span>
                      <span className="text-slate-500 mx-2">•</span>
                      <span className="text-slate-400">{d.deliveryHub?.name ?? d.location ?? '—'}</span>
                      <span className="text-slate-500 mx-2">•</span>
                      <span className="text-slate-400">{formatAvailabilityText(d)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-3">
                  <button
                    onClick={(e) => handleOpenDetails(e, d)}
                    className="text-slate-300 hover:text-white text-sm px-2 py-1 rounded-md border border-transparent hover:border-slate-600 transition"
                    aria-label={`Details for ${d.brand ?? d.model ?? d.id}`}
                  >
                    Details
                  </button>

                  <button
                    onClick={() => handleCancel(d)}
                    title={`Cancel delivery (refund 100%)`}
                    className={`text-rose-400 hover:underline cursor-pointer text-sm ${isProcessingId === String(d.id) ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DETAILS MODAL */}
      {open && selected && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setOpen(false);
              setSelected(null);
              if (lastFocusedRef.current) lastFocusedRef.current.focus();
            }}
          />

          <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-auto bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div>
                <h4 className="text-lg font-semibold text-white truncate">{selected.brand ?? selected.marketEntry?.brand ?? 'Vehicle'}</h4>
                <div className="text-sm text-slate-400">{(selected.brand ?? selected.marketEntry?.brand ?? '')} — {(selected.model ?? selected.marketEntry?.model ?? '')}</div>
              </div>
              <button
                type="button"
                className="text-slate-300 hover:text-white p-2 rounded-md"
                aria-label="Close details"
                onClick={() => {
                  setOpen(false);
                  setSelected(null);
                  if (lastFocusedRef.current) lastFocusedRef.current.focus();
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Banner image retained */}
              <div className="w-full rounded-lg overflow-hidden border border-slate-700">
                <img
                  src={getImageSrc(selected)}
                  alt={`${selected.brand ?? selected.marketEntry?.brand ?? 'Vehicle'} ${selected.model ?? selected.marketEntry?.model ?? ''}`}
                  className="w-full h-56 md:h-64 object-cover"
                />
              </div>

              {/* Market-style card for both trucks and trailers.
                  CHANGE: trailers now render the same TruckCardMarket (market box) so pending trailers use identical visual box. */}
              <div className="bg-transparent">
                {/* Always render market-style TruckCardMarket for the details modal so the visual box is consistent */}
                <TruckCardMarket
                  id={selected.id}
                  brand={selected.brand}
                  model={selected.model}
                  price={selected.marketEntry?.price ?? selected.purchasePrice ?? 0}
                  condition={selected.condition}
                  availability={selected.marketEntry?.availability ?? formatAvailabilityText(selected)}
                  tonnage={selected.marketEntry?.tonnage ?? selected.tonnage ?? selected.capacity ?? undefined}
                  leaseRate={selected.marketEntry?.leaseRate ?? null}
                  truckCategory={selected.marketEntry?.truckCategory ?? selected.marketEntry?.category ?? undefined}
                  cargoTypes={selected.marketEntry?.specifications?.cargoTypes ?? selected.specifications?.cargoTypes ?? selected.marketEntry?.cargoTypes ?? []}
                  capacity={selected.marketEntry?.specifications?.capacity ?? selected.specifications?.capacity ?? selected.capacity ?? undefined}
                  gcw={selected.marketEntry?.gcw ?? selected.marketEntry?.specifications?.gcw ?? null}
                />
              </div>

              {/* Full specifications selector / extended info */}
              <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                {isTrailer(selected.marketEntry ?? selected) ? (
                  <TrailerTechnicalSpecs specs={selected.specifications ?? selected.marketEntry ?? selected} />
                ) : (
                  <VehicleSpecsSelector vehicle={selected.marketEntry ?? { ...selected, marketEntry: selected.marketEntry }} />
                )}
              </div>

              {/* Metadata */}
              <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <h5 className="text-sm font-medium text-white mb-2">Metadata</h5>
                <div className="text-sm text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <div className="text-slate-400 text-xs">Hub</div>
                    <div className="text-white text-sm">{selected.deliveryHub?.name ?? selected.location ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs">ETA</div>
                    <div className="text-white text-sm">{formatAvailabilityText(selected)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-xs">Type</div>
                    <div className="text-white text-sm">{selected.vehicleKind ?? selected.marketEntry?.type ?? (isTrailer(selected.marketEntry ?? selected) ? 'trailer' : 'truck')}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasedDeliveriesBox;