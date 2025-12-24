
/**
 * LandingFooter.tsx
 *
 * Full-width footer for the landing page.
 * Features a perfectly centered, UI-friendly language selector using Radix UI.
 */

import React from 'react';
import { Mail, MessageSquare, Facebook, Youtube, Twitter, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

/**
 * LandingFooter
 * @description Renders the landing page footer with a custom, high-end language selector.
 */
const LandingFooter: React.FC = () => {
  const { t, i18n } = useTranslation();

  const languages = [
    { code: 'en', label: 'ENGLISH', flag: 'us' },
    { code: 'sr', label: 'SRPSKI', flag: 'rs' },
  ];

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  /**
   * changeLanguage
   * @param lng Language code
   */
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('app_language', lng);
  };

  /**
   * getFlagUrl
   * @param flagCode 'us' | 'rs'
   */
  const getFlagUrl = (flagCode: string) => `https://flagcdn.com/w40/${flagCode}.png`;

  return (
    <footer className="w-full border-t border-slate-700 bg-slate-900 px-6 py-10">
      <div className="container mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Left Column: About */}
          <div className="flex-1 text-center lg:text-left">
            <div className="text-sm text-slate-400 font-medium">{t('landing.footer.about')}</div>
            <div className="text-lg font-bold text-white mt-1">
              {t('landing.footer.tagline')}
            </div>
            <div className="text-xs text-slate-500 mt-2 max-w-sm mx-auto lg:mx-0">
              {t('landing.footer.about_desc')}
            </div>
          </div>

          {/* Middle Column: Custom Language Selector */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button 
                  className="flex items-center space-x-3 bg-slate-800/50 px-4 py-2.5 rounded-xl border border-slate-700 shadow-xl backdrop-blur-sm hover:border-indigo-500/50 transition-all group outline-none focus:ring-2 focus:ring-indigo-500/20"
                  aria-label="Select language"
                >
                  {/* Flag Display */}
                  <div className="w-8 h-5 overflow-hidden rounded-sm shadow-sm border border-slate-600 group-hover:scale-110 transition-transform">
                    <img 
                      src={getFlagUrl(currentLang.flag)} 
                      alt={currentLang.code} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] uppercase text-slate-500 font-black tracking-widest leading-none mb-1">
                      {t('footer.language')}
                    </span>
                    <span className="text-slate-200 text-sm font-bold leading-none">
                      {currentLang.label}
                    </span>
                  </div>

                  <div className="text-slate-500 group-hover:text-indigo-400 transition-colors">
                    <ChevronDown className="w-4 h-4 stroke-[3px]" />
                  </div>
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content 
                  className="z-[100] min-w-[160px] bg-slate-800 border border-slate-700 rounded-xl p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                  align="center"
                  sideOffset={8}
                >
                  {languages.map((lang) => (
                    <DropdownMenu.Item
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg cursor-pointer outline-none transition-colors ${
                        i18n.language === lang.code 
                          ? 'bg-indigo-600/20 text-indigo-400' 
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <img 
                        src={getFlagUrl(lang.flag)} 
                        alt={lang.code} 
                        className="w-6 h-4 object-cover rounded-sm shadow-sm"
                      />
                      <span className="text-sm font-bold">{lang.label}</span>
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

          {/* Right Column: Social & Copyright */}
          <div className="flex-1 flex flex-col items-center lg:items-end gap-4">
            <div className="flex items-center space-x-2">
              <a href="#email" className="p-2.5 rounded-lg bg-slate-800 hover:bg-indigo-600 transition-all text-slate-300 hover:text-white group">
                <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </a>
              <a href="#discord" className="p-2.5 rounded-lg bg-slate-800 hover:bg-indigo-600 transition-all text-slate-300 hover:text-white group">
                <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </a>
              <a href="#facebook" className="p-2.5 rounded-lg bg-slate-800 hover:bg-blue-600 transition-all text-slate-300 hover:text-white group">
                <Facebook className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </a>
              <a href="#youtube" className="p-2.5 rounded-lg bg-slate-800 hover:bg-red-600 transition-all text-slate-300 hover:text-white group">
                <Youtube className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </a>
              <a href="#x" className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all text-slate-300 hover:text-white group">
                <Twitter className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </a>
            </div>
            <div className="text-center lg:text-right text-[10px] text-slate-500 font-medium">
              <div>{t('landing.footer.copyright')}</div>
              <div className="mt-0.5 opacity-60 uppercase tracking-tighter">Build v0.3.4-alpha</div>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
