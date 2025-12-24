/**
 * HubsPanel.tsx
 *
 * Displays individual hub cards in a 2-column grid layout on larger screens.
 * Includes per-hub capacity progress bars for vehicles and staff.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../../contexts/GameContext';
import HubDetailsModal from './HubDetailsModal';
import { getHubLevel } from '../../data/hubLevels';
import { readTasks, PendingTask } from '../../utils/pendingTasks';
import { getHubCapacityInfo } from '../../engines/hubCapacityEngine';
import { Truck, Users } from 'lucide-react';

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
 * CapacityBar
 * @description Small reusable progress bar for hub card stats.
 */
const CapacityBar: React.FC<{ 
  label: string; 
  current: number; 
  max: number; 
  icon: React.ReactNode;
  colorClass: string;
}> = ({ label, current, max, icon, colorClass }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold text-slate-400">
        <div className="flex items-center gap-1.5">
          {icon}
          <span>{label}</span>
        </div>
        <span>{current} / {max}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <div 
          className={`h-full transition-all duration-500 ${colorClass}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const HubCard: React.FC<{ hub: HubData; onSelect?: () => void }> = ({ hub, onSelect }) => {
  const navigate = useNavigate();
  const { gameState } = useGame() as any;

  // Robust title handling from your DB schema
  const title = hub.name || (hub.city ? `${hub.city} Hub` : 'Strategic Hub');
  
  // Capacity calculation (uses hub_level from DB)
  const capacity = useMemo(() => getHubCapacityInfo(gameState?.company, hub), [gameState?.company, hub]);

  // Handle isMain from both local state and your data jsonb column
  const isMain = hub.isMain || hub.is_main || hub.data?.is_main;

  return (
    <div className="w-full h-full text-left bg-slate-700 rounded-2xl p-6 border border-slate-600 hover:border-indigo-500/50 hover:bg-slate-700/80 transition-all flex flex-col justify-between group shadow-xl">
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-black text-white text-lg group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{title}</div>
            <div className="flex items-center space-x-2 mt-1">
               <div className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest border border-indigo-500/30">
                 LVL {capacity.level}
               </div>
               {isMain && (
                 <div className="px-2 py-0.5 rounded bg-amber-500 text-slate-900 text-[9px] font-black uppercase tracking-widest">
                   Main HQ
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Capacity Status Section */}
        <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/50">
          <CapacityBar 
            label="Vehicle Slots" 
            current={capacity.assignedVehicles} 
            max={capacity.maxVehicles} 
            icon={<Truck className="w-3 h-3" />}
            colorClass={capacity.assignedVehicles >= capacity.maxVehicles ? 'bg-rose-500' : 'bg-indigo-500'}
          />
          <CapacityBar 
            label="Staff Capacity" 
            current={capacity.assignedStaff} 
            max={capacity.maxStaff} 
            icon={<Users className="w-3 h-3" />}
            colorClass={capacity.assignedStaff >= capacity.maxStaff ? 'bg-amber-500' : 'bg-emerald-500'}
          />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-xs text-slate-400 font-medium italic">
          {hub.countryCode ? hub.countryCode.toUpperCase() : ''}{hub.city ? ` • ${hub.city}` : ''}
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams();
              if (hub.countryCode) params.set('country', String(hub.countryCode));
              if (hub.city) params.set('city', String(hub.city));
              navigate(`/market?${params.toString()}`);
            }}
            className="text-[11px] font-bold uppercase px-3 py-1.5 rounded bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white transition-all"
          >
            Market
          </button>
          <button
            type="button"
            onClick={onSelect}
            className="text-[11px] font-bold uppercase px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-sm"
          >
            Manage
          </button>
        </div>
      </div>
    </div>
  );
};

const PendingHubCard: React.FC<{ task: PendingTask }> = ({ task }) => {
  const title = `${task.city} Hub`;
  const doneAt = new Date(task.completionGameMs).toLocaleString();

  return (
    <div className="w-full h-full text-left bg-slate-800/40 rounded-lg p-5 border border-slate-700 border-dashed opacity-60 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-slate-400">{title}</div>
          <div className="text-[10px] text-amber-500/80 font-bold uppercase mt-1">Under Construction...</div>
        </div>
        <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600/20 text-amber-500 uppercase">Pending</div>
      </div>

      <div className="mt-4 p-2 bg-slate-900/50 rounded border border-slate-700/50">
        <div className="text-[10px] text-slate-500 uppercase font-bold">Estimated Handover</div>
        <div className="text-xs text-slate-300 font-mono mt-0.5">{doneAt}</div>
      </div>
    </div>
  );
};

const HubsPanel: React.FC = () => {
  const { gameState } = useGame() as any;
  const [selectedHub, setSelectedHub] = useState<HubData | null>(null);
  const [pendingBuilds, setPendingBuilds] = useState<PendingTask[]>([]);

  const reloadPendingBuilds = () => {
    try {
      const tasks = readTasks().filter((t) => t.type === 'build-hub');
      setPendingBuilds(tasks);
    } catch (e) {
      setPendingBuilds([]);
    }
  };

  useEffect(() => {
    reloadPendingBuilds();
    const handler = () => reloadPendingBuilds();
    window.addEventListener('tm:pendingTasksUpdated', handler as EventListener);
    return () => window.removeEventListener('tm:pendingTasksUpdated', handler as EventListener);
  }, []);

  const hubsList: HubData[] = useMemo(() => {
    if (!gameState) return [];
    let rawHubs: any[] = [];
    if (Array.isArray(gameState?.company?.hubs) && gameState.company.hubs.length > 0) {
      rawHubs = gameState.company.hubs;
    } else if (gameState?.company?.hub_name && gameState.company.hub_name !== 'Pending') {
      rawHubs = [{ id: 'main-hub', name: gameState.company.hub_name, city: gameState.company.hub_name, country: gameState.company.hub_country, level: 1, isMain: true }];
    } else if (gameState?.company?.hub) {
      rawHubs = [gameState.company.hub];
    } else {
      rawHubs = [];
    }
    const mainHubId = gameState?.company?.mainHubId ?? (rawHubs[0] ? String(rawHubs[0].id ?? rawHubs[0].name ?? '') : null);
    return rawHubs.map((h: any) => ({ ...h, isMain: mainHubId ? String(h.id || h.name) === String(mainHubId) : false }));
  }, [gameState]);

  return (
    <div className="space-y-4">
      {/* 
          Restricting grid to 2 columns (md:grid-cols-2) for all larger viewports
          to maintain layout stability while adding new capacity info.
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {pendingBuilds.map((t) => (
          <PendingHubCard key={t.id} task={t} />
        ))}
        {hubsList.map((hub) => (
          <HubCard key={hub.id ?? hub.name} hub={hub} onSelect={() => setSelectedHub(hub)} />
        ))}
      </div>
      <HubDetailsModal hub={selectedHub} onClose={() => setSelectedHub(null)} />
    </div>
  );
};

export default HubsPanel;