/**
 * InfoTabs.tsx
 *
 * Small information tabs component used on the Home page to replace the
 * Quick Actions block. Shows short, actionable information in tab panels.
 *
 * Responsibilities:
 * - Render a horizontal tab list with accessible keyboard navigation.
 * - Present short informational panels (Overview, Community, Support, Changelog).
 * - Keep markup small and reusable.
 */

import React from 'react';
import { Info, Users, LifeBuoy, GitBranch } from 'lucide-react';

export type InfoTabKey = 'overview' | 'community' | 'support' | 'changelog';

/**
 * TabItem
 * @description Data shape for a single info tab.
 */
interface TabItem {
  key: InfoTabKey;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

/**
 * InfoTabs
 * @description Renders an accessible tabbed information block suitable for the Home page.
 */
const InfoTabs: React.FC = () => {
  const tabs: TabItem[] = [
    {
      key: 'overview',
      title: 'Overview',
      icon: <Info className="w-5 h-5" />,
      content: (
        <div className="text-sm text-slate-300 space-y-2">
          <p>
            Truck Manager is a logistics simulation where you buy vehicles, hire staff,
            take contracts and expand hubs. Balance maintenance, payroll and market risk
            to grow a profitable operation.
          </p>
          <p>
            Use the dashboard to monitor fleet health, job profitability and staff
            allocation. Start small and scale strategically.
          </p>
        </div>
      )
    },
    {
      key: 'community',
      title: 'Community',
      icon: <Users className="w-5 h-5" />,
      content: (
        <div className="text-sm text-slate-300 space-y-2">
          <p>
            Join the community to share strategies, liveries and mod ideas. Find
            community-driven challenges and leaderboards to compare progress.
          </p>
          <p>
            We recommend creating a profile and visiting the forums to ask questions
            or suggest features.
          </p>
        </div>
      )
    },
    {
      key: 'support',
      title: 'Support',
      icon: <LifeBuoy className="w-5 h-5" />,
      content: (
        <div className="text-sm text-slate-300 space-y-2">
          <p>
            Need help? Check the FAQ in settings or open a support ticket. Common
            issues such as import/export, save sync and UI glitches are documented.
          </p>
          <p>
            For migration and backups, use the Migration page available in the admin
            or settings area.
          </p>
        </div>
      )
    },
    {
      key: 'changelog',
      title: 'Changelog',
      icon: <GitBranch className="w-5 h-5" />,
      content: (
        <div className="text-sm text-slate-300 space-y-2">
          <p className="font-medium text-white">Version 1.0 — Initial public release</p>
          <ul className="list-disc list-inside text-slate-400">
            <li>Core simulation, fleet management and market system</li>
            <li>Staff hiring, experience and promotions</li>
            <li>Save/load and migration helpers</li>
          </ul>
        </div>
      )
    }
  ];

  const [active, setActive] = React.useState<InfoTabKey>('overview');
  const tabsRef = React.useRef<Array<HTMLButtonElement | null>>([]);

  /**
   * handleKeyDown
   * @description Keyboard navigation for tab list (ArrowLeft / ArrowRight / Home / End).
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const idx = tabs.findIndex((t) => t.key === active);
    if (e.key === 'ArrowRight') {
      const next = tabs[(idx + 1) % tabs.length];
      setActive(next.key);
      tabsRef.current[(idx + 1) % tabs.length]?.focus();
    } else if (e.key === 'ArrowLeft') {
      const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
      setActive(prev.key);
      tabsRef.current[(idx - 1 + tabs.length) % tabs.length]?.focus();
    } else if (e.key === 'Home') {
      setActive(tabs[0].key);
      tabsRef.current[0]?.focus();
    } else if (e.key === 'End') {
      setActive(tabs[tabs.length - 1].key);
      tabsRef.current[tabs.length - 1]?.focus();
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Information</h3>
        <div className="text-sm text-slate-400 hidden sm:block">Helpful links & notes</div>
      </div>

      <div>
        {/* Tab list */}
        <div role="tablist" aria-label="Information tabs" className="flex gap-2 mb-4" onKeyDown={handleKeyDown}>
          {tabs.map((t, i) => {
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                ref={(el) => (tabsRef.current[i] = el)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${t.key}`}
                id={`tab-${t.key}`}
                onClick={() => setActive(t.key)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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

        {/* Panels */}
        <div>
          {tabs.map((t) => (
            <div
              key={t.key}
              id={`panel-${t.key}`}
              role="tabpanel"
              aria-labelledby={`tab-${t.key}`}
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