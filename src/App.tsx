/**
 * App.tsx
 *
 * Main application entry with routing and background helpers mounting.
 *
 * Responsibilities:
 * - Provide top-level providers (GameProvider, JobMarketProvider)
 * - Configure routing (BrowserRouter + Routes)
 * - Mount non-visual background helpers (MechanicSkillAssigner, ClearPromotedSkills,
 *   StaffIdAssigner, ManagerSkillAssigner) so they run side-effects.
 *
 * NOTE: EngineStarter and StaffConditionEngineStarter mounts were removed from this file
 * to avoid runtime side-effects from background engines. If you want to re-enable them,
 * re-introduce the imports and mounts intentionally after stabilizing the engines.
 */

/* eslint-disable react/jsx-no-bind */
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { GameProvider } from './contexts/GameContext';
import { JobMarketProvider } from './contexts/JobMarketContext';
import Layout from './components/layout/Layout';
import ExposeGameState from './components/Debug/ExposeGameState';
// Background helpers (non-visual)
import MechanicSkillAssigner from './components/staff/MechanicSkillAssigner';
import ClearPromotedSkills from './components/staff/ClearPromotedSkills';
import StaffIdAssigner from './components/staff/StaffIdAssigner';
import ManagerSkillAssigner from './components/staff/ManagerSkillAssigner';
import JobSanitizer from './components/JobSanitizer';
import RemoveSpecs from './components/RemoveSpecs';
import RemoveAnnouncement from './components/RemoveAnnouncement';

import MarketRedirectListener from './components/MarketRedirectListener';

// New: Trailer normalizer helper - moves misplaced trailers into company.trailers
import TrailerNormalizer from './components/fleet/TrailerNormalizer';
import HideTrailerFleetHeader from './components/fleet/HideTrailerFleetHeader';
import HideTrailerPackageIconBox from './components/fleet/HideTrailerPackageIconBox';
import ForceHidePackageIconBox from './components/fleet/ForceHidePackageIconBox';
import IncomingDeliveryFinalizer from './components/fleet/IncomingDeliveryFinalizer';
import ForceInjectTruck from './components/admin/ForceInjectTruck';
import ManifestSynchronizer from './components/ManifestSynchronizer';

// Bootstrap: ensure canonical in-game time seeded before any background engines mount
import GameClockBootstrap from './components/Boot/GameClockBootstrap';

// New Infrastructure page
import HubsSynchronizer from './components/infrastructure/HubsSynchronizer';
import HubConstructionFinalizer from './components/infrastructure/HubConstructionFinalizer';
import AdminForceMainHubReset from './components/admin/AdminForceMainHubReset';
import GrantFundsToAllUsers from './components/admin/GrantFundsToAllUsers';
import ForceGrantFundsToUser from './components/admin/ForceGrantFundsToUser';

import { manifest as rulesManifest } from './data/game-rules-engines';

import './data/trailer-cleanup';
import './data/trailer-additions';
import './data/trailer-availability';
/* Side-effect import: remove a small inline Fire (test) button that can appear in certain spots.
   This module runs DOM-safe logic to remove the button without altering layout. */
import './data/remove-inline-fire-test-button';
/* Side-effect import: remove a small inline Fire (test) button that can appear in certain spots.
   This module runs DOM-safe logic to remove the button without altering layout. */
/* Side-effect import: runtime DOM patchers used to perform safe text/image replacements requested by the user.
   These modules only update text content or image src as visual-only fixes and do not change layout or styles. */
import './components/StaffImageReplacer';
import './components/StaffTextReplacer';
import './components/PriceTextReplacer';
import './data/remove-inline-fire-test-button';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Registration from './pages/Registration';
import CreateCompany from './pages/CreateCompany';
import Dashboard from './pages/Dashboard';
import Garage from './pages/Garage';
import Staff from './pages/Staff';
import Market from './pages/Market';
import Jobs from './pages/Jobs';
import Finances from './pages/Finances';
import Map from './pages/Map';
import Trucks from './pages/Trucks';
import Trailers from './pages/Trailers';
import VehicleMarket from './pages/VehicleMarket';
import JobCenter from './pages/JobCenter';
import Logout from './pages/Logout';
import StorageManagement from './pages/StorageManagement';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import TestDistance from './pages/TestDistance';
import Settings from './pages/Settings';
import UserSettings from './pages/UserSettings';
import GameRulesEngines from './pages/GameRulesEngines';
import FreightJobDatabase from './pages/FreightJobDatabase';
import FleetControl from './pages/FleetControl';
import ContractJobs from './pages/ContractJobs';
import CargoTrailerCompatibility from './pages/CargoTrailerCompatibility';

// Migration page
import Migration from './pages/Migration';

// New Infrastructure page
import Infrastructure from './pages/Infrastructure';
import MigrationTasks from './pages/MigrationTasks';

// New Engine: Used Truck Generator
import UsedTruckGenerator from './engines/UsedTruckGenerator';

// Company persistence sync — background helper to ensure company mutations persist to localStorage
import CompanyPersistenceSync from './components/Boot/CompanyPersistenceSync';
import StaffFiredListener from './components/StaffFiredListener';

/**
 * App
 * @description Root application component: mounts providers, layout and routing.
 */
function App() {
  const [RawJsonReplacerComponent, setRawJsonReplacerComponent] = React.useState<React.ComponentType | null>(null);

  /**
   * Dynamically import RawJsonReplacer on the client. We do this to:
   * - Avoid evaluating DOM/react-dom dependent modules during SSR or early runtime
   * - Keep behaviour client-only and best-effort
   */
  React.useEffect(() => {
    let mounted = true;
    if (typeof window === 'undefined') return;
    import('./components/RawJsonReplacer')
      .then((mod) => {
        if (!mounted) return;
        if (mod && mod.default) setRawJsonReplacerComponent(() => mod.default);
      })
      .catch(() => {
        // ignore load failures; replacer is best-effort
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <GameProvider>
      <JobMarketProvider>
        <BrowserRouter>
          <Layout>
            {/* Development-only helper: expose game state to window for debugging */}
            <ExposeGameState />

            {/* Dynamically load RawJsonReplacer on the client to avoid SSR/runtime issues.
                This ensures the replacer only runs in browser contexts and prevents module
                evaluation errors when react-dom/client is unavailable at module init. */}
            {RawJsonReplacerComponent ? <RawJsonReplacerComponent /> : null}
            <ExposeGameState />


            {/* Mount background helpers (UI-less) to run side-effects and normalization */}
            <MechanicSkillAssigner />
            <ClearPromotedSkills />
            <StaffIdAssigner />
            <ManagerSkillAssigner />

            {/* Trailer normalizer: ensure trailers purchased into trucks are moved to trailers */}
            <TrailerNormalizer />
            {/* Helper: aggressively hide legacy "Trailer Fleet" small headers across the DOM */}
            <HideTrailerFleetHeader /> 
            <TrailerNormalizer />

            {/* IncomingDeliveryFinalizer: periodically moves delivered incoming items into fleet arrays */}
            <IncomingDeliveryFinalizer />

            {/* ManifestSynchronizer: persist runtime manifest overrides so admin UI reflects mounted engines */}
            <ManifestSynchronizer mountedEngineIds={rulesManifest.engines.map((e) => e.id)} />

            {/* HubsSynchronizer: normalize hubs into company state when found in other gameState locations */}
            <HubsSynchronizer />
            <HubConstructionFinalizer /> 
            <HubsSynchronizer />

            {/* Mount the Used Truck Generator engine so it runs daily and provides offers */}
            <UsedTruckGenerator />

            {/* Company persistence sync: ensure in-memory company changes are persisted to localStorage */}
            <CompanyPersistenceSync />

            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Registration />} />
              <Route path="/create-company" element={<CreateCompany />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/garage" element={<Garage />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/market" element={<Market />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/finances" element={<Finances />} />
              <Route path="/map" element={<Map />} />
              <Route path="/trucks" element={<Trucks />} />
              <Route path="/trailers" element={<Trailers />} />
              <Route path="/vehicle-market" element={<VehicleMarket />} />
              <Route path="/job-center" element={<JobCenter />} />

              <Route path="/logout" element={<Logout />} />
              <Route path="/storage-management" element={<StorageManagement />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/game-rules" element={<GameRulesEngines />} />
              <Route path="/admin/job-database" element={<FreightJobDatabase />} />
              <Route path="/admin/fleet-control" element={<FleetControl />} />
              <Route path="/test-distance" element={<TestDistance />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/user-settings" element={<UserSettings />} />
              <Route path="/contract-jobs" element={<ContractJobs />} />
              <Route path="/cargo-trailer-compatibility" element={<CargoTrailerCompatibility />} />
              <Route path="/migration" element={<Migration />} />

              {/* Infrastructure route */}
              <Route path="/infrastructure" element={<Infrastructure />} />

              {/* Redirect unknown routes to home */}
              <Route path="*" element={<Home />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </JobMarketProvider>
    </GameProvider>
  );
}

export default App;
