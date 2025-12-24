/**
 * InfoTabs.tsx
 *
 * Small information tabs component used on the Home page.
 */

import React from 'react';
import { Info, Users, LifeBuoy } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type InfoTabKey = 'overview' | 'community' | 'support';

interface TabItem {
  key: InfoTabKey;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const InfoTabs: React.FC = () => {
  const { t } = useTranslation();
  
  const tabs: TabItem[] = [
    {
      key: 'overview',
      title: t('landing.info.tabs.overview'),
      icon: <Info className="w-5 h-5" />,
      content: (
        <div className="text-sm text-slate-300 space-y-2">
          <p>{t('landing.info.overview_p1')}</p>
          <p>{t('landing.info.overview_p2')}</p>
        </div>
      )
    },
    {
      key: 'community',
      title: t('landing.info.tabs.community'),
      icon: <Users className="w-5 h-5" />,
      content: (
        <div className="text-sm text-slate-300 space-y-2">
          <p>{t('landing.info.community_p1')}</p>
          <p>
            <a
              href="https://discord.gg/TRUCKTOPIA"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              {t('landing.info.community_link')}
            </a>
          </p>
        </div>
      )
    },
    {
      key: 'support',
      title: t('landing.info.tabs.support'),
      icon: <LifeBuoy className="w-5 h-5" />,
      content: (
        <div className="text-sm text-slate-300 space-y-2">
          <p>{t('landing.info.support_p1')}</p>
          <p>{t('landing.info.support_p2')}</p>
        </div>
      )
    },
  ];

  const [active, setActive] = React.useState<InfoTabKey>('overview');

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{t('landing.headings.information')}</h3>
        <div className="text-sm text-slate-400 hidden sm:block">{t('landing.headings.info_tabs_subtitle')}</div>
      </div>

      <div>
        <div role="tablist" aria-label="Information tabs" className="flex gap-2 mb-4 w-full">
          {tabs.map((t) => {
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(t.key)}
                className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'bg-slate-700/40 text-slate-300 hover:bg-slate-700/60'
                }`}
              >
                <span className="p-1 rounded bg-white/2 text-slate-200">{t.icon}</span>
                <span>{t.title}</span>
              </button>
            );
          })}
        </div>

        <div>
          {tabs.map((t) => (
            <div
              key={t.key}
              role="tabpanel"
              hidden={t.key !== active}
              className={t.key === active ? 'block' : 'hidden'}
            >
              {t.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfoTabs;