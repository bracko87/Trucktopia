/**
 * Home.tsx
 *
 * Root page component for the app's landing and dashboard entrance.
 */

import React from 'react';
import Hero from './home/Hero';
import StatsBar from './home/StatsBar';
import FeaturesGrid from './home/FeaturesGrid';
import InfoTabs from './home/InfoTabs';
import GameFactsGrid from './home/GameFactsGrid';
import HowToPlay from './home/HowToPlay';
import LandingFooter from './home/LandingFooter';
import ScreenshotGallery from './home/ScreenshotGallery';
import UserFeedbacks from './home/UserFeedbacks';
import { useGame } from '../contexts/GameContext';
import WelcomeBack from './WelcomeBack';
import { useTranslation } from 'react-i18next';

const Home: React.FC = () => {
  const { t } = useTranslation();
  const { gameState } = useGame();
  const company = gameState.company;

  if (gameState.isAuthenticated && company) {
    return <WelcomeBack />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col">
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

      <main className="container mx-auto px-4 pb-16 pt-6 w-full flex-1">
        <section aria-labelledby="global-stats" className="mb-8">
          <h2 id="global-stats" className="sr-only">Global Stats</h2>
          <StatsBar />
        </section>

        <section aria-labelledby="info-tabs" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 id="info-tabs" className="text-2xl font-bold text-white">{t('landing.headings.information')}</h2>
            <div className="text-sm text-slate-400 hidden sm:block">{t('landing.headings.info_subtitle')}</div>
          </div>
          <InfoTabs />
        </section>

        <section aria-labelledby="features" className="mb-10">
          <h2 id="features" className="text-2xl font-bold text-white mb-4">{t('landing.headings.why_trucktopia')}</h2>
          <FeaturesGrid />
        </section>

        <section aria-labelledby="game-facts" className="mb-10">
          <h2 id="game-facts" className="text-2xl font-bold text-white mb-4">{t('landing.headings.game_facts')}</h2>
          <GameFactsGrid />
        </section>

        <ScreenshotGallery />

        <section aria-labelledby="how-to-play" className="mb-10">
          <h2 id="how-to-play" className="text-2xl font-bold text-white mb-4">{t('landing.headings.how_to_start')}</h2>
          <HowToPlay />
        </section>

        {/* New User Feedbacks section inserted after How to Play */}
        <UserFeedbacks />
      </main>

      <LandingFooter />
    </div>
  );
};

export default Home;