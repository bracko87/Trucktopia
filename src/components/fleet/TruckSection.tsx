/**
 * src/components/fleet/TruckSection.tsx
 *
 * Truck section container. Renders the truck fleet area (header + list or empty message).
 *
 * Responsibilities:
 * - Display Truck fleet using SectionHeader and TruckCard components.
 * - Be defensive: always use arrays for trucks/trailers so .length/.map never read undefined.
 * - Ensure trailer-like items are excluded from the Truck list using the shared isTrailer heuristic.
 * - Ensure incoming / purchased items are excluded from the truck fleet until delivery completes.
 */

import React from 'react';
import { useNavigate } from 'react-router';
import SectionHeader from './SectionHeader';
import TruckCard, { TruckCardData } from './TruckCard';
import { Truck as TruckIcon } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { isTrailer, isIncoming } from '../../utils/vehicleTypeUtils';

interface TrailerRef {
  id: string;
  trailerClass?: string;
  model?: string;
  capacity?: number;
  tonnage?: number;
}

/**
 * Props
 * @description Optional props so the component can be mounted without data and will fall back to context.
 * showPrimaryButton - when false, the SectionHeader will be rendered without the purchase CTA.
 */
interface Props {
  trucks?: TruckCardData[] | null;
  trailers?: TrailerRef[] | null;
  onSellTruck?: (truckId: string) => void;
  onPurchaseTruck?: () => void;
  showPrimaryButton?: boolean;
}

/**
 * TruckSection
 * @description Renders the Trucks box (header + list or empty message). Defensive - never reads .length of undefined.
 */
const TruckSection: React.FC<Props> = ({
  trucks: trucksProp = null,
  trailers: trailersProp = null,
  onSellTruck,
  onPurchaseTruck,
  showPrimaryButton = true
}) => {
  const navigate = useNavigate();

  // Safely attempt to access GameContext; if it fails we continue with undefined and fallbacks.
  let gameState: any = undefined;
  try {
    // useGame may throw during SSR/hydration; guard it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maybeUseGame: any = useGame;
    if (typeof maybeUseGame === 'function') {
      const ctx = maybeUseGame();
      gameState = ctx?.gameState;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('TruckSection: cannot access GameContext:', err);
    gameState = undefined;
  }

  // Resolve trucks/trailers from context in a tolerant manner and ensure arrays.
  const trucksFromContext: TruckCardData[] =
    Array.isArray(gameState?.company?.trucks)
      ? gameState.company.trucks
      : Array.isArray(gameState?.fleet?.trucks)
      ? gameState.fleet.trucks
      : Array.isArray(gameState?.company?.fleet?.trucks)
      ? gameState.company.fleet.trucks
      : [];

  const trailersFromContext: TrailerRef[] =
    Array.isArray(gameState?.company?.trailers)
      ? gameState.company.trailers
      : Array.isArray(gameState?.fleet?.trailers)
      ? gameState.fleet.trailers
      : Array.isArray(gameState?.company?.fleet?.trailers)
      ? gameState.company.fleet.trailers
      : [];

  // Final arrays used for rendering - guarantee arrays to avoid reading .length on undefined.
  const trucks: TruckCardData[] = Array.isArray(trucksProp)
    ? trucksProp
    : Array.isArray(trucksFromContext)
    ? trucksFromContext
    : [];

  const trailers: TrailerRef[] = Array.isArray(trailersProp)
    ? trailersProp
    : Array.isArray(trailersFromContext)
    ? trailersFromContext
    : [];

  /**
   * Important: Filter out trailer-like items AND incoming / purchased items from the trucks array.
   * This ensures trailers that ended up in company.trucks (or incoming lists) do not display in TruckSection
   * until they are delivered.
   */
  const filteredTrucks = trucks.filter((t) => !isTrailer(t) && !isIncoming(t));

  /**
   * handlePrimaryClick
   * @description Navigate to the vehicle market (or call legacy handler if provided).
   */
  const handlePrimaryClick = () => {
    if (typeof onPurchaseTruck === 'function') {
      onPurchaseTruck();
      return;
    }
    navigate('/vehicle-market');
  };

  /**
   * handleSell
   * @description Safely call provided onSellTruck handler, otherwise log and no-op.
   * @param id truck id
   */
  const handleSell = (id: string) => {
    if (typeof onSellTruck === 'function') {
      onSellTruck(id);
    } else {
      // eslint-disable-next-line no-console
      console.warn('TruckSection: onSellTruck not provided, ignoring sell request for', id);
    }
  };

  return (
    <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <SectionHeader
        title="Truck Fleet"
        subtitle="Manage your truck fleet and maintenance"
        icon={<TruckIcon className="w-6 h-6 text-orange-400" />}
        /* Only provide the primary CTA props when showPrimaryButton is true.
           SectionHeader implementation should hide the button if primaryLabel/onPrimaryClick are not provided. */
        primaryLabel={showPrimaryButton ? 'Purchase Truck' : undefined}
        onPrimaryClick={showPrimaryButton ? handlePrimaryClick : undefined}
      />

      <div className="space-y-3">
        {filteredTrucks.length === 0 ? (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 text-slate-300">
            No trucks in your fleet yet.
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredTrucks.map((t) => {
              // find assigned trailer safely; ignore trailers that are incoming
              const assigned =
                trailers.find((tr) => String(tr.id) === String((t as any).assignedTrailer)) ?? null;
              const assignedLabel = assigned
                ? `${assigned.trailerClass ?? assigned.model ?? 'Trailer'} (${assigned.capacity ?? assigned.tonnage ?? '—'}t)`
                : null;

              return (
                <TruckCard
                  key={t.id}
                  truck={t}
                  assignedTrailerLabel={assignedLabel}
                  onSell={handleSell}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default TruckSection;