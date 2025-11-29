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

// Dev runtime locator (temporary; logs DOM->React fiber mapping)
import RuntimeSpecLocator from './components/Debug/RuntimeSpecLocator';
import MarketRedirectListener from './components/MarketRedirectListener';

// New: Trailer normalizer helper - moves misplaced trailers into company.trailers
import TrailerNormalizer from './components/fleet/TrailerNormalizer';

import './data/trailer-cleanup';
import './data/trailer-additions';
import './data/trailer-availability';

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

/**
 * App
 * @description Root application component: mounts providers, layout and routing.
 */
function App() {
  return (
    <GameProvider>
      <JobMarketProvider>
        <BrowserRouter>
          <Layout>
            {/* Development-only helper: expose game state to window for debugging */}
            <ExposeGameState />

            {/* Dev runtime DOM->React fiber locator (temporary) */}
            <RuntimeSpecLocator />

            {/* Mount background helpers (UI-less) to run side-effects and normalization */}
            <MechanicSkillAssigner />
            <ClearPromotedSkills />
            <StaffIdAssigner />
            <ManagerSkillAssigner />

            {/* Trailer normalizer: ensure trailers purchased into trucks are moved to trailers */}
            <TrailerNormalizer />

            {/* NOTE: EngineStarter and StaffConditionEngineStarter intentionally NOT mounted.
                This ensures no background engine runs automatically and keeps job/staff mutations
                explicit via UI actions and GameContext methods. */}

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