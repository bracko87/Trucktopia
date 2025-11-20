/**
 * Clean Header component without logout button
 * Simplified with company info and admin status only
 */

import React from 'react';
import { useGame } from '../../contexts/GameContext';
import { Menu, Crown } from 'lucide-react';

const Header: React.FC = () => {
  const { gameState, toggleSidebar } = useGame();

  // Check if current user is admin
  const isAdmin = gameState.company?.name === 'Admin' || gameState.company?.email === 'bracko87@live.com';

  return (
    <header className="bg-slate-900 border-b border-slate-700 px-6 py-4 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        {/* Left side - Menu and Title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5 text-slate-400" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TM</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                Truck Manager
                {isAdmin && (
                  <span className="ml-2 text-yellow-400 text-sm font-normal bg-yellow-400/10 px-2 py-1 rounded-full">
                    Admin
                  </span>
                )}
              </h1>
              <p className="text-slate-400 text-sm">
                {gameState.company ? `${gameState.company.name} - ${gameState.company.level}` : 'No Company'}
              </p>
            </div>
          </div>
        </div>

        {/* Right side - User info and admin status */}
        <div className="flex items-center space-x-4">
          {/* Admin Crown Icon */}
          {isAdmin && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 rounded-full">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm font-medium">Admin</span>
              </div>
            </div>
          )}
          
          {/* User Info */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-white font-medium">
                {gameState.company?.name || 'No Company'}
              </div>
              <div className="text-slate-400 text-sm">
                Capital: ${(gameState.company?.capital || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;