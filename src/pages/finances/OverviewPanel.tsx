/**
 * OverviewPanel.tsx
 *
 * Overview tab for Finances page.
 *
 * Responsibilities:
 * - Present KPIs (balance, estimated net, taxes) and charts (income/expense bars & area)
 * - Render compact interactive donut charts for income & expenses
 * - Provide hover tooltips for each pie segment showing grouped category name, amount and percent
 *
 * Notes:
 * - Expense categories are normalized into broad groups (Loans, Staff, Maintenance, Fuel, Leasing, Taxes, Other)
 *   so each group appears as a single pie slice. This allows users to see aggregated costs by type.
 * - Small UI primitives (CurrencyLabel, MetricCard, MiniLine) and InteractivePieDonut are embedded locally.
 */

import React from 'react';
import { useGame } from '../../contexts/GameContext';
import { useFinancials } from '../../contexts/FinancialContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Legend
} from 'recharts';

/**
 * CurrencyLabel
 * @description Helper to render USD integer format.
 */
const CurrencyLabel: React.FC<{ value: number }> = ({ value }) => {
  return <>{'$' + Math.round(Number(value || 0)).toLocaleString()}</>;
};

/**
 * MetricCard
 * @description Small KPI card used across the page.
 */
const MetricCard: React.FC<{ title: string; value: React.ReactNode; tone?: 'green' | 'red' | 'blue' }> = ({
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
 * @description Tiny sparkline as fallback inline svg.
 */
const MiniLine: React.FC<{ data: Array<{ t: string; balance: number }> }> = ({ data }) => {
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
 * InteractivePieDonut
 * @description Render a donut/pie as SVG rings where each segment is hoverable.
 *
 * Props:
 * - items: array of { name, value, color }
 * - size: diameter px
 * - thickness: ring thickness px
 *
 * Behavior:
 * - Shows small tooltip (absolute) on hover with category name, formatted amount and percent.
 */
const InteractivePieDonut: React.FC<{
  items: { name: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}> = ({ items, size = 120, thickness = 18 }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    name?: string;
    value?: number;
    percent?: number;
  }>({ visible: false, x: 0, y: 0 });

  // Total value and safe segments
  const total = Math.max(0.000001, items.reduce((s, it) => s + Math.max(0, Number(it.value || 0)), 0));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let acc = 0;
  const segments = items.map((it) => {
    const v = Math.max(0, Number(it.value || 0));
    const len = (v / total) * circumference;
    const offset = circumference - acc;
    acc += len;
    return { ...it, len, offset, rawValue: v };
  });

  /**
   * formatAmount
   * @description Format integer USD-friendly
   */
  const formatAmount = (v: number) => `$${Math.round(v).toLocaleString()}`;

  /**
   * handlePointerEnter
   * @description Show tooltip for given segment at pointer position
   */
  const handlePointerEnter = (e: React.PointerEvent, seg: any) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: Math.max(8, Math.min(rect.width - 8, e.clientX - rect.left)),
      y: Math.max(8, Math.min(rect.height - 8, e.clientY - rect.top)),
      name: seg.name,
      value: seg.rawValue,
      percent: total > 0 ? Math.round((seg.rawValue / total) * 100) : 0
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip((t) => ({
      ...t,
      x: Math.max(8, Math.min(rect.width - 8, e.clientX - rect.left)),
      y: Math.max(8, Math.min(rect.height - 8, e.clientY - rect.top))
    }));
  };

  const handlePointerLeave = () =>
    setTooltip({
      visible: false,
      x: 0,
      y: 0
    });

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(-90)`}>
          {/* background ring */}
          <circle r={radius} fill="none" stroke="#0f1724" strokeWidth={thickness} className="opacity-40" />
          {segments.map((s, i) => (
            <circle
              key={i}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={Math.max(1, thickness - 1)}
              strokeDasharray={`${Math.max(0.0001, s.len - 0.5)} ${Math.max(0.0001, circumference - s.len + 0.5)}`}
              strokeDashoffset={s.offset - circumference}
              strokeLinecap="butt"
              className="transition-all cursor-pointer"
              onPointerEnter={(e) => handlePointerEnter(e, s)}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
            />
          ))}
        </g>
      </svg>

      {/* Tooltip (rendered inside container so coordinates are local) */}
      {tooltip.visible && tooltip.name && (
        <div
          className="pointer-events-none absolute z-50 -translate-y-full"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: `translate(-50%, -110%)`
          }}
        >
          <div className="bg-slate-900 text-xs text-slate-200 rounded-md px-3 py-2 border border-slate-700 shadow-lg whitespace-nowrap">
            <div className="font-semibold">{tooltip.name}</div>
            <div className="text-slate-400">{formatAmount(tooltip.value ?? 0)} • {tooltip.percent}%</div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * mapToExpenseGroup
 * @description Normalize a raw transaction category/description into a broad expense group.
 * Groups: Loans, Staff, Maintenance, Fuel, Leasing, Taxes, Other
 */
const mapToExpenseGroup = (raw: string | undefined | null): string => {
  const s = String(raw || '').toLowerCase().trim();
  if (!s) return 'Other';

  if (s.includes('loan') || s.includes('interest') || s.includes('debt')) return 'Loans';
  if (s.includes('payroll') || s.includes('salary') || s.includes('wage') || s.includes('staff') || s.includes('payroll')) return 'Staff';
  if (s.includes('maint') || s.includes('repair') || s.includes('service') || s.includes('parts')) return 'Maintenance';
  if (s.includes('fuel') || s.includes('diesel') || s.includes('gas') || s.includes('petrol')) return 'Fuel';
  if (s.includes('lease') || s.includes('leasing') || s.includes('rent')) return 'Leasing';
  if (s.includes('tax') || s.includes('vat') || s.includes('council') || s.includes('cit') || s.includes('income tax')) return 'Taxes';
  if (s.includes('insurance') || s.includes('insur')) return 'Insurance';
  if (s.includes('loan') || s.includes('interest')) return 'Loans';
  return 'Other';
};

/**
 * OverviewPanel
 * @description Presents KPIs and charts: balance history, income vs expense.
 */
const OverviewPanel: React.FC = () => {
  const { gameState } = useGame();
  const { finances: canonicalFinances, monthlyNetProfitEstimate, monthlyPayrollTaxes, monthlyCIT } = useFinancials();

  const balance = gameState.company?.capital ?? 0;
  const netProfit = monthlyNetProfitEstimate();
  const payroll = monthlyPayrollTaxes();
  const cit = monthlyCIT();

  const previewFinances = React.useMemo(() => {
    try {
      return canonicalFinances ? JSON.parse(JSON.stringify(canonicalFinances)) : {};
    } catch {
      return canonicalFinances || {};
    }
  }, [canonicalFinances]);

  const buildHistory = React.useCallback((): Array<{ t: string; balance: number }> => {
    try {
      const raw = Array.isArray((previewFinances as any)?.balanceHistory) ? (previewFinances as any).balanceHistory : [];
      const normalized = raw
        .map((d: any, idx: number) => {
          const t = typeof d.t === 'string' ? d.t : d.label ? String(d.label) : `p${idx}`;
          const b = Number(d.balance ?? d.value ?? 0);
          return { t, balance: Number.isFinite(b) ? b : 0 };
        })
        .filter(Boolean);

      if (normalized.length > 0) return normalized.slice(-12);
      const base = Math.max(0, Number(balance || 0));
      return Array.from({ length: 8 }).map((_, i) => ({
        t: `m${i + 1}`,
        balance: Math.round(base * (0.9 + 0.025 * i))
      }));
    } catch {
      const base = Math.max(0, Number(balance || 0));
      return Array.from({ length: 8 }).map((_, i) => ({
        t: `m${i + 1}`,
        balance: Math.round(base * (0.9 + 0.02 * i))
      }));
    }
  }, [previewFinances, balance]);

  const historyData = React.useMemo(() => buildHistory(), [buildHistory]);

  const buildTxnSeries = React.useCallback(
    (months = 6) => {
      try {
        const txs = Array.isArray((previewFinances as any)?.transactions) ? (previewFinances as any).transactions.slice() : [];
        const now = new Date();
        const buckets: Record<string, { monthLabel: string; income: number; expense: number }> = {};

        for (let i = months - 1; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          buckets[key] = { monthLabel: d.toLocaleString(undefined, { month: 'short', year: 'numeric' }), income: 0, expense: 0 };
        }

        txs.forEach((tx: any) => {
          try {
            const date = tx.date ? new Date(tx.date) : null;
            if (!date || Number.isNaN(date.getTime())) return;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!(key in buckets)) return;
            const amt = Number(tx.amount || 0);
            if (tx.type === 'income') buckets[key].income += amt;
            else buckets[key].expense += Math.abs(amt);
          } catch {
            // ignore malformed tx
          }
        });

        const out = Object.keys(buckets).map((k) => ({ month: buckets[k].monthLabel, income: Math.round(buckets[k].income), expense: Math.round(buckets[k].expense) }));
        if (out.length === 0) {
          return [{ month: new Date().toLocaleDateString(), income: 0, expense: 0 }];
        }
        return out;
      } catch {
        const baseInc = Math.max(0, Math.round((netProfit || 0) * 1.2));
        const baseExp = Math.max(0, Math.round(Math.abs(netProfit) || 0.6 * baseInc));
        return Array.from({ length: months }).map((_, i) => ({ month: `m${i + 1}`, income: Math.round(baseInc * (0.7 + i * 0.1)), expense: Math.round(baseExp * (0.8 + i * 0.05)) }));
      }
    },
    [previewFinances, netProfit]
  );

  const txnSeries = React.useMemo(() => buildTxnSeries(6), [buildTxnSeries]);

  /**
   * IncomeExpensePie
   * @description Compact donut + short total label. Expenses are grouped into canonical groups.
   */
  const IncomeExpensePie: React.FC = () => {
    const txs = Array.isArray((previewFinances as any)?.transactions) ? (previewFinances as any).transactions.slice() : [];

    // Aggregate income by raw category (keeps original granularity for income)
    const incomeByCat: Record<string, number> = {};
    // Aggregate expenses into mapped groups
    const expenseGroups: Record<string, number> = {};

    txs.forEach((tx: any) => {
      try {
        const amt = Number(tx.amount || 0);
        if (tx.type === 'income') {
          const cat = String(tx.category || tx.description || 'Other');
          incomeByCat[cat] = (incomeByCat[cat] || 0) + Math.max(0, amt);
        } else {
          const raw = String(tx.category || tx.description || tx.note || 'Other');
          const group = mapToExpenseGroup(raw);
          expenseGroups[group] = (expenseGroups[group] || 0) + Math.max(0, Math.abs(amt));
        }
      } catch {
        // ignore
      }
    });

    // Build slices limited to top N (others combined)
    const buildSlices = (map: Record<string, number>, topN = 6) => {
      const items = Object.keys(map)
        .map((k) => ({ name: k, value: Math.round(map[k]) }))
        .sort((a, b) => b.value - a.value);
      const total = items.reduce((s, it) => s + it.value, 0);
      if (items.length <= topN) return { slices: items, total };
      const top = items.slice(0, topN);
      const others = items.slice(topN).reduce((s, it) => s + it.value, 0);
      if (others > 0) top.push({ name: 'Other', value: others });
      return { slices: top, total };
    };

    const { slices: incomeData, total: incomeTotal } = buildSlices(incomeByCat, 6);
    const { slices: expenseData, total: expenseTotal } = buildSlices(expenseGroups, 8);

    // Color palettes
    const INCOME_COLORS = ['#34d399', '#60a5fa', '#f59e0b', '#a78bfa', '#f97316', '#fb7185'];
    // Use red palette for expenses (distinct reds/pinks)
    const EXPENSE_COLORS = ['#fb7185', '#f43f5e', '#ef4444', '#dc2626', '#ef9a9a', '#f97316', '#fca5a5', '#fda4af'];

    const incomeItems = incomeData.map((d, i) => ({ ...d, color: INCOME_COLORS[i % INCOME_COLORS.length] }));
    const expenseItems = expenseData.map((d, i) => ({ ...d, color: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }));

    return (
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-4">
          <div style={{ width: 160, height: 140 }}>
            <InteractivePieDonut items={incomeItems} size={120} thickness={18} />
          </div>

          <div className="flex-1">
            <div className="text-sm text-slate-400">Income by Category</div>
            <div className="text-white font-semibold text-lg mt-2">{incomeTotal.toLocaleString()} USD</div>
            <div className="text-xs text-slate-400">Hover the pie to see details</div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-4">
          <div style={{ width: 160, height: 140 }}>
            <InteractivePieDonut items={expenseItems} size={120} thickness={18} />
          </div>

          <div className="flex-1">
            <div className="text-sm text-slate-400">Expenses by Group</div>
            <div className="text-white font-semibold text-lg mt-2">{expenseTotal.toLocaleString()} USD</div>
            <div className="text-xs text-slate-400">Hover the pie to see grouped costs (Loans, Staff, Maintenance, ...)</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Finances</h1>
          <p className="text-slate-400">Manage company transactions, loans, leases and taxes</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Current Balance" value={<CurrencyLabel value={balance} />} />
            <MetricCard title="Estimated Net (Monthly)" value={<CurrencyLabel value={netProfit} />} tone={netProfit >= 0 ? 'green' : 'red'} />
            <MetricCard title="Payroll Taxes (Monthly)" value={<CurrencyLabel value={payroll} />} />
            <MetricCard title="CIT Estimate (Monthly)" value={<CurrencyLabel value={cit} />} tone="blue" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="col-span-2 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-slate-400">Income vs Expense (recent months)</div>
              <div className="text-xs text-slate-400">Amounts (USD)</div>
            </div>
            <div style={{ width: '100%', height: 140 }}>
              <ResponsiveContainer>
                <BarChart data={txnSeries}>
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8' }} />
                  <YAxis tick={{ fill: '#94a3b8' }} />
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <RechartsTooltip wrapperStyle={{ background: '#0f1724', border: '1px solid #111827' }} />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Bar dataKey="income" name="Income" fill="#34d399" />
                  <Bar dataKey="expense" name="Expense" fill="#fb7185" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Compact donut charts with grouped expense slices */}
            <IncomeExpensePie />
          </div>

          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="text-sm text-slate-400 mb-2">Monthly Net (stacked)</div>
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <AreaChart data={txnSeries} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <defs>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fill: '#94a3b8' }} />
                  <YAxis tick={{ fill: '#94a3b8' }} />
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <RechartsTooltip wrapperStyle={{ background: '#0f1724', border: '1px solid #111827' }} />
                  <Area type="monotone" dataKey="income" stackId="1" name="Income" stroke="#34d399" fill="url(#netGrad)" />
                  <Area type="monotone" dataKey="expense" stackId="1" name="Expense" stroke="#fb7185" fill="#fb7185" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewPanel;