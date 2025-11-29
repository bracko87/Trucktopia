/**
 * src/pages/Garage.tsx
 *
 * Fleet management page. Renders the GarageHeader, FleetTabs and Incoming Deliveries box.
 * This file sets a short-lived global flag allowing TrailerSection to render market-style
 * listing cards inside the Garage view when desired. It now also dispatches a custom
 * event so other components (TrailerSection) can react synchronously and re-render.
 *
 * Responsibilities:
 * - Mount page sections (header, fleet tabs, incoming deliveries).
 * - Set window.__ALLOW_MARKET_IN_GARAGE = true while mounted so TrailerSection can
 *   show market-style cards when requested without changing TrailerSection API.
 * - Dispatch a CustomEvent('allowMarketInGarageChanged') so TrailerSection can update.
 */

import React, { useEffect } from 'react';
import FleetTabs from '../components/fleet/FleetTabs';
import GarageHeader from '../components/fleet/GarageHeader';
import PurchasedDeliveriesBox from '../components/fleet/PurchasedDeliveriesBox';
import { useGame } from '../contexts/GameContext';

/**
 * Garage
 *
 * @description Fleet management top-level page. Displays a compact header (title + subtitle)
 *              and mounts FleetTabs. Incoming deliveries are shown below the fleet tabs.
 *
 * @returns React.ReactElement
 */
const Garage: React.FC = () => {
  const { gameState } = useGame();

  useEffect(() => {
    /**
     * Allow market-style listing cards to render inside TrailerSection when the Garage page
     * intentionally opts in. We expose a short-lived global flag and dispatch a custom event
     * so TrailerSection (or other components) can react and re-render immediately.
     *
     * Note: this flag + event are cleaned on unmount.
     */
    try {
      (window as any).__ALLOW_MARKET_IN_GARAGE = true;
      // Notify listeners that the flag changed
      window.dispatchEvent(new CustomEvent('allowMarketInGarageChanged'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Garage: cannot set global allow flag:', err);
    }

    return () => {
      try {
        delete (window as any).__ALLOW_MARKET_IN_GARAGE;
      } catch {
        (window as any).__ALLOW_MARKET_IN_GARAGE = undefined;
      }
      // Notify listeners that the flag changed (cleaned)
      try {
        window.dispatchEvent(new CustomEvent('allowMarketInGarageChanged'));
      } catch {
        // ignore
      }
    };
  }, []);

  // The page intentionally does not mutate company state on mount.
  // If you need to move purchased vehicles into an 'incoming' queue or perform
  // other normalization, that should be done explicitly where purchases are handled.

  return (
    <main className="flex-1 p-6 overflow-auto">
      <div className="space-y-6">
        {/* Compact header: single purchase CTA lives here */}
        <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <GarageHeader />
        </section>

        {/* Fleet tabs component (Trucks / Trailers). Per-section purchase buttons may be hidden
            by passing props to FleetTabs (already supported). */}
        <section className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          {/* No API changes to FleetTabs - it mounts TrailerSection internally.
              We rely on the global flag + event so TrailerSection can react. */}
          <FleetTabs showSectionPrimaryButtons={false} />
        </section>

        {/* Incoming deliveries: purchased items that are currently in transit */}
        <section>
          <PurchasedDeliveriesBox />
        </section>
      </div>
    </main>
  );
};

export default Garage;