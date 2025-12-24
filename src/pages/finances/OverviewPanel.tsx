/**
 * OverviewPanel.tsx
 *
 * Overview tab extracted from the original Finances page.
 */

import React from 'react';
import { useGame } from '../../contexts/GameContext';
import { useFinancials } from '../../contexts/FinancialContext';
import { MetricCard, CurrencyLabel, MiniLine } from './Common';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';

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

  const IncomeExpensePie: React.FC = () => {
    const txs = Array.isArray((previewFinances as any)?.transactions) ? (previewFinances as any).transactions.slice() : [];

    const incomeByCat: Record<string, number> = {};
    const expenseByCat: Record<string, number> = {};

    txs.forEach((tx: any) => {
      const cat = (tx.category || tx.description || 'Other') as string;
      const amt = Number(tx.amount || 0);
      if (tx.type === 'income') incomeByCat[cat] = (incomeByCat[cat] || 0) + Math.max(0, amt);
      else expenseByCat[cat] = (expenseByCat[cat] || 0) + Math.max(0, Math.abs(amt));
    });

    const buildSlices = (map: Record<string, number>, topN = 5) => {
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

    const { slices: incomeData, total: incomeTotal } = buildSlices(incomeByCat, 5);
    const { slices: expenseData, total: expenseTotal } = buildSlices(expenseByCat, 5);

    const COLORS = ['#34d399', '#60a5fa', '#f59e0b', '#a78bfa', '#f97316', '#fb7185'];

    const SmallLegend: React.FC<{ data: { name: string; value: number }[]; total: number }> = ({ data, total }) => {
      return (
        <div className="mt-3 space-y-2">
          {data.map((d, i) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return (
              <div key={d.name} className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-200">{d.name}</span>
                </div>
                <div className="text-slate-400">
                  {d.value.toLocaleString()} <span className="text-slate-500">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-400">Income by Category</div>
            <div className="text-xs text-slate-400">Read-only</div>
          </div>

          <div className="flex items-center gap-4">
            <div style={{ width: 160, height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeData as any}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                  <YAxis tick={{ fill: '#94a3b8' }} />
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <Tooltip wrapperStyle={{ background: '#0f1724', border: '1px solid #111827' }} />
                  <Bar dataKey="value" name="Income" fill="#34d399" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1">
              <div className="text-white font-semibold text-lg">{incomeTotal.toLocaleString()} USD</div>
              <div className="text-xs text-slate-400">Total income (preview)</div>
              <SmallLegend data={incomeData} total={incomeTotal} />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-slate-400">Expenses by Category</div>
            <div className="text-xs text-slate-400">Read-only</div>
          </div>

          <div className="flex items-center gap-4">
            <div style={{ width: 160, height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseData as any}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                  <YAxis tick={{ fill: '#94a3b8' }} />
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <Tooltip wrapperStyle={{ background: '#0f1724', border: '1px solid #111827' }} />
                  <Bar dataKey="value" name="Expense" fill="#fb7185" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1">
              <div className="text-white font-semibold text-lg">{expenseTotal.toLocaleString()} USD</div>
              <div className="text-xs text-slate-400">Total expenses (preview)</div>
              <SmallLegend data={expenseData} total={expenseTotal} />
            </div>
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
                  <Tooltip wrapperStyle={{ background: '#0f1724', border: '1px solid #111827' }} />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Bar dataKey="income" name="Income" fill="#34d399" />
                  <Bar dataKey="expense" name="Expense" fill="#fb7185" />
                </BarChart>
              </ResponsiveContainer>
            </div>

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
                  <Tooltip wrapperStyle={{ background: '#0f1724', border: '1px solid #111827' }} />
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