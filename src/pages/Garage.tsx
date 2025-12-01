/**
 * src/pages/Garage.tsx
 *
 * Garage page
 *
 * Purpose:
 * - Render the Garage page with a tab bar that matches the Staff Management visual language:
 *   rounded-full pill tabs, blue active (bg-blue-600) and slate inactive (text-slate-400),
 *   icons on the left, accessible (role/tablist, tabpanel).
 * - Keep the full-bleed page container so inner boxes can expand edge-to-edge while
 *   preserving internal paddings (p-6) so paragraph spacing inside boxes remains unchanged.
 *
 * Notes:
 * - This file intentionally keeps the tab button local and small to ensure exact visual parity
 *   with Staff Management without altering other shared components.
 */

/**
 * Garage page: Re-implementation using TypeScript + React.
 *
 * File-level comments, component comments and function comments are present per project rules.
 */

import React, { Suspense, useState } from 'react';
import { Truck, Package as PackageIcon } from 'lucide-react';
import ErrorBoundary from '../components/ErrorBoundary';
import GarageHeader from '../components/fleet/GarageHeader';
import PurchasedDeliveriesBox from '../components/fleet/PurchasedDeliveriesBox';

/**
 * TabButtonProps
 * @description Props for the small local TabButton used in Garage to match Staff Management visuals.
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
 * @description Presentational pill button matching Staff Management visual treatment:
 * - rounded-full pill
 * - blue active (bg-blue-600 text-white)
 * - slate inactive (text-slate-400) with hover state
 *
 * Accessibility:
 * - role="tab" and aria-controls / aria-selected provided by parent usage.
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
 * Lazy-imported sections to avoid inflating bundle size.
 * These mirror the sections used by FleetTabs; we only replace the tab bar visual locally.
 */
const TruckSectionLazy = React.lazy(() => import('../components/fleet/TruckSection') as Promise<any>);
const TrailerSectionLazy = React.lazy(() => import('../components/fleet/TrailerSection') as Promise<any>);

/**
 * Garage
 * @description Top-level Garage page component. Uses full-bleed outer container (p-0) so
 * boxes stretch to the available window area.
 */
const Garage: React.FC = () => {
  const [active, setActive] = useState<'trucks' | 'trailers'>('trucks');

  /**
   * handleSetActive
   * @description Local helper to change the active tab.
   * @param tab 'trucks' | 'trailers'
   */
  const handleSetActive = (tab: 'trucks' | 'trailers') => {
    setActive(tab);
  };

  return (
    // Full-bleed container: remove outer padding so children can stretch to window edges.
    <main className="flex-1 p-0 overflow-auto">
      {/* Column container that fills viewport height */}
      <div className="flex flex-col h-full">
        {/* Header wrapper placed outside the dark card frame.
            px-0 so the header region is full-bleed; mb-6 keeps the same vertical gap
            between the header and the fleet card as Staff Management. */}
        <div className="w-full px-0 pt-0 mb-6">
          <GarageHeader />
        </div>

        {/* Content area: fleet section stretches to fill available space */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Fleet card - fills remaining height and scrolls internally.
              Internal padding preserved (p-6) so paragraph spacing inside boxes is unchanged. */}
          <section className="flex-1 bg-slate-800 rounded-none md:rounded-xl p-6 border border-slate-700 overflow-auto w-full">
            <div className="space-y-6">
              {/* Tab bar: use the exact Staff Management pill visual language.
                  Note: this is intentionally local so styles are identical to Staff page. */}
              <div role="tablist" className="bg-slate-800 rounded-xl p-2 border border-slate-700 flex gap-2 w-full">
                <TabButton
                  id="trucks"
                  active={active === 'trucks'}
                  onClick={() => handleSetActive('trucks')}
                  icon={<Truck className="w-4 h-4" />}
                >
                  Trucks
                </TabButton>

                <TabButton
                  id="trailers"
                  active={active === 'trailers'}
                  onClick={() => handleSetActive('trailers')}
                  icon={<PackageIcon className="w-4 h-4" />}
                >
                  Trailers
                </TabButton>
              </div>

              {/* Panels */}
              <div>
                <ErrorBoundary>
                  <Suspense
                    fallback={
                      <div className="p-6 bg-slate-800 rounded-xl border border-slate-700 text-center text-slate-400">
                        Loading...
                      </div>
                    }
                  >
                    <div
                      role="tabpanel"
                      id="fleet-tab-trucks"
                      aria-hidden={active !== 'trucks'}
                      className={active === 'trucks' ? '' : 'hidden'}
                    >
                      {/* ShowPrimaryButton passed false so the Garage page uses its global purchase controls.
                          Also pass showHeader=false so the small SectionHeader (icon + title) is hidden
                          at the source inside TruckSection. */}
                      <TruckSectionLazy showPrimaryButton={false} showHeader={false} />
                    </div>

                    <div
                      role="tabpanel"
                      id="fleet-tab-trailers"
                      aria-hidden={active !== 'trailers'}
                      className={active === 'trailers' ? '' : 'hidden'}
                    >
                      <TrailerSectionLazy showPrimaryButton={false} />
                    </div>
                  </Suspense>
                </ErrorBoundary>
              </div>
            </div>
          </section>

          {/* Incoming deliveries kept below the fleet section.
              The outer wrapper here provides p-6 so the internal PurchasedDeliveriesBox layout
              (including paragraph spacing) remains identical. */}
          <section className="w-full">
            <div className="p-6">
              <PurchasedDeliveriesBox />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Garage;