/**
 * Common.tsx
 *
 * Shared small UI pieces used across the finances page panels.
 */

import React from 'react';

/**
 * CurrencyLabel
 * @description Small helper to format USD as integer (no cents)
 */
export const CurrencyLabel: React.FC<{ value: number }> = ({ value }) => {
  return <>{'$' + Math.round(Number(value || 0)).toLocaleString()}</>;
};

/**
 * MetricCard
 * @description Small KPI card used across the page.
 */
export const MetricCard: React.FC<{ title: string; value: React.ReactNode; tone?: 'green' | 'red' | 'blue' }> = ({
  title,
  value,
  tone = 'blue'
}) => {
  const toneColor = tone === 'green' ? 'text-green-400' : tone === 'red' ? 'text-rose-400' : 'text-blue-400';
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="text-sm text-slate-400">{title}</div>
      <div className={`text-2xl font-bold ${toneColor} mt-1`}>{value}</div>
    </div>
  );
};

/**
 * MiniLine
 * @description Tiny sparkline based on balance history using an inline SVG fallback.
 */
export const MiniLine: React.FC<{ data: Array<{ t: string; balance: number }> }> = ({ data }) => {
  const safe = data && data.length ? data : [{ t: new Date().toISOString(), balance: 0 }];
  const values = safe.map((d) => d.balance);
  const min = Math.min(...values);
  const max = Math.max(...values) || 1;
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * 100;
      const y = 100 - ((v - min) / (max - min)) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width="100%" height="80" viewBox="0 0 100 100" preserveAspectRatio="none" className="block">
      <polyline fill="none" stroke="#60a5fa" strokeWidth="1.5" points={points} />
    </svg>
  );
};

/**
 * Tabs
 * @description Simple tabs component used by the page
 */
export const Tabs: React.FC<{ tabs: { id: string; label: string; panel: React.ReactNode }[] }> = ({ tabs }) => {
  const [active, setActive] = React.useState<string>(tabs[0].id);
  const activePanel = tabs.find((t) => t.id === active)?.panel ?? null;
  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md ${
              active === t.id ? 'bg-slate-700 border border-slate-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="text-sm">{t.label}</span>
          </button>
        ))}
      </div>
      <div>{activePanel}</div>
    </div>
  );
};

export default {} as any;