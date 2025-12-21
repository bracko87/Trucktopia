
/**
 * Infrastructure.tsx
 */

import React, { useMemo, useState } from 'react';
import { MapPin, Home, Truck, Globe, List } from 'lucide-react';
import { useGame } from '../contexts/GameContext';
import HubsPanel from '../components/infrastructure/HubsPanel';
import FacilitiesPanel from '../components/infrastructure/FacilitiesPanel';
import HubsDowngradeFix from '../components/infrastructure/HubsDowngradeFix';
import BuildHubBox from '../components/infrastructure/BuildHubBox';
import PendingTasksPanel from '../components/infrastructure/PendingTasksPanel';

// Simple mapping for regional grouping
const COUNTRY_TO_REGION: Record<string, string> = {
  // Europe
  'de': 'Europe', 'fr': 'Europe', 'gb': 'Europe', 'it': 'Europe', 'es': 'Europe', 'pl': 'Europe', 'nl': 'Europe', 'be': 'Europe', 'ch': 'Europe', 'at': 'Europe', 'se': 'Europe', 'no': 'Europe', 'fi': 'Europe', 'dk': 'Europe', 'ie': 'Europe', 'pt': 'Europe', 'gr': 'Europe', 'cz': 'Europe', 'ro': 'Europe', 'hu': 'Europe', 'tr': 'Europe', 'ua': 'Europe', 'by': 'Europe', 'ru': 'Europe', 'sk': 'Europe', 'si': 'Europe', 'hr': 'Europe', 'bg': 'Europe', 'rs': 'Europe', 'lt': 'Europe', 'lv': 'Europe', 'ee': 'Europe', 'md': 'Europe', 'xk': 'Europe', 'me': 'Europe', 'al': 'Europe', 'mk': 'Europe', 'ba': 'Europe', 'lu': 'Europe', 'cy': 'Europe', 'ad': 'Europe', 'li': 'Europe', 'sm': 'Europe', 'mc': 'Europe', 'va': 'Europe', 'mt': 'Europe',
  // Asia / Middle East
  'cn': 'Asia', 'jp': 'Asia', 'kr': 'Asia', 'in': 'Asia', 'id': 'Asia', 'vn': 'Asia', 'th': 'Asia', 'my': 'Asia', 'ph': 'Asia', 'sg': 'Asia', 'tw': 'Asia', 'hk': 'Asia', 'mo': 'Asia', 'ae': 'Middle East', 'sa': 'Middle East', 'qa': 'Middle East', 'kw': 'Middle East', 'om': 'Middle East', 'bh': 'Middle East', 'il': 'Middle East', 'jo': 'Middle East', 'lb': 'Middle East', 'sy': 'Middle East', 'iq': 'Middle East', 'ir': 'Middle East', 'af': 'Asia', 'pk': 'Asia', 'bd': 'Asia', 'lk': 'Asia', 'np': 'Asia', 'mm': 'Asia', 'kh': 'Asia', 'la': 'Asia', 'uz': 'Asia', 'kz': 'Asia', 'tm': 'Asia', 'kg': 'Asia', 'tj': 'Asia', 'ge': 'Asia', 'am': 'Asia', 'az': 'Asia',
  // Africa
  'eg': 'Africa', 'ng': 'Africa', 'za': 'Africa', 'dz': 'Africa', 'ma': 'Africa', 'ke': 'Africa', 'et': 'Africa', 'gh': 'Africa', 'sn': 'Africa', 'ci': 'Africa', 'ug': 'Africa', 'cd': 'Africa', 'zw': 'Africa', 'rw': 'Africa', 'mw': 'Africa', 'sl': 'Africa', 'gm': 'Africa', 'ga': 'Africa', 'er': 'Africa', 'gq': 'Africa', 'dj': 'Africa', 'km': 'Africa', 'cf': 'Africa', 'cv': 'Africa', 'bi': 'Africa', 'bf': 'Africa', 'bw': 'Africa', 'bj': 'Africa'
};

function formatNumber(value: number | undefined | null): string {
  const v = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return v.toLocaleString();
}

const TabButton: React.FC<{ id: string; active: boolean; onClick: () => void; children: React.ReactNode; icon?: React.ReactNode }> = ({ active, onClick, children, icon }) => {
  const base = 'px-4 py-2 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-150 w-full flex-1';
  const activeClass = 'bg-blue-600 text-white shadow-md ring-1 ring-white/5';
  const inactiveClass = 'text-slate-400 hover:text-white hover:bg-slate-700/5';
  return (
    <button onClick={onClick} className={`${base} ${active ? activeClass : inactiveClass}`}>
      {icon}
      <span>{children}</span>
    </button>
  );
};

const Infrastructure: React.FC = () => {
  const { gameState } = useGame() as any;
  const [active, setActive] = useState<'hubs' | 'facilities' | 'overview'>('hubs');

  const stats = useMemo(() => {
    if (!gameState) return { hubsCount: 0, facilitiesCount: 0, totalCapacity: 0, regionalHubs: {} };

    let hubsArr: any[] = [];
    if (Array.isArray(gameState?.company?.hubs)) hubsArr = gameState.company.hubs;
    else if (gameState?.company?.hub) hubsArr = [gameState.company.hub];

    const totalCapacity = hubsArr.reduce((acc, hub) => acc + (hub.maxVehicles || 0), 0);

    const builtSet = new Set<string>();
    const company = gameState?.company;
    if (company?.builtFacilities) company.builtFacilities.forEach((f: any) => builtSet.add(String(f)));

    // Group by region
    const regionalGroups: Record<string, any[]> = {};
    hubsArr.forEach(hub => {
      const country = (hub.country || hub.countryCode || '').toLowerCase();
      const region = COUNTRY_TO_REGION[country] || 'Other';
      if (!regionalGroups[region]) regionalGroups[region] = [];
      regionalGroups[region].push(hub);
    });
    
    return { 
      hubsCount: hubsArr.length, 
      facilitiesCount: builtSet.size,
      totalCapacity,
      regionalHubs: regionalGroups
    };
  }, [gameState]);

  return (
    <main className="flex-1 p-0 overflow-auto">
      <div className="flex flex-col h-full min-h-0">
        <div className="w-full pt-0 mb-6 px-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 w-full">
            <div>
              <h1 className="text-2xl font-bold text-white">Infrastructure</h1>
              <p className="text-sm text-slate-400">Manage hubs and facilities across your network</p>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Hubs</div>
                <div className="text-xl font-bold text-indigo-400">{formatNumber(stats.hubsCount)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Facilities</div>
                <div className="text-xl font-bold text-amber-400">{formatNumber(stats.facilitiesCount)}</div>
              </div>
              <div className="text-right border-l border-slate-700 pl-6">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center justify-end">
                  <Truck className="w-3 h-3 mr-1" /> Network Capacity
                </div>
                <div className="text-xl font-bold text-emerald-400">{formatNumber(stats.totalCapacity)} <span className="text-xs text-slate-500 font-normal">Slots</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <section className="flex-1 bg-slate-800 p-6 border-y border-slate-700 overflow-auto w-full">
            <div className="space-y-6">
              <HubsDowngradeFix />
              <div className="border-b border-slate-700">
                <div className="flex gap-2 p-1">
                  <TabButton id="hubs" active={active === 'hubs'} onClick={() => setActive('hubs')} icon={<List className="w-4 h-4" />}>Management</TabButton>
                  <TabButton id="overview" active={active === 'overview'} onClick={() => setActive('overview')} icon={<Globe className="w-4 h-4" />}>Network Overview</TabButton>
                  <TabButton id="facilities" active={active === 'facilities'} onClick={() => setActive('facilities')} icon={<Home className="w-4 h-4" />}>Facilities</TabButton>
                </div>
              </div>

              {active === 'hubs' && (
                <div className="space-y-6">
                  <HubsPanel />
                  <BuildHubBox />
                </div>
              )}

              {active === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Object.entries(stats.regionalHubs).length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500 italic">
                      No active hubs in your network yet.
                    </div>
                  ) : (
                    Object.entries(stats.regionalHubs).map(([region, hubs]) => (
                      <div key={region} className="bg-slate-900/40 rounded-xl border border-slate-700 p-4">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest">{region}</h3>
                          <span className="text-xs text-blue-400 font-bold">{hubs.length} Hubs</span>
                        </div>
                        <div className="space-y-3">
                          {hubs.map(hub => (
                            <div key={hub.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center text-slate-300">
                                <MapPin className="w-3 h-3 mr-2 text-slate-500" />
                                {hub.city || hub.name}
                              </div>
                              <div className="text-slate-500 font-mono">
                                Lvl {hub.level} • {hub.maxVehicles} Slots
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {active === 'facilities' && <FacilitiesPanel />}
            </div>
          </section>

          <section className="w-full p-6">
            <PendingTasksPanel />
          </section>
        </div>
      </div>
    </main>
  );
};

export default Infrastructure;
