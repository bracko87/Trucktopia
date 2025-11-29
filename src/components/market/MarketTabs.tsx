/**
 * MarketTabs.tsx
 *
 * Purpose:
 * - Small reusable tab component used on the Vehicle Market page.
 * - Renders two clearly separated groups: Trucks (New / Used) and Trailers (New / Used).
 * - Keeps behaviour identical to previous inline implementation by using activeTab + setActiveTab.
 *
 * Visual decisions:
 * - Two labelled groups with compact pill buttons for clarity.
 * - Selected state preserves original blue background + white text visual language.
 *
 * Notes:
 * - This component is intentionally minimal so it can be reused elsewhere.
 */

import React from 'react';
import { Truck as TruckIcon, Package as PackageIcon } from 'lucide-react';

/**
 * MarketTabsProps
 * @description Props for MarketTabs component.
 */
export interface MarketTabsProps {
  activeTab: 'new-trucks' | 'used-trucks' | 'new-trailers' | 'used-trailers';
  setActiveTab: (tab: MarketTabsProps['activeTab']) => void;
}

/**
 * MarketTabs
 * @description Renders grouped tabs for Trucks and Trailers.
 */
const MarketTabs: React.FC<MarketTabsProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Trucks group */}
      <div>
        <div className="text-xs text-slate-400 mb-2 font-medium">Trucks</div>
        <div className="bg-slate-800 rounded-xl p-1 border border-slate-700 grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('new-trucks')}
            className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${activeTab === 'new-trucks' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            <TruckIcon className="w-4 h-4" />
            <span>New Trucks</span>
          </button>

          <button
            onClick={() => setActiveTab('used-trucks')}
            className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${activeTab === 'used-trucks' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            <TruckIcon className="w-4 h-4" />
            <span>Used Trucks</span>
          </button>
        </div>
      </div>

      {/* Trailers group */}
      <div>
        <div className="text-xs text-slate-400 mb-2 font-medium">Trailers</div>
        <div className="bg-slate-800 rounded-xl p-1 border border-slate-700 grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('new-trailers')}
            className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${activeTab === 'new-trailers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            <PackageIcon className="w-4 h-4" />
            <span>New Trailers</span>
          </button>

          <button
            onClick={() => setActiveTab('used-trailers')}
            className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${activeTab === 'used-trailers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            <PackageIcon className="w-4 h-4" />
            <span>Used Trailers</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketTabs;
