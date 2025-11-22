/**
 * MigrationTabs.tsx
 *
 * Small presentational tabs component used on the Migration page.
 * Splits UI into named tabs and renders corresponding panels.
 */

import React, { useState } from 'react';

/**
 * Tab definition interface
 */
interface TabDef {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  panel: React.ReactNode;
}

/**
 * Props for MigrationTabs
 */
interface MigrationTabsProps {
  tabs: TabDef[];
  defaultTab?: string;
}

/**
 * MigrationTabs
 * @description Stateless-ish tabs component. Renders tab buttons and the active panel.
 */
const MigrationTabs: React.FC<MigrationTabsProps> = ({ tabs, defaultTab }) => {
  const initial = defaultTab || (tabs.length ? tabs[0].id : '');
  const [active, setActive] = useState<string>(initial);

  const activeTab = tabs.find(t => t.id === active) || tabs[0];

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`px-4 py-2 rounded-lg border ${isActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'} flex items-center gap-2`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        <div>{activeTab.panel}</div>
      </div>
    </div>
  );
};

export default MigrationTabs;