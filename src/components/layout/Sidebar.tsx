/**
 * Sidebar.tsx
 *
 * Professional retractable sidebar with Football Manager 2024 style navigation.
 *
 * Responsibilities:
 * - Provide navigation for the game pages
 * - Show admin-only entries when the user is an administrator
 * - Allow collapsing/expanding sidebar
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useGame } from '../../contexts/GameContext';
import {
  LayoutDashboard,
  Warehouse,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  Map,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  Database
} from 'lucide-react';
import { GamePage } from '../../types/game';

interface NavItem {
  id: GamePage | string;
  label: string;
  icon: React.ReactNode;
  description: string;
  path: string;
}

/**
 * Sidebar
 *
 * Main application sidebar component. Shows navigation and admin-only links.
 */
const Sidebar: React.FC = () => {
  const { gameState, setCurrentPage, toggleSidebar } = useGame();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'My Company',
      icon: <LayoutDashboard className="w-5 h-5" />,
      description: 'Company Overview',
      path: '/dashboard'
    },
    {
      id: 'garage',
      label: 'Fleet',
      icon: <Warehouse className="w-5 h-5" />,
      description: 'Fleet Management',
      path: '/garage'
    },
    {
      id: 'staff',
      label: 'Staff Management',
      icon: <Users className="w-5 h-5" />,
      description: 'Company Staff',
      path: '/staff'
    },
    {
      id: 'market',
      label: 'Freight Market',
      icon: <Briefcase className="w-5 h-5" />,
      description: 'Available Freight Load Offers',
      path: '/market'
    },
    {
      id: 'contract-jobs',
      label: 'Contract Jobs',
      icon: <Briefcase className="w-5 h-5" />,
      description: 'State & Private Company Contracts',
      path: '/contract-jobs'
    },
    {
      id: 'jobs',
      label: 'My Jobs',
      icon: <FileText className="w-5 h-5" />,
      description: 'Active Contracts',
      path: '/jobs'
    },
    {
      id: 'finances',
      label: 'Finances',
      icon: <DollarSign className="w-5 h-5" />,
      description: 'Financial Overview',
      path: '/finances'
    },
    {
      id: 'map',
      label: 'Map',
      icon: <Map className="w-5 h-5" />,
      description: 'Live Operations Map',
      path: '/map'
    },
    {
      id: 'user-settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      description: 'Account & Game Settings',
      path: '/user-settings'
    },
  ];

  const handleNavigation = (item: NavItem) => {
    navigate(item.path);
    // keep page tracking consistent with existing app expectations
    setCurrentPage(item.id as GamePage);
  };

  const isActive = (path: string) => location.pathname === path;

  const sidebarWidth = gameState.sidebarCollapsed ? 'w-20' : 'w-64';

  // Admin detection: match admin checks used in AdminDashboard
  const isAdmin = gameState.currentUser === 'bracko87@live.com' || gameState.company?.id === 'admin-company';

  return (
    <aside className={`${sidebarWidth} bg-slate-900 border-r border-slate-700 flex flex-col transition-all duration-300`}>
      {/* Header with Toggle */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {!gameState.sidebarCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">TRUCK</h1>
              <h1 className="text-sm font-bold text-white leading-tight">MANAGER</h1>
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
        >
          {gameState.sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 text-slate-300" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-slate-300" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item)}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                active
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                {item.icon}
                {!gameState.sidebarCollapsed && (
                  <div className="text-left">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-slate-400">{item.description}</div>
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {/* Admin Dashboard - Only show for admin users */}
        {isAdmin && (
          <>
            <button
              onClick={() => {
                navigate('/admin');
                setCurrentPage('admin-dashboard' as GamePage);
              }}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                location.pathname === '/admin'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5" />
                {!gameState.sidebarCollapsed && (
                  <div className="text-left">
                    <div className="font-medium text-sm">Admin Dashboard</div>
                    <div className="text-xs text-slate-400">System Administration</div>
                  </div>
                )}
              </div>
            </button>

            {/* Migration link */}
            <button
              onClick={() => {
                navigate('/admin/migration');
                setCurrentPage('admin-dashboard' as GamePage);
              }}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                location.pathname === '/admin/migration'
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Database className="w-5 h-5" />
                {!gameState.sidebarCollapsed && (
                  <div className="text-left">
                    <div className="font-medium text-sm">Migration</div>
                    <div className="text-xs text-slate-400">Data import / Firestore</div>
                  </div>
                )}
              </div>
            </button>
          </>
        )}

        {/* Logout Button - Added to main sidebar */}
        <div className="pt-4 border-t border-slate-700 mt-4">
          <button
            onClick={() => {
              navigate('/logout');
            }}
            className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 text-red-400 hover:bg-red-500/10 hover:text-red-300 ${
              gameState.sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-5 h-5" />
            {!gameState.sidebarCollapsed && (
              <div className="text-left ml-3">
                <div className="font-medium text-sm">Log Out</div>
                <div className="text-xs text-red-400/70">Sign out of account</div>
              </div>
            )}
          </button>
        </div>
      </nav>

      {/* Company Status - Only show when expanded */}
      {!gameState.sidebarCollapsed && gameState.company && (
        <div className="p-4 border-t border-slate-700">
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">Company Level</span>
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full capitalize">
                {gameState.company.level}
              </span>
            </div>
            <div className="text-xs text-slate-400 mb-1">
              {gameState.company.name}
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: '35%' }}
              />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;