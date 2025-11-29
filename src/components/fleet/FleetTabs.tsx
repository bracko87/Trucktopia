/**
 * FleetTabs.tsx
 *
 * Top-level tabs component for Trucks / Trailers with a refined visual style.
 *
 * Responsibilities:
 * - Render two full-width pill tabs (Trucks / Trailers).
 * - Allow caller to disable the per-section primary purchase buttons via prop
 *   so a single global purchase action can be used (e.g. in Garage page).
 *
 * Notes:
 * - Keeps lazy-loading of section panels to avoid loading heavy components until used.
 * - Preserves accessibility attributes for tabs/tabpanels.
 */

import React, { Suspense, useState } from 'react';
import { Truck, Package as PackageIcon } from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';

/**
 * Props
 * @description Props for FleetTabs. startOnTrailers optionally begins on Trailers.
 * showSectionPrimaryButtons controls whether child sections render their primary purchase button.
 */
interface Props {
  /** Start on trailers tab when true */
  startOnTrailers?: boolean;
  /** When false, TruckSection/TrailerSection should not render their primary buttons */
  showSectionPrimaryButtons?: boolean;
}

/**
 * TabButton
 *
 * @description Presentational pill button used for both Trucks and Trailers. It expands
 *              to fill available width so tabs split evenly.
 */
const TabButton: React.FC<{
  id: 'trucks' | 'trailers';
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ id, active, onClick, children }) => {
  const base = 'px-4 py-2 rounded-full font-medium flex items-center justify-center space-x-2 transition-all duration-150 w-full';
  const activeClass = 'bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-md ring-1 ring-white/5';
  const inactiveClass = 'text-slate-400 hover:text-white hover:bg-slate-700/50';
  return (
    <button
      role="tab"
      aria-selected={active}
      aria-controls={`fleet-tab-${id}`}
      onClick={onClick}
      className={`${base} ${active ? activeClass : inactiveClass} flex-1`}
    >
      {children}
    </button>
  );
};

/**
 * Lazy-loaded panels.
 * @description Lazily import the TruckSection and TrailerSection to avoid early runtime errors.
 */
const TruckSectionLazy = React.lazy(() => import('./TruckSection').catch((err) => { throw err; }));
const TrailerSectionLazy = React.lazy(() => import('./TrailerSection').catch((err) => { throw err; }));

/**
 * FleetTabs
 *
 * @description Renders tabs and panels. Accepts showSectionPrimaryButtons to toggle per-section CTAs.
 * @param {Props} props Component props
 * @returns React.ReactElement
 */
const FleetTabs: React.FC<Props> = ({ startOnTrailers = false, showSectionPrimaryButtons = true }) => {
  const [active, setActive] = useState<'trucks' | 'trailers'>(startOnTrailers ? 'trailers' : 'trucks');

  return (
    <div className="space-y-6">
      {/* Tab bar: pill buttons split evenly */}
      <div role="tablist" className="bg-slate-800 rounded-xl p-2 border border-slate-700 flex gap-2 w-full">
        <TabButton id="trucks" active={active === 'trucks'} onClick={() => setActive('trucks')}>
          <Truck className="w-4 h-4" />
          <span>Trucks</span>
        </TabButton>

        <TabButton id="trailers" active={active === 'trailers'} onClick={() => setActive('trailers')}>
          <PackageIcon className="w-4 h-4" />
          <span>Trailers</span>
        </TabButton>
      </div>

      {/* Panels: Truck / Trailer sections */}
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
              {/* Pass showSectionPrimaryButtons down so sections can hide their own CTA */}
              <TruckSectionLazy showPrimaryButton={showSectionPrimaryButtons} />
            </div>

            <div
              role="tabpanel"
              id="fleet-tab-trailers"
              aria-hidden={active !== 'trailers'}
              className={active === 'trailers' ? '' : 'hidden'}
            >
              <TrailerSectionLazy showPrimaryButton={showSectionPrimaryButtons} />
            </div>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default FleetTabs;