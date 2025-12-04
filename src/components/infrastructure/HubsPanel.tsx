/**
 * HubsPanel.tsx
 *
 * Presentational panel for the Infrastructure -> Hubs view.
 *
 * Purpose:
 * - Render the company hubs as full-height cards that stretch to occupy the
 *   available vertical space.
 * - Always render hubs as a single column (one hub per row) so each hub card
 *   takes the full horizontal width and can stretch vertically as much as
 *   the container allows.
 *
 * Notes:
 * - This file is intentionally defensive: it looks for hubs in several places
 *   (company.hubs, company.hub, infrastructure.hubs, gameState.hubs) and
 *   normalizes a singular company.hub into an array so newly created companies
 *   (which often store the main hub under company.hub) will show immediately.
 *
 * Layout strategy to guarantee full-length cards:
 * - The root container becomes a vertical flex column (h-full flex flex-col).
 * - The grid area is set to flex-1 so it grows to fill available space.
 * - Grid uses one column (grid-cols-1) to ensure one card per row regardless
 *   of screen size.
 * - Each grid cell is a flex wrapper and HubCard is h-full + flex column so it
 *   stretches to fill the cell and distribute content top-to-bottom.
 */

import React, { useMemo, useState } from 'react';
import { useGame } from '../../contexts/GameContext';
import HubDetailsModal from './HubDetailsModal';
import { getHubLevel } from '../../data/hubLevels';

/**
 * HubData
 * @description Minimal hub shape expected from game state. Accepts unknown fields.
 */
interface HubData {
  id?: string;
  name?: string;
  title?: string;
  city?: string;
  capacity?: number;
  level?: number;
  active?: boolean;
  description?: string;
  [key: string]: any;
}

/**
 * HubCardProps
 * @description Props for a single hub card (presentational).
 */
interface HubCardProps {
  hub: HubData;
  onSelect?: () => void;
  isPrimary?: boolean;
}

/**
 * HubCard
 * @description Visual, full-height card for a hub.
 *
 * - h-full + flex column ensures the card fills its grid cell vertically.
 * - justify-between keeps title at top and meta/actions pinned to bottom.
 *
 * Important change:
 * - The capacity shown is derived from the authoritative hub level definition
 *   via getHubLevel(level).vehicleLimit (and staff limit via officeSpots).
 *   This prevents stale or placeholder capacity values (e.g. "100 trucks")
 *   from appearing and guarantees the UI shows true limits for the hub level.
 */
const HubCard: React.FC<HubCardProps> = ({ hub, onSelect }) => {
  const title =
    hub.name ||
    hub.title ||
    (hub.city ? `${hub.city} Hub` : `Hub ${hub.id ?? ''}`) ||
    'Hub';

  const level = typeof hub.level === 'number' ? hub.level : 1;
  const levelInfo = getHubLevel(level);

  // Compose subtitle using authoritative hub level info (vehicleLimit & officeSpots)
  const subtitleParts: string[] = [];
  if (typeof levelInfo?.vehicleLimit === 'number') subtitleParts.push(`Capacity: ${levelInfo.vehicleLimit} vehicles`);
  if (typeof levelInfo?.officeSpots === 'number') subtitleParts.push(`Staff spots: ${levelInfo.officeSpots}`);
  const subtitle = subtitleParts.length ? subtitleParts.join(' • ') : (typeof hub.description === 'string' ? hub.description : undefined);

  return (
    <button
      type="button"
      aria-label={`Open hub ${title}`}
      onClick={onSelect}
      className="w-full h-full text-left bg-slate-700 rounded-lg p-4 border border-slate-600 hover:shadow-sm hover:bg-slate-600 transition-all flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-white">{title}</div>
          <div className="text-xs text-slate-400 mt-1">Level {levelInfo.level}</div>
        </div>

        {/* Main hub badge */}
        {hub.isMain && (
          <div className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-600 text-white">
            Main
          </div>
        )}
      </div>

      <div className="mt-3">
        {subtitle && <div className="text-sm text-slate-400">{subtitle}</div>}
      </div>
    </button>
  );
};

/**
 * normalizeSingleHub
 * @description Ensure a raw hub object has minimal id/name fallbacks.
 */
function normalizeSingleHub(raw: any): HubData {
  const h = raw ?? {};
  return {
    id: h.id ?? h.name ?? `hub-${Math.random().toString(36).slice(2, 9)}`,
    name: h.name ?? h.title ?? (h.city ? `${h.city} Hub` : undefined),
    title: h.title,
    city: h.city,
    capacity: typeof h.capacity === 'number' ? h.capacity : undefined,
    active: typeof h.active === 'boolean' ? h.active : undefined,
    description: h.description ?? h.notes ?? undefined,
    ...h
  };
}

/**
 * HubsPanel
 * @description Top-level panel rendering hubs in a single-column, full-height layout.
 */
const HubsPanel: React.FC = () => {
  const { gameState } = useGame() as any;
  const [selectedHub, setSelectedHub] = useState<HubData | null>(null);

  /**
   * hubsList
   * @description Tolerant lookup for hubs. Priority:
   *  1) company.hubs (array)
   *  2) company.hub (single object) -> normalized into array
   *  3) infrastructure.hubs (array)
   *  4) top-level gameState.hubs (array)
   */
  const hubsList: HubData[] = useMemo(() => {
    if (!gameState) return [];

    // Prefer explicitly-marked company.mainHubId when present, and ensure hubs carry isMain flag.
    let rawHubs: any[] = [];

    if (Array.isArray(gameState?.company?.hubs) && gameState.company.hubs.length > 0) {
      rawHubs = gameState.company.hubs;
    } else if (gameState?.company?.hub && typeof gameState.company.hub === 'object') {
      rawHubs = [gameState.company.hub];
    } else if (Array.isArray(gameState?.infrastructure?.hubs) && gameState.infrastructure.hubs.length > 0) {
      rawHubs = gameState.infrastructure.hubs;
    } else if (Array.isArray(gameState?.hubs) && gameState.hubs.length > 0) {
      rawHubs = gameState.hubs;
    } else {
      rawHubs = [];
    }

    const mainHubId = gameState?.company?.mainHubId ?? (rawHubs[0] ? String(rawHubs[0].id ?? rawHubs[0].name ?? '') : null);

    return rawHubs.map((h: any) => {
      const normalized = normalizeSingleHub(h);
      // Ensure level default and unlockedFacilities persisted in UI model
      normalized.level = typeof h.level === 'number' ? h.level : 1;
      normalized.unlockedFacilities = Array.isArray(h.unlockedFacilities) ? h.unlockedFacilities : [];
      normalized.isMain = mainHubId ? String(normalized.id) === String(mainHubId) : false;
      return normalized;
    });
  }, [gameState]);

  return (
    /**
     * Root is a vertical flex column that will grow to fill available space.
     * This lets the inner grid (flex-1) expand so cards can stretch vertically.
     */
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4 h-full flex flex-col">
      {/* If no hubs, show the friendly empty state */}
      {hubsList.length === 0 ? (
        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 text-slate-300">
          No hubs found for your company.
        </div>
      ) : (
        /*
          Grid configuration:
          - grid-cols-1 ensures a single hub per row at all breakpoints.
          - items-stretch + each child wrapper having flex ensure the HubCard (h-full)
            can fill the entire available vertical space.
          - flex-1 makes the grid stretch to occupy remaining vertical space inside the panel.
        */
        <div className="grid grid-cols-1 gap-4 items-stretch flex-1">
          {hubsList.map((hub) => (
            // wrapper flex ensures the child can stretch to full height
            <div key={hub.id ?? hub.name} className="flex">
              <HubCard hub={hub} onSelect={() => setSelectedHub(hub)} />
            </div>
          ))}
        </div>
      )}

      {/* Hub details modal */}
      <HubDetailsModal hub={selectedHub} onClose={() => setSelectedHub(null)} />
    </div>
  );
};

export default HubsPanel;