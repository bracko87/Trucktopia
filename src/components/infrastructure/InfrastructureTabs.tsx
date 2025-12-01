/**
 * InfrastructureTabs.tsx
 *
 * Reusable tabs component for Infrastructure page (Hubs / Facilities).
 *
 * Responsibilities:
 * - Render two pill tabs (Hubs / Facilities).
 * - Lazy-load panel components to keep initial load light.
 * - Preserve accessibility attributes (role/tablist/tabpanel).
 */

import React, { Suspense, useState } from 'react';
import { MapPin, Home } from 'lucide-react';
import ErrorBoundary from '../ErrorBoundary';

const HubsPanelLazy = React.lazy(() => import('./HubsPanel'));
const FacilitiesPanelLazy = React.lazy(() => import('./FacilitiesPanel'));

/**
 * InfrastructureTabs
 *
 * @description Tabs used by the Infrastructure page to switch between Hubs and Facilities.
 */
const InfrastructureTabs: React.FC = () => {
  const [active, setActive] = useState<'hubs' | 'facilities'>('hubs');

  const TabButton: React.FC<{ id: 'hubs' | 'facilities'; active: boolean; onClick: () => void; children: React.ReactNode }> =
    ({ id, active, onClick, children }) => {
      const base = 'px-4 py-2 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-150 w-full';
      const activeClass = 'bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-md ring-1 ring-white/5';
      const inactiveClass = 'text-slate-400 hover:text-white hover:bg-slate-700/50';
      return (
        <button
          role="tab"
          aria-selected={active}
          aria-controls={`infrastructure-tab-${id}`}
          onClick={onClick}
          className={`${base} ${active ? activeClass : inactiveClass} flex-1`}
        >
          {children}
        </button>
      );
    };

  return (
    <div className="space-y-6">
      <div role="tablist" className="bg-slate-800 rounded-xl p-2 border border-slate-700 flex gap-2 w-full">
        <TabButton id="hubs" active={active === 'hubs'} onClick={() => setActive('hubs')}>
          <MapPin className="w-4 h-4" />
          <span>Hubs</span>
        </TabButton>

        <TabButton id="facilities" active={active === 'facilities'} onClick={() => setActive('facilities')}>
          <Home className="w-4 h-4" />
          <span>Facilities</span>
        </TabButton>
      </div>

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
              id="infrastructure-tab-hubs"
              aria-hidden={active !== 'hubs'}
              className={active === 'hubs' ? '' : 'hidden'}
            >
              <HubsPanelLazy />
            </div>

            <div
              role="tabpanel"
              id="infrastructure-tab-facilities"
              aria-hidden={active !== 'facilities'}
              className={active === 'facilities' ? '' : 'hidden'}
            >
              <FacilitiesPanelLazy />
            </div>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default InfrastructureTabs;