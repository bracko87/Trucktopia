/**
 * Footer.tsx
 *
 * Dashboard footer with version info, session status, compact inline game time
 * badge and a pill-style language selector matching LandingFooter. Also shows
 * company capital balance when available.
 *
 * Responsibilities:
 * - Display app version and encryption status
 * - Show current company capital (if user/company present)
 * - Render an inline, single-line game time string formatted like the global
 *   game time (e.g. "23/12/2025, 18:06:46")
 * - Offer a Radix pill-style language selector matching LandingFooter
 */

import React, { useEffect, useState } from 'react';
import { Shield, Info, Globe, ChevronDown, Clock, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useGame } from '../../contexts/GameContext';

/**
 * formatBerlin
 * @description Format epoch ms into Europe/Berlin wall-clock readable string
 *              using the same concise format used by the GameTimeBadge.
 * @param ms epoch ms
 */
function formatBerlin(ms: number) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(ms));
  } catch {
    // Fallback to ISO-derived short form
    const d = new Date(ms);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy}, ${hh}:${min}:${ss}`;
  }
}

/**
 * InlineGameTimeBadge
 * @description Compact inline badge rendering only the primary game time line
 *              (e.g. "23/12/2025, 18:06:46") so it fits inside the footer.
 */
const InlineGameTimeBadge: React.FC = () => {
  // Attempt to read clock utilities dynamically to avoid SSR issues.
  const [nowMs, setNowMs] = useState<number>(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { nowUtcMs } = require('../../utils/gameClock');
      return typeof nowUtcMs === 'function' ? nowUtcMs() : Date.now();
    } catch {
      return Date.now();
    }
  });

  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { nowUtcMs, subscribe } = require('../../utils/gameClock');
      if (typeof subscribe === 'function') {
        unsub = subscribe(() => {
          try {
            setNowMs(typeof nowUtcMs === 'function' ? nowUtcMs() : Date.now());
          } catch {
            // ignore
          }
        });
      }
    } catch {
      // ignore absence of clock utils
    }

    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      if (unsub) unsub();
      clearInterval(id);
    };
  }, []);

  return (
    <div className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg shadow px-3 py-2 flex items-center gap-3">
      <Clock className="w-4 h-4 text-slate-300" />
      <div className="leading-tight">
        <div className="text-sm font-medium">{formatBerlin(nowMs)}</div>
      </div>
    </div>
  );
};

/**
 * Footer
 * @description Bottom navigation and status bar for dashboard pages.
 */
const Footer: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { gameState } = useGame();

  const languages = [
    { code: 'en', label: 'English', flag: 'us' },
    { code: 'sr', label: 'Srpski', flag: 'rs' },
  ];

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  /**
   * changeLanguage
   * @description Change i18n language and persist selection to localStorage.
   * @param lng Language code
   */
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    try {
      localStorage.setItem('app_language', lng);
    } catch {
      // ignore storage failures
    }
  };

  /**
   * getFlagUrl
   * @description Return a small flagcdn url for given two-letter country code.
   * @param flagCode country code (eg 'us', 'rs')
   */
  const getFlagUrl = (flagCode: string) => `https://flagcdn.com/w20/${flagCode.toLowerCase()}.png`;

  const capitalVal = gameState?.company && typeof gameState.company.capital === 'number'
    ? gameState.company.capital
    : null;

  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-4 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Left: Version, Status & Capital */}
        <div className="flex items-center space-x-6 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <Info className="w-3.5 h-3.5" />
            <span>{t('footer.version')}: 1.4.2-stable</span>
          </div>

          <div className="flex items-center space-x-2">
            <Shield className="w-3.5 h-3.5 text-green-500/50" />
            <span>{t('footer.encrypted')}</span>
          </div>

          {/* Company capital (when available) */}
          <div className="flex items-center space-x-2">
            <DollarSign className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-slate-300">
              Capital: {capitalVal !== null ? `${capitalVal.toLocaleString()} €` : '—'}
            </span>
          </div>
        </div>

        {/* Branding (Optional Small Tag) */}
        <div className="hidden lg:block">
          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest italic">
            Engineered for Logistics Strategy
          </span>
        </div>

        {/* Right: Inline clock badge + language selector */}
        <div className="flex items-center space-x-4">
          <InlineGameTimeBadge />

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="flex items-center space-x-2 text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700/50 outline-none"
                aria-label="Select language"
              >
                <div className="w-5 h-3 overflow-hidden rounded-sm shadow-sm border border-slate-600/50">
                  <img src={getFlagUrl(currentLang.flag)} alt={currentLang.code} className="w-full h-full object-cover" />
                </div>
                <span>Jezik: {i18n.language === 'en' ? 'English' : 'Srpski'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-[100] min-w-[160px] bg-slate-800 border border-slate-700 rounded-xl p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                align="end"
                sideOffset={8}
              >
                {languages.map(lang => (
                  <DropdownMenu.Item
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer outline-none transition-colors ${
                      i18n.language === lang.code ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <img src={getFlagUrl(lang.flag)} alt={lang.code} className="w-6 h-4 object-cover rounded-sm shadow-sm" />
                    <span className="text-sm font-bold">{lang.label.toUpperCase()}</span>
                    {i18n.language === lang.code && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                    )}
                  </DropdownMenu.Item>
                ))}
                <DropdownMenu.Arrow className="fill-slate-700" />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </footer>
  );
};

export default Footer;