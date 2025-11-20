/**
 * Trailers management page showing all trailers in possession
 */

import React from 'react';
import { useGame } from '../contexts/GameContext';
import { Package, Truck, MapPin, Wrench, DollarSign } from 'lucide-react';

const Trailers: React.FC = () => {
  const { gameState } = useGame();

  if (!gameState.company) return null;

  const getTrailerTypeColor = (type: string) => {
    switch (type) {
      case 'flatbed': return 'text-blue-400 bg-blue-400/10';
      case 'refrigerated': return 'text-green-400 bg-green-400/10';
      case 'tanker': return 'text-orange-400 bg-orange-400/10';
      case 'container': return 'text-purple-400 bg-purple-400/10';
      case 'lowboy': return 'text-cyan-400 bg-cyan-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getTrailerIcon = (type: string) => {
    switch (type) {
      case 'flatbed': return <div className="w-6 h-6 bg-blue-500 rounded" />;
      case 'refrigerated': return <div className="w-6 h-6 bg-green-500 rounded" />;
      case 'tanker': return <div className="w-6 h-4 bg-orange-500 rounded-full" />;
      case 'container': return <div className="w-6 h-6 bg-purple-500 rounded" />;
      case 'lowboy': return <div className="w-6 h-3 bg-cyan-500 rounded" />;
      default: return <Package className="w-6 h-6 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trailer Fleet</h1>
          <p className="text-slate-400">Manage your trailer inventory and assignments</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Purchase New Trailer
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
        {gameState.company.trailers.map((trailer) => (
          <div key={trailer.id} className="bg-slate-800 rounded border border-slate-700 hover:border-slate-600 transition-all duration-200 p-1">
            {/* Single Line Compact Display */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-slate-700 rounded flex items-center justify-center">
                  {trailer.type === 'flatbed' && <div className="w-2 h-2 bg-blue-500 rounded" />}
                  {trailer.type === 'refrigerated' && <div className="w-2 h-2 bg-green-500 rounded" />}
                  {trailer.type === 'tanker' && <div className="w-2 h-1 bg-orange-500 rounded-full" />}
                  {trailer.type === 'container' && <div className="w-2 h-2 bg-purple-500 rounded" />}
                  {trailer.type === 'lowboy' && <div className="w-2 h-1 bg-cyan-500 rounded" />}
                </div>
                <span className="text-[9px] font-bold text-white capitalize truncate max-w-[40px]">
                  {trailer.type}
                </span>
              </div>
              <div className={`px-1 py-0.5 rounded-full text-[8px] ${getTrailerTypeColor(trailer.type)}`}>
                {trailer.assignedTruck ? '●' : '○'}
              </div>
            </div>

            {/* Ultra Compact Info Row */}
            <div className="text-[8px] text-slate-400 grid grid-cols-2 gap-0.5 mb-1">
              <div>{trailer.capacity}t</div>
              <div>{trailer.location || 'Hub'}</div>
              <div className="text-slate-500">
                {trailer.assignedTruck ? `T${trailer.assignedTruck.split('-')[1]}` : 'Free'}
              </div>
              <div>${trailer.purchasePrice.toLocaleString()}</div>
            </div>

            {/* Micro Condition Bar */}
            <div className="flex items-center space-x-1 mb-1">
              <span className="text-[7px]">C</span>
              <div className="w-full bg-slate-700 rounded-full h-0.5">
                <div 
                  className={`h-0.5 rounded-full ${
                    trailer.condition >= 70 ? 'bg-green-500' : 
                    trailer.condition >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} 
                  style={{ width: `${trailer.condition}%` }}
                ></div>
              </div>
              <span className="text-[7px] text-white">{trailer.condition}%</span>
            </div>

            {/* Micro Maintenance Alert */}
            {trailer.condition < 70 && (
              <div className="text-[7px] text-amber-400 text-center mb-1">!</div>
            )}

            {/* Micro Actions */}
            <div className="flex gap-0.5">
              <button 
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-0.5 rounded text-[7px] transition-colors"
                disabled={!!trailer.assignedTruck}
                title="Maintenance"
              >
                🔧
              </button>
              <button 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-0.5 rounded text-[7px] transition-colors"
                disabled={!!trailer.assignedTruck}
                title={trailer.assignedTruck ? 'Already Assigned' : 'Assign Truck'}
              >
                {trailer.assignedTruck ? '🔒' : '🔗'}
              </button>
              <button 
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-0.5 rounded text-[7px] transition-colors"
                title="View Details"
              >
                ℹ️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Trailer Summary */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">Trailer Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-1">{gameState.company.trailers.length}</div>
            <div className="text-sm text-slate-400">Total Trailers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">
              {gameState.company.trailers.filter(t => t.type === 'flatbed').length}
            </div>
            <div className="text-sm text-slate-400">Flatbed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {gameState.company.trailers.filter(t => t.type === 'refrigerated').length}
            </div>
            <div className="text-sm text-slate-400">Refrigerated</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-400 mb-1">
              {gameState.company.trailers.filter(t => t.type === 'tanker').length}
            </div>
            <div className="text-sm text-slate-400">Tanker</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              {gameState.company.trailers.filter(t => t.type === 'container').length}
            </div>
            <div className="text-sm text-slate-400">Container</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Trailers;