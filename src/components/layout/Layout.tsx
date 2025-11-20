/**
 * Main layout component with sidebar, header, and footer
 */

import React from 'react';
import { useGame } from '../../contexts/GameContext';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { gameState } = useGame();

  if (!gameState.isAuthenticated || !gameState.company) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default Layout;