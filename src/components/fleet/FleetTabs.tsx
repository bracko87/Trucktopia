/**
 * FleetTabs.tsx
 *
 * Reusable tabs used across Fleet pages (Trucks / Trailers).
 *
 * Responsibilities:
 * - Render two pill tabs (Trucks / Trailers) that visually match the Staff Management
 *   page button curvature (rounded-xl).
 * - Preserve accessibility attributes (role=tablist, role=tab, aria-controls, aria-selected).
 * - Keep the component small and reusable: panels are provided as props to keep it presentational.
 */

import React from 'react';
import { Truck, Package } from 'lucide-react';

 /**
  * FleetTabsProps
  *
  * @description Props for FleetTabs component.
  * - trucksPanel: content to render inside the Trucks panel
  * - trailersPanel: content to render inside the Trailers panel
  * - initial?: initial active tab (defaults to "trucks")
  */
interface FleetTabsProps {
  trucksPanel: React.ReactNode;
  trailersPanel: React.ReactNode;
  initial?: 'trucks' | 'trailers';
}

/**
 * TabButtonProps
 *
 * @description Local small props for the pill tab button.
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
 *
 * @description Small pill-shaped tab button. Uses rounded-xl so corners match Staff Management UI.
 * @param props TabButtonProps
 */
const TabButton: React.FC<TabButtonProps> = ({ id, active, onClick, children, icon }) => {
  const base =
    'px-4 py-2 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-150 w-full';
  const activeClass = 'bg-blue-600 text-white shadow-md ring-1 ring-white/5';
  const inactiveClass = 'text-slate-400 hover:text-white hover:bg-slate-700/50';

  return (
    <button
      role="tab"
      aria-selected={active}
      aria-controls={`fleet-tab-${id}`}
      onClick={onClick}
      className={`${base} ${active ? activeClass : inactiveClass}`}
      type="button"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
};

/**
 * FleetTabs
 *
 * @description Tabs component that switches between Trucks and Trailers panels.
 * Panels are provided as props so the component remains presentational and reusable.
 */
const FleetTabs: React.FC<FleetTabsProps> = ({ trucksPanel, trailersPanel, initial = 'trucks' }) => {
  const [active, setActive] = React.useState<'trucks' | 'trailers'>(initial);

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Fleet tabs" className="flex gap-2 w-full">
        <div className="flex-1">
          <TabButton id="trucks" active={active === 'trucks'} onClick={() => setActive('trucks')} icon={<Truck className="w-4 h-4" />}>
            Trucks
          </TabButton>
        </div>

        <div className="flex-1">
          <TabButton id="trailers" active={active === 'trailers'} onClick={() => setActive('trailers')} icon={<Package className="w-4 h-4" />}>
            Trailers
          </TabButton>
        </div>
      </div>

      <div>
        <div
          role="tabpanel"
          id="fleet-tab-trucks"
          aria-hidden={active !== 'trucks'}
          className={active === 'trucks' ? '' : 'hidden'}
        >
          {trucksPanel}
        </div>

        <div
          role="tabpanel"
          id="fleet-tab-trailers"
          aria-hidden={active !== 'trailers'}
          className={active === 'trailers' ? '' : 'hidden'}
        >
          {trailersPanel}
        </div>
      </div>
    </div>
  );
};

export default FleetTabs;