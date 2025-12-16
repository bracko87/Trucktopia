/**
 * Home.tsx
 *
 * Root page component for the app's landing and dashboard entrance.
 *
 * Responsibilities:
 * - Render a public landing page for unauthenticated users.
 * - Render a compact WelcomeBack page for authenticated users (single-source of truth).
 * - Provide a canonical link to the full /reset-password page (no in-page modal).
 *
 * Notes:
 * - This file avoids runtime side-effects and keeps the same visual layout.
 * - The ResetPassword form is served on its own route (/reset-password). Home no longer
 *   imports or references PasswordResetForm to avoid runtime ReferenceErrors.
 */

import React from 'react';
import { Link } from 'react-router';
import Hero from './home/Hero';
import StatsBar from './home/StatsBar';
import FeaturesGrid from './home/FeaturesGrid';
import InfoTabs from './home/InfoTabs';
import GameFactsGrid from './home/GameFactsGrid';
import HowToPlay from './home/HowToPlay';
import LandingFooter from './home/LandingFooter';
import ScreenshotGallery from './home/ScreenshotGallery';
import { useGame } from '../contexts/GameContext';
import WelcomeBack from './WelcomeBack';

/**
 * Home
 *
 * Root page component: renders WelcomeBack for authenticated users
 * and the full landing for guests. Provides a canonical link to the reset page.
 *
 * @returns React.ReactElement
 */
const Home: React.FC = () => {
  const { gameState } = useGame();
  const company = gameState.company;

  // If the user is authenticated and we have a company, show the compact welcome-back page.
  if (gameState.isAuthenticated && company) {
    return <WelcomeBack />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col">
      {/* Hero (cinematic background + CTAs / compact company card when authenticated) */}
      <Hero
        authenticated={!!company}
        company={
          company
            ? {
                name: company.name,
                capital: company.capital,
                hub: company.hub,
                level: company.level
              }
            : undefined
        }
      />

      {/* Main scrollable content */}
      <main className="container mx-auto px-4 pb-16 pt-6 w-full flex-1">
        {/* Global stats bar */}
        <section aria-labelledby="global-stats" className="mb-8">
          <h2 id="global-stats" className="sr-only">Global Stats</h2>
          <StatsBar />
        </section>

        {/* Info tabs (replaces Quick Actions) */}
        <section aria-labelledby="info-tabs" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 id="info-tabs" className="text-2xl font-bold text-white">Information</h2>
            <div className="text-sm text-slate-400 hidden sm:block">Helpful resources & notes</div>
          </div>
          <InfoTabs />
        </section>

        {/* Features */}
        <section aria-labelledby="features" className="mb-10">
          <h2 id="features" className="text-2xl font-bold text-white mb-4">Why Trucktopia?</h2>
          <FeaturesGrid />
        </section>

        {/* Game facts */}
        <section aria-labelledby="game-facts" className="mb-10">
          <h2 id="game-facts" className="text-2xl font-bold text-white mb-4">Game Facts</h2>
          <GameFactsGrid />
        </section>

        {/* Screenshot gallery (white cards -- screenshot friendly) */}
        <ScreenshotGallery />

        {/* How to play */}
        <section aria-labelledby="how-to-play" className="mb-10">
          <h2 id="how-to-play" className="text-2xl font-bold text-white mb-4">How to Get Started</h2>
          <HowToPlay />
        </section>

        {/* Extended info / community */}
        <section className="bg-slate-800 rounded-2xl border border-slate-700 p-6 text-slate-300 mb-10">
          <h3 className="text-xl font-semibold text-white mb-3">More about the simulation</h3>
          <p className="mb-3">
            The in-game market is dynamic and reacts to supply/demand. Hiring, repairs,
            maintenance scheduling and route planning are all part of the strategy.
          </p>
          <p className="mb-3">
            Players balance operational risk and expansion: invest in hubs, recruit the
            right staff and maintain vehicles to keep deliveries profitable. The economy
            adapts — making strategic choices matter.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center">
            <a
              href="/user-settings"
              className="inline-flex items-center justify-center bg-white text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Open user settings"
            >
              Account Settings
            </a>

            <a
              href="/dashboard"
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              aria-label="Open dashboard"
            >
              Open Dashboard
            </a>

            {/*
              Change Password CTA:
              - Use a react-router Link so navigation is handled client-side and does not perform a full page reload.
              - This avoids server round-trips during client navigation in dev environments.
            */}
            <Link
              to="/reset-password"
              className="inline-flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg"
              aria-label="Open reset password page"
            >
              Change Password
            </Link>
          </div>
        </section>
      </main>

      {/* Full-width footer (stretches across the page) */}
      <LandingFooter />
    </div>
  );
};

export default Home;