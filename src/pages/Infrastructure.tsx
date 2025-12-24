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
 * - This page now mounts a non-visual helper (HubsDowngradeFix) which ensures
 *   the Downgrade button always performs a safe fallback downgrade when the
 *   page/button flow does not execute the expected logic. Mounting it here
 *   scopes the helper to the Infrastructure area and keeps its behaviour
 *   active when the page is open.
 */

import React, { useMemo, useState } from 'react';
import { MapPin, Home } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import HubsPanel from '../components/infrastructure/HubsPanel';
import FacilitiesPanel from '../components/infrastructure/FacilitiesPanel';
import HubsDowngradeFix from '../components/infrastructure/HubsDowngradeFix';
import BuildHubBox from '../components/infrastructure/BuildHubBox';
import PendingTasksPanel from '../components/infrastructure/PendingTasksPanel';
import { ALL_FACILITIES } from '../data/hubLevels';

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
  /**
   * Derive hubsCount and facilitiesCount from the same data sources used by the
   * HubsPanel and FacilitiesPanel so header numbers match rendered panels.
   *
   * - hubsCount: tolerant lookup (prefer company.hubs array, fallback to company.hub,
   *   infrastructure.hubs, then top-level gameState.hubs).
   * - facilitiesCount: tolerant lookup of built facilities for the player's company.
   *   We try common locations where "built" facilities may be stored:
   *     - company.builtFacilities (array of ids or names)
   *     - company.facilities (array of objects with a `built` flag or simple strings)
   *     - infrastructure.builtFacilities
   *     - hubs[].builtFacilities (aggregate across hubs)
   *   If none are found, fall back to 0.
   */
  const { hubsCount, facilitiesCount } = useMemo(() => {
    if (!gameState) return { hubsCount: 0, facilitiesCount: 0 };

    // Determine hubs list using the same tolerant rules used in HubsPanel
    let hubsArr: any[] = [];
    if (Array.isArray(gameState?.company?.hubs) && gameState.company.hubs.length > 0) {
      hubsArr = gameState.company.hubs;
    } else if (gameState?.company?.hub && typeof gameState.company.hub === 'object') {
      hubsArr = [gameState.company.hub];
    } else if (Array.isArray(gameState?.infrastructure?.hubs) && gameState.infrastructure.hubs.length > 0) {
      hubsArr = gameState.infrastructure.hubs;
    } else if (Array.isArray(gameState?.hubs) && gameState.hubs.length > 0) {
      hubsArr = gameState.hubs;
    } else {
      hubsArr = [];
    }

    // Tolerant lookup for built facilities
    const builtSet = new Set<string>();
    const company = gameState?.company ?? null;

    // 1) company.builtFacilities as an array of ids/names
    if (company && Array.isArray(company.builtFacilities) && company.builtFacilities.length > 0) {
      company.builtFacilities.forEach((f: any) => {
        if (f == null) return;
        builtSet.add(String(typeof f === 'object' ? (f.id ?? f.name ?? JSON.stringify(f)) : f));
      });
    }

    // 2) company.facilities (array of objects or strings) where objects may have built flag
    if (company && Array.isArray(company.facilities) && company.facilities.length > 0) {
      company.facilities.forEach((f: any) => {
        if (f == null) return;
        if (typeof f === 'string') {
          // string entries may represent built facility ids/names
          builtSet.add(f);
        } else if (f?.built) {
          builtSet.add(String(f.id ?? f.name ?? JSON.stringify(f)));
        } else if (f?.status === 'built' || f?.isBuilt) {
          builtSet.add(String(f.id ?? f.name ?? JSON.stringify(f)));
        }
      });
    }

    // 3) infrastructure.builtFacilities (top-level)
    if (Array.isArray(gameState?.infrastructure?.builtFacilities) && gameState.infrastructure.builtFacilities.length > 0) {
      gameState.infrastructure.builtFacilities.forEach((f: any) => {
        if (f == null) return;
        builtSet.add(String(typeof f === 'object' ? (f.id ?? f.name ?? JSON.stringify(f)) : f));
      });
    }

    // 4) per-hub builtFacilities aggregation
    hubsArr.forEach((h: any) => {
      if (!h) return;
      if (Array.isArray(h.builtFacilities) && h.builtFacilities.length > 0) {
        h.builtFacilities.forEach((f: any) => {
          if (f == null) return;
          builtSet.add(String(typeof f === 'object' ? (f.id ?? f.name ?? JSON.stringify(f)) : f));
        });
      }
      // Some hubs may store built/unlocked entries under unlockedFacilities with a `built` flag
      if (Array.isArray(h.unlockedFacilities) && h.unlockedFacilities.length > 0) {
        h.unlockedFacilities.forEach((f: any) => {
          if (f == null) return;
          if (typeof f === 'string') return; // unlocked-only entry; skip unless explicit built
          if (f?.built) builtSet.add(String(f.id ?? f.name ?? JSON.stringify(f)));
        });
      }
    });

    const facilitiesCountResolved = builtSet.size;

    return { hubsCount: hubsArr.length, facilitiesCount: facilitiesCountResolved };
  }, [gameState]);

  const [active, setActive] = useState<'hubs' | 'facilities'>('hubs');

  return (
    <main className="flex-1 p-0 overflow-auto">
      <div className="flex flex-col h-full min-h-0">
        {/* Header - note: removed horizontal outer padding so header can align full-bleed */}
        <div className="w-full pt-0 mb-6">
          <div className="w-full px-6">{/* Keep px-6 only for header text alignment to the card content */}
            <InfrastructureHeader hubsCount={hubsCount} facilitiesCount={facilitiesCount} />
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Primary content card — keep p-6 internally so paragraph spacing is preserved.
              Card itself is full-bleed within the page because outer main uses p-0. */}
          <section className="flex-1 bg-slate-800 rounded-none md:rounded-xl p-6 border border-slate-700 overflow-auto w-full">
            <div className="space-y-6">
              {/* Non-visual helper: ensure Downgrade fallbacks work even when parent handlers are not wired.
                  Mounting HubsDowngradeFix here ensures the fallback downgrade mutation runs when the
                  Downgrade button title is clicked inside HubDetailsModal. */}
              <HubsDowngradeFix />

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

                  {/* Build Hub box — sits below the hubs list and lets players construct a hub
                      in any city from the in-game database. */}
                  <div className="mt-6">
                    <BuildHubBox />
                  </div>
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

          {/* Secondary boxed area — keeps p-6 internally so paragraph spacing is preserved.
               Move the centralized PendingTasksPanel here so it is shown for all facility-related tasks. */}
          <section className="w-full">
            <div className="p-6">
              {/* Centralized pending tasks panel for all facilities/hubs */}
              <PendingTasksPanel />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Infrastructure;