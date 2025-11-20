/**
 * Footer component with game information and links
 */

import React from 'react';
import { useGame } from '../../contexts/GameContext';

const Footer: React.FC = () => {
  const { gameState } = useGame();

  return (
    <footer className="bg-slate-800 border-t border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <div className="flex items-center space-x-6">
          <span>© 2024 Truck Manager Simulator</span>
          <span>•</span>
          <span>Season 2024</span>
          <span>•</span>
          <span>Version 1.0</span>
        </div>
        
        <div className="flex items-center space-x-4">
          {gameState.company && (
            <>
              <span>Game Saved</span>
              <span>•</span>
              <span>In-Game Date: {new Date().toLocaleDateString()}</span>
            </>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;