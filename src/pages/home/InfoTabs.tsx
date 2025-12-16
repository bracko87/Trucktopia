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
            Trucktopia is a logistics simulation where you buy vehicles, hire staff,
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
            Discuss strategies, game rules, and mechanics with the community.
            Join challenges, track leaderboards, and stay connected with other players.
          </p>
          <p>
            <a
              href="https://discord.gg/TRUCKTOPIA"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Join our Discord Channel
            </a>
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
            Need help? Check the game manual, visit our Discord community, or explore the FAQ in settings.
          </p>
          <p>
            You can also contact us directly using the support form in game settings.
          </p>
        </div>
      )
    },
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
        {/* Tab list - stretch each tab equally across the available width */}
        <div
          role="tablist"
          aria-label="Information tabs"
          className="flex gap-2 mb-4 w-full"
          onKeyDown={handleKeyDown}
        >
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
