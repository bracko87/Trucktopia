/**
 * Sidebar.tsx
 *
 * Main application sidebar with navigation.
 *
 * Responsibilities:
 * - Render the main application sidebar with navigation items.
 * - Provide a collapse toggle and status area.
 * - Reserve a logo placeholder (id="sidebar-logo-placeholder") immediately to the left
 *   of the TRUCKTOPIA title so a logo/image can be uploaded or swapped in later without changing layout.
 *
 * Notes:
 * - This file is written in TypeScript and follows the project's component principles.
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
  Server
} from 'lucide-react';
import { GamePage } from '../../types/game';

/**
 * NavItem
 * @description Structure for navigation items rendered in the sidebar.
 */
interface NavItem {
  id: GamePage;
  label: string;
  icon: React.ReactNode;
  description: string;
  path: string;
}

/**
 * Sidebar
 *
 * @description Main application sidebar. Renders navigation, header toggle and company status.
 * The header contains a small logo placeholder (id="sidebar-logo-placeholder") to the left
 * of the TRUCKTOPIA title — the placeholder is intentionally empty and transparent so the
 * current visible icon (e.g. the blue "TM" badge) is removed while preserving layout.
 */
const Sidebar: React.FC = () => {
  const { gameState, setCurrentPage, toggleSidebar } = useGame();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      id: 'dashboard' as GamePage,
      label: 'My Company',
      icon: <LayoutDashboard className="w-5 h-5" />,
      description: 'Company Overview',
      path: '/dashboard'
    },
    {
      id: 'garage' as GamePage,
      label: 'Fleet',
      icon: <Warehouse className="w-5 h-5" />,
      description: 'Fleet Management',
      path: '/garage'
    },
    {
      id: 'staff' as GamePage,
      label: 'Staff Management',
      icon: <Users className="w-5 h-5" />,
      description: 'Company Staff',
      path: '/staff'
    },
    {
      id: 'market' as GamePage,
      label: 'Freight Market',
      icon: <Briefcase className="w-5 h-5" />,
      description: 'Available Freight Load Offers',
      path: '/market'
    },
    {
      id: 'contract-jobs' as GamePage,
      label: 'Contract Jobs',
      icon: <Briefcase className="w-5 h-5" />,
      description: 'State & Private Company Contracts',
      path: '/contract-jobs'
    },
    {
      id: 'jobs' as GamePage,
      label: 'My Jobs',
      icon: <FileText className="w-5 h-5" />,
      description: 'Active Contracts',
      path: '/jobs'
    },
    {
      id: 'infrastructure' as GamePage,
      label: 'Infrastructure',
      icon: <Server className="w-5 h-5" />,
      description: 'Hubs & Facilities',
      path: '/infrastructure'
    },
    {
      id: 'finances' as GamePage,
      label: 'Finances',
      icon: <DollarSign className="w-5 h-5" />,
      description: 'Financial Overview',
      path: '/finances'
    },
    {
      id: 'map' as GamePage,
      label: 'Map',
      icon: <Map className="w-5 h-5" />,
      description: 'Live Operations Map',
      path: '/map'
    },
    {
      id: 'user-settings' as GamePage,
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      description: 'Account & Game Settings',
      path: '/user-settings'
    }
  ];

  /**
   * handleNavigation
   * @description Navigate to the selected path and update current page in game state.
   * @param item NavItem
   */
  const handleNavigation = (item: NavItem) => {
    navigate(item.path);
    setCurrentPage(item.id);
  };

  /**
   * isActive
   * @description Check if a path matches the current location pathname.
   * @param path string
   * @returns boolean
   */
  const isActive = (path: string) => location.pathname === path;

  const sidebarWidth = gameState.sidebarCollapsed ? 'w-20' : 'w-64';

  return (
    <aside className={`${sidebarWidth} bg-slate-900 border-r border-slate-700 flex flex-col transition-all duration-300`}>
      {/* Header with Toggle */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {!gameState.sidebarCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {/* 
                Logo placeholder preserved for layout stability.
                - id="sidebar-logo-placeholder" allows future DOM/React replacement.
                - The element is intentionally empty and transparent to remove any default/decorative icon.
                - Keep dimensions identical so the title alignment does not change.
              */}
              <div
                id="sidebar-logo-placeholder"
                className="w-8 h-8 flex-shrink-0 rounded-md"
                title="Logo placeholder — replace this element with your uploaded logo"
                aria-hidden="true"
                style={{ backgroundColor: 'transparent' }}
              />
              <div>
                <h1 className="text-base font-bold text-white leading-tight uppercase">TRUCKTOPIA</h1>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
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
              key={item.id as string}
              onClick={() => handleNavigation(item)}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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
        {gameState.company?.id === 'admin-company' && (
          <button
            onClick={() => {
              navigate('/admin');
              setCurrentPage('admin-dashboard' as GamePage);
            }}
            className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
              location.pathname === '/admin' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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

      {/* Company Status removed intentionally
          Rationale:
          - The small boxed "Company Level" UI and inline level badge were removed
            to meet the product request to hide the Company Level output for all users.
          - The original implementation duplicated small progress UI in multiple places
            (inline badges + boxed summary). To deterministically ensure it's not shown,
            we removed the boxed summary here. LevelBadge and LevelBox components are
            disabled elsewhere to avoid leftover snippets.
      */}
    </aside>
  );
};

export default Sidebar;