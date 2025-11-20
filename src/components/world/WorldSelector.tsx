/**
 * Game World Selector Component
 * Allows users to switch between different game worlds
 */

import React from 'react';
import { GAME_WORLDS, setCurrentWorld, getCurrentWorld } from '../../types/gameWorld';

interface WorldSelectorProps {
  onWorldChange?: (worldId: string) => void;
  compact?: boolean;
}

const WorldSelector: React.FC<WorldSelectorProps> = ({ onWorldChange, compact = false }) => {
  const currentWorld = getCurrentWorld();
  
  const handleWorldChange = (worldId: string) => {
    if (GAME_WORLDS[worldId] && GAME_WORLDS[worldId].enabled) {
      setCurrentWorld(worldId);
      if (onWorldChange) {
        onWorldChange(worldId);
      }
      // Reload the page to apply world changes
      window.location.reload();
    }
  };

  const enabledWorlds = Object.values(GAME_WORLDS).filter(world => world.enabled);

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-slate-400">World:</span>
        <select 
          value={currentWorld}
          onChange={(e) => handleWorldChange(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          {enabledWorlds.map(world => (
            <option key={world.id} value={world.id}>
              {world.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-lg font-bold text-white mb-3">Select Game World</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.values(GAME_WORLDS).map(world => (
          <button
            key={world.id}
            onClick={() => handleWorldChange(world.id)}
            disabled={!world.enabled}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              currentWorld === world.id
                ? 'border-blue-500 bg-blue-500/10'
                : world.enabled
                ? 'border-slate-600 bg-slate-700 hover:border-slate-500 hover:bg-slate-600'
                : 'border-slate-700 bg-slate-800 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="font-semibold text-white">{world.name}</div>
            <div className="text-sm text-slate-400 mt-1">{world.description}</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-500">{world.region}</span>
              {!world.enabled && (
                <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-1 rounded">Coming Soon</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WorldSelector;