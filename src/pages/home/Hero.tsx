/**
 * Hero.tsx
 *
 * Reusable hero section for the Home page. Supports two modes:
 * - authenticated (shows small welcome card)
 * - public landing (larger marketing hero with CTAs)
 *
 * Uses a smart placeholder image for a cinematic truck-on-highway background.
 */

import React from 'react';
import { Link } from 'react-router';
import { Building, Truck, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CompanyBrief {
  name?: string;
  capital?: number;
  hub?: { name?: string; country?: string };
  level?: string;
}

/**
 * HeroProps
 * @description Props for the Hero component.
 */
interface HeroProps {
  authenticated?: boolean;
  company?: CompanyBrief;
}

/**
 * Hero
 * @description Renders a cinematic hero section. When authenticated, shows
 * a compact welcome card overlay with company info. When public, shows marketing
 * messaging plus primary CTAs.
 */
const Hero: React.FC<HeroProps> = ({ authenticated = false, company }) => {
  const { t } = useTranslation();
  return (
    <header className="relative">
      {/* Cinematic background image (smart placeholder) */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="https://pub-cdn.sider.ai/u/U0KAH9N4VLX/web-coder/68fe87c0584c7e7f606af31d/resource/76cf7044-3dc0-4d91-a466-029e704f0a4f.png"
          alt="Trucks on highway"
          className="w-full h-full object-cover filter brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/70" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20">
        {/* Main content area */}
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <div className="flex-1 max-w-3xl text-center lg:text-left">
            <div className="inline-flex items-center space-x-3 bg-slate-800/40 backdrop-blur-sm border border-slate-700 rounded-2xl px-4 py-2 mb-6">
              <Truck className="w-6 h-6 text-amber-400" />
              <span className="text-sm text-amber-300 font-medium">Simulation • Logistics • Strategy</span>
            </div>

            <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight">
              {t('landing.hero_title')}
            </h1>

            <p className="mt-4 text-lg text-slate-300 max-w-2xl">
              {t('landing.hero_subtitle')}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                to="/login"
                className="inline-flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition-transform transform hover:-translate-y-0.5 shadow-lg"
                aria-label="Login to your company"
              >
                <Shield className="w-4 h-4" />
                <span>{t('landing.cta_login')}</span>
              </Link>

              <Link
                to="/register"
                className="inline-flex items-center justify-center space-x-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-lg font-semibold transition-transform transform hover:-translate-y-0.5 shadow-lg"
                aria-label={t('landing.cta_register')}
              >
                <Building className="w-4 h-4" />
                <span>{t('landing.cta_register')}</span>
              </Link>
            </div>
          </div>

          {/* Authenticated compact card */}
          {authenticated && company && (
            <aside className="w-full lg:w-96 bg-slate-800/60 backdrop-blur-md border border-slate-700 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-slate-300">Welcome back</div>
                  <div className="text-xl font-bold text-white">{company.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-300">Balance</div>
                  <div className="text-lg font-semibold text-green-400">€{(company.capital || 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="mt-3 text-sm text-slate-300">
                <div>HQ: {company.hub?.name || '—'}</div>
                <div className="mt-2">Level: <span className="text-white font-medium">{company.level || 'Starter'}</span></div>
              </div>

              <div className="mt-5">
                <Link
                  to="/dashboard"
                  className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium">
                  Open Dashboard
                </Link>
              </div>
            </aside>
          )}
        </div>
      </div>
    </header>
  );
};

export default Hero;