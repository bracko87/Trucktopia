/**
 * Infrastructure.tsx
 *
 * Infrastructure page that shows Hubs and Facilities.
 *
 * Purpose:
 * - Render the Infrastructure page using the exact visual language used on
 *   the Staff Management page (pill tabs with blue active state).
 * - Stretch the page margins so the interactive "window" (tabs / card) spans
 *   the maximum width/height inside the page box while preserving internal
 *   paddings (p-6) so paragraph spacing stays identical.
 *
 * Notes:
 * - Only layout wrappers (outer padding) are adjusted to achieve the full-bleed
 *   effect for the card area. Inner card paddings remain unchanged.
 */

import React, { useMemo, useState } from 'react';
import { MapPin, Home } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import HubsPanel from '../components/infrastructure/HubsPanel';
import FacilitiesPanel from '../components/infrastructure/FacilitiesPanel';

/**
 * formatNumber
 *
 * @description Format a nullable number safely for display.
 * @param value number | undefined | null
 * @returns string
 */
function formatNumber(value: number | undefined | null): string {
  const v = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return String(v);
}

/**
 * TabButtonProps
 *
 * @description Props for TabButton (small local pill button).
 */
interface TabButtonProps {
  id: 'hubs' | 'facilities';
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * TabButton
 *
 * @description Reusable pill tab button that matches Staff Management visual
 *              treatment: rounded-full pill, blue active (bg-blue-600 text-white),
 *              slate inactive (text-slate-400) with hover state.
 *
 * @param props TabButtonProps
 */
const TabButton: React.FC<TabButtonProps> = ({ id, active, onClick, children, icon }) => {
  const base =
    'px-4 py-2 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-150 w-full flex-1';
  const activeClass = 'bg-blue-600 text-white shadow-md ring-1 ring-white/5';
  const inactiveClass = 'text-slate-400 hover:text-white hover:bg-slate-700/50';
  return (
    <button
      role="tab"
      aria-selected={active}
      aria-controls={`infrastructure-tab-${id}`}
      onClick={onClick}
      className={`${base} ${active ? activeClass : inactiveClass}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
};

/**
 * InfrastructureHeader
 *
 * @description Page header for Infrastructure that matches Staff/Garage headers.
 *              Title uses text-2xl font-bold, subtitle uses text-sm text-slate-400.
 *
 * @param props.hubsCount Number of hubs
 * @param props.facilitiesCount Number of facilities
 */
const InfrastructureHeader: React.FC<{ hubsCount: number; facilitiesCount: number }> = ({
  hubsCount,
  facilitiesCount,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 w-full">
      <div>
        <h1 className="text-2xl font-bold text-white">Infrastructure</h1>
        <p className="text-sm text-slate-400">Manage hubs and facilities across your network</p>
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="text-sm text-slate-400">Hubs</div>
          <div className="text-2xl font-bold text-indigo-400">{formatNumber(hubsCount)}</div>
        </div>

        <div className="text-right">
          <div className="text-sm text-slate-400">Facilities</div>
          <div className="text-2xl font-bold text-amber-400">{formatNumber(facilitiesCount)}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * Infrastructure
 *
 * @description Top-level Infrastructure page component.
 *
 * Layout decisions:
 * - Outer <main> removes the default page padding (p-6 -> p-0) so the internal
 *   primary card can span the maximum width of the available page box while
 *   keeping the internal card paddings (p-6) intact to preserve paragraph spacing.
 */
const Infrastructure: React.FC = () => {
  const { gameState } = useGame() as any;

  // Derive counts safely from gameState (tolerant lookups)
  const { hubsCount, facilitiesCount } = useMemo(() => {
    const hubsArr = Array.isArray(gameState?.infrastructure?.hubs)
      ? gameState.infrastructure.hubs
      : Array.isArray(gameState?.hubs)
      ? gameState.hubs
      : Array.isArray(gameState?.company?.hubs)
      ? gameState.company.hubs
      : [];

    const facilitiesArr = Array.isArray(gameState?.infrastructure?.facilities)
      ? gameState.infrastructure.facilities
      : Array.isArray(gameState?.facilities)
      ? gameState.facilities
      : Array.isArray(gameState?.company?.facilities)
      ? gameState.company.facilities
      : [];

    return { hubsCount: hubsArr.length, facilitiesCount: facilitiesArr.length };
  }, [gameState]);

  const [active, setActive] = useState<'hubs' | 'facilities'>('hubs');

  return (
    <main className="flex-1 p-0 overflow-auto">
      <div className="flex flex-col h-full min-h-0">
        {/* Header - note: removed horizontal outer padding so header can align full-bleed */}
        <div className="w-full pt-0 mb-6">
          <div className="w-full px-6"> {/* Keep px-6 only for header text alignment to the card content */}
            <InfrastructureHeader hubsCount={hubsCount} facilitiesCount={facilitiesCount} />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Primary content card — keep p-6 internally so paragraph spacing is preserved.
              Card itself is full-bleed within the page because outer main uses p-0. */}
          <section className="flex-1 bg-slate-800 rounded-none md:rounded-xl p-6 border border-slate-700 overflow-auto w-full">
            <div className="space-y-6">
              {/* Tabs — use the exact Staff Management tab visual language (blue active, slate inactive)
                  and make them pill-shaped (rounded-full). */}
              <div className="border-b border-slate-700">
                <div className="flex gap-2 p-1">
                  <TabButton
                    id="hubs"
                    active={active === 'hubs'}
                    onClick={() => setActive('hubs')}
                    icon={<MapPin className="w-4 h-4" />}
                  >
                    Hubs
                  </TabButton>

                  <TabButton
                    id="facilities"
                    active={active === 'facilities'}
                    onClick={() => setActive('facilities')}
                    icon={<Home className="w-4 h-4" />}
                  >
                    Facilities
                  </TabButton>
                </div>
              </div>

              {/* Panels */}
              <div>
                <div
                  role="tabpanel"
                  id="infrastructure-tab-hubs"
                  aria-hidden={active !== 'hubs'}
                  className={active === 'hubs' ? '' : 'hidden'}
                >
                  <HubsPanel />
                </div>

                <div
                  role="tabpanel"
                  id="infrastructure-tab-facilities"
                  aria-hidden={active !== 'facilities'}
                  className={active === 'facilities' ? '' : 'hidden'}
                >
                  <FacilitiesPanel />
                </div>
              </div>
            </div>
          </section>

          {/* Secondary boxed area — keeps p-6 internally so paragraph spacing is preserved */}
          <section className="w-full">
            <div className="p-6">
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Pending Tasks</h3>
                    <div className="text-sm text-slate-400">Maintenance, build queues and scheduled work</div>
                  </div>
                  <div className="text-sm text-slate-400">—</div>
                </div>

                <div className="text-slate-300 text-sm">No pending tasks.</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Infrastructure;