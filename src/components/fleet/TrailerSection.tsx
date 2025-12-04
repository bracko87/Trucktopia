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
 * - This component accepts `showHeader` prop and forwards it to SectionHeader via the
 *   `visible` prop so callers control header visibility explicitly.
 */

import React from 'react';
import SectionHeader from './SectionHeader';
import TrailerCard, { TrailerCardData } from './TrailerCard';
import { Package as PackageIcon } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { isTrailer, extractTrailerClass, isIncoming } from '../../utils/vehicleTypeUtils';
import { useLocation } from 'react-router';

/**
 * Props
 * @description Props accepted by TrailerSection.
 */
interface Props {
  trailers?: TrailerCardData[] | null;
  trucks?: { id: string; assignedTrailer?: string | null; [key: string]: any }[] | null;
  onSellTrailer?: (trailerId: string) => void;
  onPurchaseTrailer?: () => void;
  showPrimaryButton?: boolean;
  renderOwnedAsMarket?: boolean;
  allowMarketInGarage?: boolean;
  /** When false, the small SectionHeader (icon + title + subtitle) is hidden. Default: true. */
  showHeader?: boolean;
}

/**
 * looksLikeMarketEntry
 * @description Heuristic to determine whether an item should be rendered with the market card.
 */
function looksLikeMarketEntry(t: any, renderOwnedAsMarket = true): boolean {
  if (!t || typeof t !== 'object') return false;
  if (t.marketEntry) return true;
  if (t.price !== undefined || t.purchasePrice !== undefined) return true;
  if (t.availability || t.deliveryEta || t.deliveryDays) return true;
  if (t._source && (t._source.marketEntry || t._source.purchasePrice || t._source.price)) return true;
  if (String(t.isListing ?? '').toLowerCase() === 'true') return true;
  if (renderOwnedAsMarket && (t.purchasePrice !== undefined || t.marketEntry !== undefined || t.listing === true)) return true;
  return false;
}

/**
 * normalizeMarketToTrailer
 * @description Build a trailer-shaped object suitable for TrailerCard out of a market-style entry.
 *              Keeps fields defensive and tries to surface marketEntry.specifications and other common aliases.
 */
function normalizeMarketToTrailer(t: any): TrailerCardData {
  const market = t?.marketEntry ?? t;
  const id = String(t?.id ?? t?.vehicleId ?? market?.id ?? `market-${Math.random().toString(36).slice(2, 9)}`);

  return {
    id,
    brand: t?.brand ?? market?.brand ?? market?.manufacturer ?? t?.manufacturer ?? t?._source?.brand ?? t?._source?.manufacturer ?? undefined,
    model: t?.model ?? market?.model ?? t?.title ?? t?.name ?? undefined,
    trailerClass: t?.trailerClass ?? market?.trailerClass ?? extractTrailerClass(t) ?? undefined,
    capacity: market?.specifications?.capacity ?? t?.capacity ?? t?.tonnage ?? market?.capacity ?? undefined,
    tonnage: market?.specifications?.tonnage ?? t?.tonnage ?? undefined,
    year: t?.year ?? market?.year ?? undefined,
    condition: t?.condition ?? market?.condition ?? undefined,
    status: t?.status ?? market?.status ?? undefined,
    deliveryHub: t?.deliveryHub ?? market?.deliveryHub ?? null,
    deliveryEta: t?.deliveryEta ?? market?.deliveryEta ?? market?.availability ?? null,
    kilometers: t?.kilometers ?? market?.kilometers ?? undefined,
    gcw: market?.gcw ?? t?.gcw ?? undefined,
    nickname: t?.nickname ?? null,
    insured: Boolean(t?.insured ?? false),
    specifications: {
      ...(t?.specifications ?? {}),
      ...(market?.specifications ?? {}),
    },
    marketEntry: market,
    _source: t,
  } as TrailerCardData;
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
  showHeader = true,
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

  const [allowMarketWhenGarageState, setAllowMarketWhenGarageState] = React.useState<boolean>(() => {
    return typeof allowMarketInGarage === 'boolean'
      ? allowMarketInGarage
      : Boolean((window as any).__ALLOW_MARKET_IN_GARAGE);
  });

  React.useEffect(() => {
    const handler = () => {
      const val = typeof allowMarketInGarage === 'boolean'
        ? allowMarketInGarage
        : Boolean((window as any).__ALLOW_MARKET_IN_GARAGE);
      setAllowMarketWhenGarageState(val);
    };

    window.addEventListener('allowMarketInGarageChanged', handler);
    handler();

    return () => {
      window.removeEventListener('allowMarketInGarageChanged', handler);
    };
  }, [allowMarketInGarage]);

  /**
   * incomingIdSet
   * @description Build a set of trailer ids that are incoming / in transit so they are excluded.
   */
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

  const merged = React.useMemo(() => {
    const out: TrailerCardData[] = [];
    const existingIds = new Set<string>();

    for (const t of trailers) {
      const id = String(t.id ?? '');
      if (!id) continue;
      if (incomingIdSet.has(id)) continue;
      out.push(t);
      existingIds.add(id);
    }

    for (const t of trailersFromTrucks) {
      const id = String(t.id ?? '');
      if (!id || existingIds.has(id)) continue;
      if (incomingIdSet.has(id)) continue;
      out.push(t);
      existingIds.add(id);
    }

    if (isGaragePage && !allowMarketWhenGarageState) {
      return out.filter(item => !looksLikeMarketEntry(item, renderOwnedAsMarket) && !looksLikeMarketEntry(item._source ?? {}, renderOwnedAsMarket));
    }

    return out;
  }, [trailers, trailersFromTrucks, incomingIdSet, isGaragePage, renderOwnedAsMarket, allowMarketWhenGarageState]);

  /**
   * handleSell
   * @description Forward sell action to parent or log when absent.
   */
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
    // fallback no-op
  };

  return (
    <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      {showHeader && (
        <SectionHeader
          title="Trailer Fleet"
          subtitle="Manage your trailers"
          icon={<PackageIcon className="w-6 h-6 text-blue-400" />}
          primaryLabel={showPrimaryButton ? 'Purchase Trailer' : undefined}
          onPrimaryClick={showPrimaryButton ? handlePurchase : undefined}
          visible={showHeader}
        />
      )}

      <div className="space-y-3">
        {merged.length === 0 ? (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 text-slate-300">
            No trailers available. Use "Purchase Trailer" to add one.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {merged.map((tr) => {
              const isAssigned = trucks.some(t => !isIncoming(t) && String(t.assignedTrailer) === String(tr.id));

              // If the item looks like a market listing we ensure we render with TrailerCard
              // and map market fields into the trailer shape so the modal receives normalized specs.
              if (looksLikeMarketEntry(tr, renderOwnedAsMarket) || looksLikeMarketEntry(tr._source ?? {}, renderOwnedAsMarket)) {
                const marketTrailer = normalizeMarketToTrailer(tr);
                return (
                  <div key={marketTrailer.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600" data-market="true">
                    <TrailerCard trailer={marketTrailer} isAssigned={isAssigned} onSell={handleSell} />
                  </div>
                );
              }

              return <TrailerCard key={tr.id} trailer={tr} isAssigned={isAssigned} onSell={handleSell} />;
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default TrailerSection;
