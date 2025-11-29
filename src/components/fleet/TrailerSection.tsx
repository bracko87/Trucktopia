/**
 * src/components/fleet/TrailerSection.tsx
 *
 * Trailer section container. Ensures trailers that are part of incoming deliveries
 * are NOT rendered in the Trailer Fleet box until delivery completes.
 *
 * Responsibilities:
 * - Read trailers/trucks from GameContext or props.
 * - Build a set of incoming IDs (from incoming arrays and transit-marked trucks/trailers).
 * - Render only trailers that are not present in incoming set by default.
 * - Optionally render market-style cards inside the Garage when explicitly allowed.
 *
 * Note:
 * - To reliably react to the Garage's opt-in, this component listens for a
 *   CustomEvent('allowMarketInGarageChanged') and keeps a small local state so
 *   re-renders happen when the Garage page sets/cleans the global flag.
 */

import React from 'react';
import SectionHeader from './SectionHeader';
import TrailerCard, { TrailerCardData } from './TrailerCard';
import { Package as PackageIcon } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { isTrailer, extractTrailerClass, isIncoming } from '../../utils/vehicleTypeUtils';
import TruckCardMarket from '../market/TruckCard';
import { useLocation } from 'react-router';

/**
 * Props
 * @description Props for the TrailerSection component.
 */
interface Props {
  trailers?: TrailerCardData[] | null;
  trucks?: { id: string; assignedTrailer?: string | null; [key: string]: any }[] | null;
  onSellTrailer?: (trailerId: string) => void;
  onPurchaseTrailer?: () => void;
  showPrimaryButton?: boolean;
  /**
   * When true, treat owned trailers that contain purchase metadata (purchasePrice) as market-style entries
   * and render them with the market card. Default true for existing behaviour.
   */
  renderOwnedAsMarket?: boolean;
  /**
   * Explicitly allow rendering market-style cards inside the Garage page.
   * When omitted the component will consult window.__ALLOW_MARKET_IN_GARAGE as a fallback.
   */
  allowMarketInGarage?: boolean;
}

/**
 * looksLikeMarketEntry
 * @description Heuristic to determine whether an item should be rendered with the market card.
 * Returns true when we detect a marketEntry, price/purchasePrice or availability fields, or when
 * the item contains purchase metadata and renderOwnedAsMarket is desired.
 * @param t any
 * @param renderOwnedAsMarket boolean
 */
function looksLikeMarketEntry(t: any, renderOwnedAsMarket = true): boolean {
  if (!t || typeof t !== 'object') return false;
  if (t.marketEntry) return true;
  if (t.price !== undefined || t.purchasePrice !== undefined) return true;
  if (t.availability || t.deliveryEta || t.deliveryDays) return true;
  // Some listings embed purchase info in _source or have explicit listing flags
  if (t._source && (t._source.marketEntry || t._source.purchasePrice || t._source.price)) return true;
  if (String(t.isListing ?? '').toLowerCase() === 'true') return true;
  // Owned but with purchase metadata -> if allowed, render as market listing style
  if (renderOwnedAsMarket && (t.purchasePrice !== undefined || t.marketEntry !== undefined || t.listing === true)) return true;
  return false;
}

/**
 * TrailerSection
 * @description Renders the Trailers box (header + list). Trailers that are currently incoming
 * (in transit / pending delivery) are excluded so they only appear under Incoming Deliveries.
 */
const TrailerSection: React.FC<Props> = ({
  trailers: trailersProp = null,
  trucks: trucksProp = null,
  onSellTrailer,
  onPurchaseTrailer,
  showPrimaryButton = true,
  renderOwnedAsMarket = true,
  allowMarketInGarage,
}) => {
  // Safely access GameContext
  let gameState: any = undefined;
  try {
    const maybeUseGame: any = useGame;
    if (typeof maybeUseGame === 'function') {
      const ctx = maybeUseGame();
      gameState = ctx?.gameState;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('TrailerSection: cannot access GameContext:', err);
    gameState = undefined;
  }

  // Detect whether we are on the Garage page.
  const location = useLocation();
  const isGaragePage = typeof location?.pathname === 'string' && location.pathname === '/garage';

  /**
   * allowMarketWhenGarageState
   * @description Local React state that represents whether market-style cards are allowed inside Garage.
   *              It is initialized from the prop or window global and updated when Garage dispatches
   *              the 'allowMarketInGarageChanged' CustomEvent so the component re-renders reliably.
   */
  const [allowMarketWhenGarageState, setAllowMarketWhenGarageState] = React.useState<boolean>(() => {
    return typeof allowMarketInGarage === 'boolean'
      ? allowMarketInGarage
      : Boolean((window as any).__ALLOW_MARKET_IN_GARAGE);
  });

  React.useEffect(() => {
    /**
     * handler
     * @description Update local state when the Garage page toggles the global flag and dispatches the event.
     */
    const handler = () => {
      const val = typeof allowMarketInGarage === 'boolean'
        ? allowMarketInGarage
        : Boolean((window as any).__ALLOW_MARKET_IN_GARAGE);
      setAllowMarketWhenGarageState(val);
    };

    // Keep the event listener so we react to Garage mounting/unmounting.
    window.addEventListener('allowMarketInGarageChanged', handler);

    // Also run once to sync if the flag was set after initial render.
    handler();

    return () => {
      window.removeEventListener('allowMarketInGarageChanged', handler);
    };
    // include allowMarketInGarage so a parent prop change also syncs state
  }, [allowMarketInGarage]);

  // Build incoming id set from common incoming arrays and transit-marked company entries
  const incomingIdSet = React.useMemo(() => {
    const set = new Set<string>();
    try {
      const company = gameState?.company ?? {};
      const incomingCandidates = [
        gameState?.incomingDeliveries,
        gameState?.purchasedDeliveries,
        company?.incomingDeliveries,
        company?.purchasedDeliveries,
        company?.incoming,
        company?.deliveries,
        company?.purchaseQueue,
        company?.incoming_items,
      ];
      for (const arr of incomingCandidates) {
        if (!Array.isArray(arr)) continue;
        for (const it of arr) {
          const id = String(it?.id ?? it?._id ?? it?.vehicleId ?? it?.marketEntry?.id ?? '');
          if (id) set.add(id);
        }
      }

      // Look into company.trucks and company.trailers for items with deliveryEta/status
      const addTransitFrom = (arr: any[]) => {
        if (!Array.isArray(arr)) return;
        for (const it of arr) {
          const id = String(it?.id ?? it?._id ?? it?.vehicleId ?? it?.marketEntry?.id ?? '');
          const hasTransit = !!(it?.deliveryEta || it?.deliveryDays || String(it?.status || '').toLowerCase().includes('in-transit') || it?.incoming || it?.inTransit);
          if (id && hasTransit) set.add(id);
        }
      };

      addTransitFrom(company?.trucks ?? []);
      addTransitFrom(company?.trailers ?? []);
    } catch {
      // ignore
    }

    return set;
  }, [gameState]);

  const trailersFromContext: TrailerCardData[] =
    Array.isArray(gameState?.company?.trailers)
      ? gameState.company.trailers
      : Array.isArray(gameState?.fleet?.trailers)
      ? gameState.fleet.trailers
      : Array.isArray(gameState?.company?.fleet?.trailers)
      ? gameState.company.fleet.trailers
      : [];

  const trucksFromContext: { id: string; assignedTrailer?: string | null; [key: string]: any }[] =
    Array.isArray(gameState?.company?.trucks)
      ? gameState.company.trucks
      : Array.isArray(gameState?.fleet?.trucks)
      ? gameState.fleet.trucks
      : Array.isArray(gameState?.company?.fleet?.trucks)
      ? gameState.company.fleet.trucks
      : [];

  const trailers: TrailerCardData[] = Array.isArray(trailersProp)
    ? trailersProp
    : Array.isArray(trailersFromContext)
    ? trailersFromContext
    : [];

  const trucks: { id: string; assignedTrailer?: string | null; [key: string]: any }[] = Array.isArray(trucksProp)
    ? trucksProp
    : Array.isArray(trucksFromContext)
    ? trucksFromContext
    : [];

  /**
   * Collect trailer-like items that accidentally live in trucks[].
   * Convert them to TrailerCardData shape and exclude incoming items.
   */
  const trailersFromTrucks: TrailerCardData[] = trucks
    .filter((t) => isTrailer(t) && !isIncoming(t))
    .map((t) => {
      const trailerClass = t.trailerClass ?? extractTrailerClass(t) ?? 'Trailer';
      return {
        id: String(t.id ?? `tractor-${Math.random().toString(36).slice(2, 9)}`),
        brand: t.brand ?? t.manufacturer ?? t.model ?? 'Unknown',
        model: t.model ?? t.title ?? t.name ?? '',
        trailerClass,
        capacity: t.capacity ?? t.tonnage ?? undefined,
        tonnage: t.tonnage ?? t.capacity ?? undefined,
        year: t.year ?? undefined,
        condition: t.condition ?? undefined,
        deliveryHub: t.deliveryHub ?? null,
        deliveryEta: t.deliveryEta ?? null,
        _source: t
      } as TrailerCardData;
    });

  // Merge while avoiding id collisions; trailersProp/context take precedence; exclude incoming
  const merged = React.useMemo(() => {
    const out: TrailerCardData[] = [];
    const existingIds = new Set<string>();

    for (const t of trailers) {
      const id = String(t.id ?? '');
      if (!id) continue;
      // Exclude if incoming according to derived set
      if (incomingIdSet.has(id)) continue;
      out.push(t);
      existingIds.add(id);
    }

    for (const t of trailersFromTrucks) {
      const id = String(t.id ?? '');
      if (!id || existingIds.has(id)) continue;
      if (incomingIdSet.has(id)) continue; // extra safety
      out.push(t);
      existingIds.add(id);
    }

    /**
     * When we are on the Garage page we used to always remove market-like items.
     * New behaviour:
     * - If allowMarketWhenGarageState is truthy (prop or global + event) we will keep market-like items
     *   and render them as market cards inside the Garage.
     * - Otherwise we filter them out as before.
     *
     * The local state allowMarketWhenGarageState ensures we re-render when Garage toggles the flag.
     */
    if (isGaragePage && !allowMarketWhenGarageState) {
      return out.filter(item => !looksLikeMarketEntry(item, renderOwnedAsMarket) && !looksLikeMarketEntry(item._source ?? {}, renderOwnedAsMarket));
    }

    return out;
  }, [trailers, trailersFromTrucks, incomingIdSet, isGaragePage, renderOwnedAsMarket, allowMarketWhenGarageState]);

  const handleSell = (id: string) => {
    if (typeof onSellTrailer === 'function') {
      onSellTrailer(id);
    } else {
      // eslint-disable-next-line no-console
      console.warn('TrailerSection: onSellTrailer not provided, ignoring sell request for', id);
    }
  };

  const handlePurchase = () => {
    if (typeof onPurchaseTrailer === 'function') {
      onPurchaseTrailer();
      return;
    }
    // fallback is intentionally a no-op; the caller or page header provides navigation
  };

  return (
    <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <SectionHeader
        title="Trailer Fleet"
        subtitle="Manage your trailers"
        icon={<PackageIcon className="w-6 h-6 text-blue-400" />}
        primaryLabel={showPrimaryButton ? 'Purchase Trailer' : undefined}
        onPrimaryClick={showPrimaryButton ? handlePurchase : undefined}
      />

      <div className="space-y-3">
        {merged.length === 0 ? (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 text-slate-300">
            No trailers available. Use "Purchase Trailer" to add one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {merged.map((tr) => {
              // only consider assignment from trucks that are not incoming
              const isAssigned = trucks.some(t => !isIncoming(t) && String(t.assignedTrailer) === String(tr.id));

              // If this trailer looks like a market listing or has marketEntry/purchase metadata,
              // render the market card instead — this also covers purchased items that record purchasePrice.
              if (looksLikeMarketEntry(tr, renderOwnedAsMarket) || looksLikeMarketEntry(tr._source ?? {}, renderOwnedAsMarket)) {
                // Defensive mapping to the TruckCardMarket props used elsewhere in the app.
                return (
                  <div key={tr.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600" data-market="true">
                    <TruckCardMarket
                      id={tr.id}
                      brand={tr.brand}
                      model={tr.model}
                      price={(tr.marketEntry?.price ?? tr.purchasePrice ?? tr.price ?? 0) as any}
                      condition={tr.condition as any}
                      availability={tr.marketEntry?.availability ?? (tr.deliveryEta ?? tr.deliveryDays ?? undefined) as any}
                      tonnage={tr.marketEntry?.tonnage ?? tr.tonnage ?? tr.capacity}
                      leaseRate={tr.marketEntry?.leaseRate ?? null}
                      truckCategory={tr.marketEntry?.truckCategory ?? tr.marketEntry?.category}
                      cargoTypes={tr.marketEntry?.specifications?.cargoTypes ?? tr.specifications?.cargoTypes ?? []}
                      capacity={tr.marketEntry?.specifications?.capacity ?? tr.specifications?.capacity ?? tr.capacity}
                      gcw={tr.marketEntry?.gcw ?? null}
                      // allow parent to hide specific market cards by passing hidden via existing props if needed
                    />
                  </div>
                );
              }

              // Default: render small TrailerCard
              return <TrailerCard key={tr.id} trailer={tr} isAssigned={isAssigned} onSell={handleSell} />;
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default TrailerSection;