/**
 * Garage.tsx
 *
 * Garage page with independent filters/search for Trucks and Trailers.
 *
 * Responsibilities:
 * - Render Trucks / Trailers tabs
 * - Provide per-tab Search+Filter bar (persisted in localStorage)
 * - Merge owned + incoming deliveries for the UI and apply filters non-destructively
 *
 * Notes:
 * - This page extracts cargoTypes for trucks from several potential fields and
 *   passes them explicitly to TruckCard so the card can render full-width cargo badges.
 */

import React, { useMemo, useState } from 'react';
import { Truck, Package as PackageIcon } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import { TRAILERS } from '../data/trailers';
import TruckCard, { TruckCardData } from '../components/fleet/TruckCard';
import TrailerCard, { TrailerCardData } from '../components/fleet/TrailerCard';
import ErrorBoundary from '../components/ErrorBoundary';
import GarageHeader from '../components/fleet/GarageHeader';
import SearchFilterBar, { SourceFilter } from '../components/fleet/SearchFilterBar';
import * as gameTime from '../utils/gameTime';
import * as gameClock from '../utils/gameClock';
import { isTrailer, isTruck, isIncoming } from '../utils/vehicleTypeUtils';

/**
 * TabButtonProps
 * @description Props for the pill tab buttons used by the Garage page.
 */
interface TabButtonProps {
  id: 'trucks' | 'trailers';
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * TabButton
 * @description Presentational pill button matching Staff/Management visual design.
 */
const TabButton: React.FC<TabButtonProps> = ({ id, active, onClick, children, icon }) => {
  const base =
    'px-4 py-2 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-150 w-full';
  const activeClass = 'bg-blue-600 text-white shadow-md ring-1 ring-white/5';
  const inactiveClass = 'text-slate-400 hover:text-white hover:bg-slate-700/50';
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`fleet-tab-${id}`}
      onClick={onClick}
      className={`${base} ${active ? activeClass : inactiveClass}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
};

/**
 * isIncomingItemDelivered
 * @description Determine whether an incoming/purchased item is already delivered by comparing ETA to the game's current time.
 */
function isIncomingItemDelivered(eta?: string | null): boolean | null {
  if (!eta) return null;

  // Parse ETA using gameTime.parseGameDate if available (preferred), else Date.parse
  let parsedMs: number | null = null;
  try {
    if (typeof (gameTime as any).parseGameDate === 'function') {
      const result = (gameTime as any).parseGameDate(eta);
      if (typeof result === 'number') {
        parsedMs = Number.isNaN(result) ? null : result;
      } else if (result instanceof Date) {
        parsedMs = result.getTime();
      } else if (typeof result === 'string') {
        const p = Date.parse(result);
        parsedMs = Number.isNaN(p) ? null : p;
      } else {
        const p = Date.parse(String(eta));
        parsedMs = Number.isNaN(p) ? null : p;
      }
    } else {
      const p = Date.parse(String(eta));
      parsedMs = Number.isNaN(p) ? null : p;
    }
  } catch {
    const p = Date.parse(String(eta));
    parsedMs = Number.isNaN(p) ? null : p;
  }

  if (parsedMs === null) return null;

  // Obtain "now" from game clock if available
  let nowMs = Date.now();
  try {
    if (typeof (gameClock as any).nowUtcMs === 'function') {
      nowMs = (gameClock as any).nowUtcMs();
    } else if (typeof (gameClock as any).now === 'function') {
      nowMs = (gameClock as any).now();
    } else if ((gameClock as any).default && typeof (gameClock as any).default.nowUtcMs === 'function') {
      nowMs = (gameClock as any).default.nowUtcMs();
    } else if ((gameClock as any).default && typeof (gameClock as any).default.now === 'function') {
      nowMs = (gameClock as any).default.now();
    }
  } catch {
    nowMs = Date.now();
  }

  return parsedMs <= nowMs;
}

/**
 * applyFleetFilter
 * @description Filter a list of fleet items by the given filter parameters.
 */
function applyFleetFilter(
  items: any[],
  filter: { query: string; minCondition: number | null; source: SourceFilter },
  ownedList: any[] | null
) {
  if (!Array.isArray(items)) return [];
  const q = (filter.query ?? '').trim().toLowerCase();
  return items.filter((it) => {
    try {
      // Source filter
      if (filter.source === 'owned') {
        const owned =
          Array.isArray(ownedList) &&
          ownedList.some((o) => String(o?.id ?? o?._id ?? o?.vehicleId ?? '') === String(it?.id ?? it?._id ?? it?.vehicleId ?? ''));
        if (!owned) return false;
      } else if (filter.source === 'incoming') {
        if (!(Boolean(it?.status === 'incoming') || isIncoming(it))) return false;
      }

      // Condition filter
      if (filter.minCondition != null) {
        const cond = Number(it?.condition ?? it?.marketEntry?.condition ?? NaN);
        if (Number.isNaN(cond)) return false;
        if (cond < filter.minCondition) return false;
      }

      // Text query (brand + model + title)
      if (q) {
        const text = `${it?.brand ?? ''} ${it?.model ?? ''} ${it?.title ?? ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Garage
 * @description Top-level Garage page component with per-tab filters.
 */
const Garage: React.FC = () => {
  const { gameState, createCompany } = useGame();

  const getInitialTab = (): 'trucks' | 'trailers' => {
    try {
      if (typeof window === 'undefined') return 'trucks';
      const stored = localStorage.getItem('garage_active_tab');
      return stored === 'trailers' ? 'trailers' : 'trucks';
    } catch {
      return 'trucks';
    }
  };
  const [active, setActive] = useState<'trucks' | 'trailers'>(getInitialTab);

  // Per-tab persisted filters
  type FleetFilter = { query: string; minCondition: number | null; source: SourceFilter };

  const loadFilter = (key: string): FleetFilter => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { query: '', minCondition: null, source: 'all' };
      return JSON.parse(raw) as FleetFilter;
    } catch {
      return { query: '', minCondition: null, source: 'all' };
    }
  };

  const [truckFilter, setTruckFilter] = React.useState<FleetFilter>(() => loadFilter('garage_truck_filter'));
  const [trailerFilter, setTrailerFilter] = React.useState<FleetFilter>(() => loadFilter('garage_trailer_filter'));

  React.useEffect(() => {
    try {
      localStorage.setItem('garage_truck_filter', JSON.stringify(truckFilter));
    } catch {}
  }, [truckFilter]);

  React.useEffect(() => {
    try {
      localStorage.setItem('garage_trailer_filter', JSON.stringify(trailerFilter));
    } catch {}
  }, [trailerFilter]);

  React.useEffect(() => {
    try {
      localStorage.setItem('garage_active_tab', active);
    } catch {}
  }, [active]);

  const company = gameState?.company ?? null;

  // Owned lists (defensive)
  const ownedTrucks: TruckCardData[] = Array.isArray(company?.trucks) ? (company!.trucks as any[]) : [];
  const ownedTrailers: TrailerCardData[] = Array.isArray(company?.trailers) ? (company!.trailers as any[]) : [];

  // Gather incoming from many possible arrays
  const incomingItems = useMemo(() => {
    const candidates: any[] = [];
    const lists = [
      gameState?.incomingDeliveries,
      gameState?.purchasedDeliveries,
      company?.incomingDeliveries,
      company?.purchasedDeliveries,
      company?.incoming,
      company?.deliveries,
      company?.purchaseQueue,
      company?.incoming_items,
      company?.incoming_items_queue,
      company?.purchased
    ];
    for (const l of lists) {
      if (!Array.isArray(l)) continue;
      for (const it of l) {
        if (it) candidates.push(it);
      }
    }
    return candidates;
  }, [gameState, company]);

  // Split incoming into trucks/trailers
  const { incomingTrucks, incomingTrailers } = useMemo(() => {
    const trucks: any[] = [];
    const trailers: any[] = [];
    for (const it of incomingItems) {
      try {
        if (isTrailer(it)) {
          trailers.push(it);
        } else {
          trucks.push(it);
        }
      } catch {
        trucks.push(it);
      }
    }
    return { incomingTrucks: trucks, incomingTrailers: trailers };
  }, [incomingItems]);

  // Build display lists (dedupe by id)
  const dedupeById = (arr: any[]) => {
    const seen = new Set<string>();
    return arr.filter((i) => {
      const id = String(i?.id ?? i?._id ?? i?.vehicleId ?? i?.marketEntry?.id ?? Math.random().toString(36).slice(2, 9));
      if (!id) return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  const trucksForDisplay = useMemo(() => {
    // Build the merged list and ensure trailers are never shown in the Trucks tab.
    // This protects against normalization or malformed data where trailer objects
    // might accidentally be present in company.trucks or incoming lists.
    const merged = dedupeById([...(ownedTrucks as any[]), ...incomingTrucks]);
    return merged.filter((item) => !isTrailer(item));
  }, [ownedTrucks, incomingTrucks]);
  const trailersForDisplay = useMemo(() => dedupeById([...(ownedTrailers as any[]), ...incomingTrailers]), [ownedTrailers, incomingTrailers]);

  // Filtered lists (applied to the UI only)
  const filteredTrucks = useMemo(() => applyFleetFilter(trucksForDisplay, truckFilter, ownedTrucks), [trucksForDisplay, truckFilter, ownedTrucks]);
  const filteredTrailers = useMemo(() => applyFleetFilter(trailersForDisplay, trailerFilter, ownedTrailers), [trailersForDisplay, trailerFilter, ownedTrailers]);

  const handleSetActive = (tab: 'trucks' | 'trailers') => {
    setActive(tab);
  };

  const handleSell = (idOrAsset: string | any) => {
    try {
      const resolvedId = typeof idOrAsset === 'string'
        ? idOrAsset
        : idOrAsset?.id ?? idOrAsset?._id ?? idOrAsset?.vehicleId ?? idOrAsset?.marketEntry?.id ?? null;

      if (!resolvedId || !company || typeof createCompany !== 'function') {
        // nothing we can do
        return;
      }

      const updatedCompany: any = JSON.parse(JSON.stringify(company));

      const itemMatchesId = (item: any) => {
        if (!item) return false;
        const candidate = item.id ?? item._id ?? item.vehicleId ?? item.marketEntry?.id ?? item?.sku ?? null;
        return String(candidate) === String(resolvedId) || String(item) === String(resolvedId);
      };

      if (Array.isArray(updatedCompany.trucks)) {
        updatedCompany.trucks = updatedCompany.trucks.filter((t: any) => !itemMatchesId(t));
      }
      if (Array.isArray(updatedCompany.trailers)) {
        updatedCompany.trailers = updatedCompany.trailers.filter((tr: any) => !itemMatchesId(tr));
      }

      const incomingListKeys = [
        'incomingDeliveries', 'purchasedDeliveries', 'incoming', 'purchasedItems', 'deliveries', 'purchaseQueue', 'incoming_items', 'incoming_items_queue', 'purchased'
      ];

      for (const k of incomingListKeys) {
        if (Array.isArray(updatedCompany[k])) {
          updatedCompany[k] = updatedCompany[k].filter((it: any) => !itemMatchesId(it));
        }
      }

      createCompany(updatedCompany);
      // eslint-disable-next-line no-console
      console.info('[Garage] Removed asset', resolvedId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Garage] handleSell error', err);
    }
  };

  /**
   * extractCargoTypes
   * @description Try to find cargo types from multiple common fields on a vehicle object.
   *              This is used for both trucks and trailers in the Garage UI so cards can
   *              render inline cargo-type chips even if the runtime object uses alternative keys.
   */
  const extractCargoTypes = (v: any): string[] => {
    if (!v) return [];
    const sources = [
      v.cargoTypes,
      v.cargo_types,
      v.specifications?.cargoTypes,
      v.specifications?.cargo_types,
      v.marketEntry?.specifications?.cargoTypes,
      v.marketEntry?.specifications?.cargo_types,
      v.marketEntry?.cargoTypes,
      v.allowedCargo,
      v.allowed_cargo,
      v.categories,
      v.specs?.cargoTypes,
      v.specs?.cargo_types,
      v._raw?.cargoTypes,
      v._raw?.specifications?.cargoTypes
    ];

    const out = new Set<string>();
    for (const s of sources) {
      if (!s) continue;
      if (Array.isArray(s)) {
        for (const it of s) {
          if (!it) continue;
          if (typeof it === 'string') {
            const parts = it.split(/[,/|;]/).map(p => p.trim()).filter(Boolean);
            for (const p of parts) out.add(p);
          } else if (typeof it === 'object' && it.label) {
            out.add(String(it.label).trim());
          }
        }
      } else if (typeof s === 'string') {
        s.split(/[,/|;]/).map(x => x.trim()).filter(Boolean).forEach(x => out.add(x));
      } else if (typeof s === 'object') {
        for (const k of Object.keys(s)) {
          if (s[k]) out.add(k);
        }
      }
    }

    return Array.from(out).slice(0, 8);
  };

  return (
    // Full-bleed container: remove outer padding so children can stretch to window edges.
    <main className="flex-1 p-0 overflow-auto">
      <div className="flex flex-col h-full">
        <div className="w-full px-0 pt-0 mb-6">
          <GarageHeader />
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <section className="flex-1 bg-slate-800 rounded-none md:rounded-xl p-6 border border-slate-700 overflow-auto w-full">
            <div className="space-y-6">
              {/* Tab bar */}
              <div role="tablist" className="bg-slate-800 rounded-xl p-2 border border-slate-700 flex gap-2 w-full">
                <TabButton id="trucks" active={active === 'trucks'} onClick={() => handleSetActive('trucks')} icon={<Truck className="w-4 h-4" />}>
                  Trucks
                </TabButton>

                <TabButton id="trailers" active={active === 'trailers'} onClick={() => handleSetActive('trailers')} icon={<PackageIcon className="w-4 h-4" />}>
                  Trailers
                </TabButton>
              </div>

              {/* Per-tab filter bar */}
              <div className="mt-4">
                {active === 'trucks' ? (
                  <SearchFilterBar
                    id="trucks"
                    query={truckFilter.query}
                    minCondition={truckFilter.minCondition}
                    source={truckFilter.source}
                    onQueryChange={(q) => setTruckFilter((s) => ({ ...s, query: q }))}
                    onMinConditionChange={(v) => setTruckFilter((s) => ({ ...s, minCondition: v }))}
                    onSourceChange={(s) => setTruckFilter((st) => ({ ...st, source: s }))}
                  />
                ) : (
                  <SearchFilterBar
                    id="trailers"
                    query={trailerFilter.query}
                    minCondition={trailerFilter.minCondition}
                    source={trailerFilter.source}
                    onQueryChange={(q) => setTrailerFilter((s) => ({ ...s, query: q }))}
                    onMinConditionChange={(v) => setTrailerFilter((s) => ({ ...s, minCondition: v }))}
                    onSourceChange={(s) => setTrailerFilter((st) => ({ ...st, source: s }))}
                  />
                )}
              </div>

              {/* Panels */}
              <div>
                <ErrorBoundary>
                  <div role="tabpanel" id="fleet-tab-trucks" aria-hidden={active !== 'trucks'} className={active === 'trucks' ? '' : 'hidden'}>
                    <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                      <div className="space-y-3">
                        {filteredTrucks.length === 0 ? (
                          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 text-slate-300">
                            No trucks match the current filters.
                          </div>
                        ) : (
                          /* Ensure grid and wrappers use full width so TruckCard and badge rows have full horizontal space */
                          <div className="grid gap-3 w-full">
                            {filteredTrucks.map((t) => {
                              const isOwned = Array.isArray(ownedTrucks) && ownedTrucks.some(ot => String(ot.id) === String(t.id));
                              const deliveredCheck = isIncomingItemDelivered((t as any).deliveryEta ?? (t as any).marketEntry?.deliveryEta ?? null);
                              const isIncomingPending = deliveredCheck === false && !isOwned;
                              const wrapperClass = isIncomingPending ? 'opacity-60' : '';

                              // Extract cargo types for small/medium trucks (passed explicitly)
                              const cargoTypes = extractCargoTypes(t);

                              // Ensure wrapper uses full width so TruckCard and its badges can expand the full card width.
                              return (
                                <div key={t.id} className={`${wrapperClass} w-full`}>
                                  <TruckCard truck={t as TruckCardData} onSell={(id) => handleSell(id)} cargoTypes={cargoTypes} />
                                  {isIncomingPending && (
                                    <div className="mt-1 text-xs text-slate-400">Incoming — ETA: {(t as any).deliveryEta ?? 'Unknown'}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <div role="tabpanel" id="fleet-tab-trailers" aria-hidden={active !== 'trailers'} className={active === 'trailers' ? '' : 'hidden'}>
                    <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                      <div className="space-y-3">
                        {filteredTrailers.length === 0 ? (
                          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 text-slate-300">
                            No trailers match the current filters.
                          </div>
                        ) : (
                          <div className="grid gap-3">
                            {filteredTrailers.map((tr) => {
                              const isOwned = Array.isArray(ownedTrailers) && ownedTrailers.some(ot => String(ot.id) === String(tr.id));
                              const deliveredCheck = isIncomingItemDelivered((tr as any).deliveryEta ?? (tr as any).marketEntry?.deliveryEta ?? null);
                              const isIncomingPending = deliveredCheck === false && !isOwned;
                              const wrapperClass = isIncomingPending ? 'opacity-60' : '';

                              /**
                               * Determine whether this trailer is currently assigned to an active job.
                               * We inspect company.activeJobs for common fields that may reference trailers:
                               * - assignedTrailer
                               * - trailerId
                               *
                               * Jobs with status 'completed' or 'cancelled' are ignored.
                               */
                              const isAssigned = Array.isArray(company?.activeJobs) && company!.activeJobs.some((job: any) => {
                                try {
                                  const jobStatus = String(job?.status ?? '').toLowerCase();
                                  if (jobStatus === 'completed' || jobStatus === 'cancelled') return false;
                                  const candidateIds = [
                                    job?.assignedTrailer,
                                    job?.trailerId,
                                    job?.trailer?.id,
                                    job?.payload?.trailerId
                                  ];
                                  return candidateIds.some((cid: any) => cid != null && String(cid) === String(tr.id));
                                } catch {
                                  return false;
                                }
                              });

                              // Ensure we extract cargo types robustly and pass them into TrailerCard so chips show.
                              // Primary source: inline/extracted cargo types from the trailer object.
                              // Fallback: canonical market dataset (TRAILERS) — lookup by id then brand+model
                              const inlineCargoTypes = extractCargoTypes(tr);

                              const marketFallbackCargoTypes = React.useMemo(() => {
                                try {
                                  const id = String(tr?.id ?? '').trim();
                                  let candidate: any = null;

                                  if (id) {
                                    candidate = TRAILERS.find((t) => String(t.id) === id);
                                  }

                                  if (!candidate) {
                                    const b = String(tr?.brand ?? '').toLowerCase();
                                    const m = String(tr?.model ?? '').toLowerCase();
                                    candidate = TRAILERS.find(
                                      (t) =>
                                        String(t.brand ?? '').toLowerCase() === b &&
                                        String(t.model ?? '').toLowerCase() === m
                                    );
                                  }

                                  if (!candidate) return [];

                                  const set = new Set<string>();
                                  if (candidate.trailerClass) set.add(String(candidate.trailerClass));
                                  // common payload/spec fields that may indicate cargo types
                                  const feats = candidate.specifications?.features ?? candidate.specifications?.cargoTypes ?? [];
                                  if (Array.isArray(feats)) {
                                    for (const f of feats) {
                                      if (typeof f === 'string' && f.trim()) set.add(f.trim());
                                      else if (typeof f === 'object' && f?.label) set.add(String(f.label).trim());
                                    }
                                  } else if (typeof feats === 'string') {
                                    feats.split(/[,/|;]/).map(s => s.trim()).filter(Boolean).forEach(s => set.add(s));
                                  }

                                  // also try top-level class/categories
                                  if (candidate.categories) {
                                    if (Array.isArray(candidate.categories)) {
                                      candidate.categories.forEach((c: any) => typeof c === 'string' && set.add(c));
                                    } else if (typeof candidate.categories === 'string') {
                                      candidate.categories.split(/[,/|;]/).map(s => s.trim()).filter(Boolean).forEach(s => set.add(s));
                                    }
                                  }

                                  return Array.from(set).slice(0, 8);
                                } catch {
                                  return [];
                                }
                              }, [tr]);

                              const cargoTypes = inlineCargoTypes.length > 0 ? inlineCargoTypes : marketFallbackCargoTypes;

                              return (
                                <div key={tr.id} className={wrapperClass}>
                                  <TrailerCard trailer={tr as TrailerCardData} onSell={(id) => handleSell(id)} isAssigned={isAssigned} cargoTypes={cargoTypes} hideCargoChips={true} />
                                  {isIncomingPending && (
                                    <div className="mt-1 text-xs text-slate-400">Incoming — ETA: {(tr as any).deliveryEta ?? 'Unknown'}</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </ErrorBoundary>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Garage;