/**
 * HubsPanel.tsx
 *
 * Presentational panel for the Infrastructure -> Hubs view.
 *
 * Responsibilities:
 * - Render company hubs as full-height single-column cards so each hub occupies
 *   the available horizontal width and can stretch vertically.
 * - Render pending "build-hub" tasks as grayed/disabled pending hub cards until
 *   the task completes (HubConstructionFinalizer or equivalent engine).
 * - Provide a Freight Market button on each hub that navigates to /market with
 *   the hub's country & city as query params.
 * - Listen for pending task updates via a window event (tm:pendingTasksUpdated)
 *   and re-read pending tasks from the shared pendingTasks util.
 *
 * Notes:
 * - This file is defensive: it looks for hubs in company.hubs, company.hub,
 *   infrastructure.hubs and top-level gameState.hubs and normalizes them.
 * - The UI and layout are kept consistent with existing styles (no major style
 *   changes). Only behaviour/flow additions are applied.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../../contexts/GameContext';
import HubDetailsModal from './HubDetailsModal';
import { getHubLevel } from '../../data/hubLevels';
import { readTasks, PendingTask } from '../../utils/pendingTasks';

/**
 * HubData
 * @description Minimal hub shape expected from game state. Accepts unknown fields.
 */
interface HubData {
  id?: string;
  name?: string;
  title?: string;
  city?: string;
  countryCode?: string;
  capacity?: number;
  level?: number;
  active?: boolean;
  description?: string;
  isMain?: boolean;
  unlockedFacilities?: string[];
  [key: string]: any;
}

/**
 * HubCardProps
 * @description Props for the visual hub card.
 */
interface HubCardProps {
  hub: HubData;
  onSelect?: () => void;
}

/**
 * HubCard
 * @description Visual, full-height hub card with Freight Market and Details actions.
 *
 * - Stays presentational: no side-effects here.
 */
const HubCard: React.FC<HubCardProps> = ({ hub, onSelect }) => {
  const navigate = useNavigate();

  const title =
    hub.name ||
    hub.title ||
    (hub.city ? `${hub.city} Hub` : `Hub ${hub.id ?? ''}`) ||
    'Hub';

  const level = typeof hub.level === 'number' ? hub.level : 1;
  const levelInfo = getHubLevel(level);

  const subtitleParts: string[] = [];
  if (typeof levelInfo?.vehicleLimit === 'number') subtitleParts.push(`Capacity: ${levelInfo.vehicleLimit} vehicles`);
  if (typeof levelInfo?.officeSpots === 'number') subtitleParts.push(`Staff spots: ${levelInfo.officeSpots}`);
  const subtitle = subtitleParts.length ? subtitleParts.join(' • ') : (typeof hub.description === 'string' ? hub.description : undefined);

  return (
    <div
      className="w-full h-full text-left bg-slate-700 rounded-lg p-4 border border-slate-600 hover:shadow-sm hover:bg-slate-600 transition-all flex flex-col justify-between"
      role="group"
      aria-label={`Hub card ${title}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-white">{title}</div>
          <div className="text-xs text-slate-400 mt-1">Level {levelInfo.level}</div>
        </div>

        {hub.isMain && (
          <div className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-600 text-white">
            Main
          </div>
        )}
      </div>

      <div className="mt-3">
        {subtitle && <div className="text-sm text-slate-400">{subtitle}</div>}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-slate-400">{hub.countryCode ? hub.countryCode.toUpperCase() : ''}{hub.city ? ` • ${hub.city}` : ''}</div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams();
              if (hub.countryCode) params.set('country', String(hub.countryCode));
              if (hub.city) params.set('city', String(hub.city));
              navigate(`/market?${params.toString()}`);
            }}
            className="text-xs px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
            aria-label={`Open Freight Market for ${title}`}
          >
            Freight Market
          </button>

          <button
            type="button"
            onClick={onSelect}
            className="text-xs px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
            aria-label={`Open details for ${title}`}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * PendingHubCardProps
 * @description Props for a single pending hub build card.
 */
interface PendingHubCardProps {
  task: PendingTask;
}

/**
 * PendingHubCard
 * @description Presents a grayed-out hub card representing an in-progress build task.
 */
const PendingHubCard: React.FC<PendingHubCardProps> = ({ task }) => {
  const title = `${task.city} Hub (Pending)`;
  const doneAt = new Date(task.completionGameMs).toLocaleString();

  return (
    <div
      className="w-full h-full text-left bg-slate-800/60 rounded-lg p-4 border border-slate-700 cursor-not-allowed opacity-70 flex flex-col justify-between"
      aria-hidden="true"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-slate-300">{title}</div>
          <div className="text-xs text-slate-400 mt-1">Level 1 (on completion)</div>
        </div>

        <div className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-600/20 text-amber-300">
          Pending
        </div>
      </div>

      <div className="mt-3">
        <div className="text-sm text-slate-400">Estimated Price</div>
        <div className="text-lg font-bold text-amber-400">
          {typeof task.estimatedPrice !== 'undefined' ? String(task.estimatedPrice) : '—'}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-slate-400">Done at (game UTC)</div>
        <div className="text-xs text-slate-200">{doneAt}</div>
      </div>
    </div>
  );
};

/**
 * normalizeSingleHub
 * @description Ensure a raw hub object has minimal id/name fallbacks.
 * @param raw raw hub object
 * @returns normalized HubData
 */
function normalizeSingleHub(raw: any): HubData {
  const h = raw ?? {};
  return {
    id: h.id ?? h.name ?? `hub-${Math.random().toString(36).slice(2, 9)}`,
    name: h.name ?? h.title ?? (h.city ? `${h.city} Hub` : undefined),
    title: h.title,
    city: h.city,
    countryCode: h.countryCode ?? (h.country ?? h.countryCode ?? undefined),
    capacity: typeof h.capacity === 'number' ? h.capacity : undefined,
    active: typeof h.active === 'boolean' ? h.active : undefined,
    description: h.description ?? h.notes ?? undefined,
    unlockedFacilities: Array.isArray(h.unlockedFacilities) ? h.unlockedFacilities : [],
    level: typeof h.level === 'number' ? h.level : 1,
    isMain: false,
    ...h
  };
}

/**
 * HubsPanel
 * @description Top-level panel rendering hubs in a single-column, full-height layout.
 * - Also displays pending build tasks as disabled cards until they complete.
 */
const HubsPanel: React.FC = () => {
  const { gameState } = useGame() as any;
  const [selectedHub, setSelectedHub] = useState<HubData | null>(null);
  const [pendingBuilds, setPendingBuilds] = useState<PendingTask[]>([]);

  /**
   * reloadPendingBuilds
   * @description Read pending tasks and keep in local state (filters build-hub).
   */
  const reloadPendingBuilds = () => {
    try {
      const tasks = readTasks().filter((t) => t.type === 'build-hub');
      setPendingBuilds(tasks);
    } catch (e) {
      // defensive: if pendingTasks util throws, swallow to avoid breaking UI
      setPendingBuilds([]);
      // eslint-disable-next-line no-console
      console.warn('[HubsPanel] failed to read pending tasks', e);
    }
  };

  useEffect(() => {
    reloadPendingBuilds();
    const handler = () => reloadPendingBuilds();
    window.addEventListener('tm:pendingTasksUpdated', handler as EventListener);
    return () => window.removeEventListener('tm:pendingTasksUpdated', handler as EventListener);
  }, []);

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

    let rawHubs: any[] = [];

    if (Array.isArray(gameState?.company?.hubs) && gameState.company.hubs.length > 0) {
      rawHubs = gameState.company.hubs;
    } else if (gameState?.company?.hub_name && gameState.company.hub_name !== 'Pending') {
      // Fallback: Create a virtual hub object from the company's main hub columns
      rawHubs = [{
        id: 'main-hub',
        name: gameState.company.hub_name,
        city: gameState.company.hub_name,
        country: gameState.company.hub_country,
        level: 1,
        isMain: true
      }];
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
      normalized.level = typeof h.level === 'number' ? h.level : 1;
      normalized.unlockedFacilities = Array.isArray(h.unlockedFacilities) ? h.unlockedFacilities : [];
      normalized.isMain = mainHubId ? String(normalized.id) === String(mainHubId) : false;
      return normalized;
    });
  }, [gameState]);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 space-y-4 h-full flex flex-col">
      {/* If no hubs and no pending builds, show friendly empty state */}
      {hubsList.length === 0 && pendingBuilds.length === 0 ? (
        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600 text-slate-300">
          No hubs found for your company.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 items-stretch flex-1">
          {/* Render pending builds first so the user sees upcoming hubs */}
          {pendingBuilds.map((t) => (
            <div key={t.id} className="flex">
              <PendingHubCard task={t} />
            </div>
          ))}

          {/* Render existing hubs */}
          {hubsList.map((hub) => (
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
