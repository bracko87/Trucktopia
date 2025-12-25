/**
 * Finances.helpers.tsx
 *
 * Helper UI pieces used by the Finances page for tax audit display.
 * - Exposes NextAuditBadge: next scheduled audit date (10th each month)
 * - Exposes AuditListGross: shows recent paid audits by reading actual tax transactions
 *
 * Notes:
 * - Monthly tax payments are created by FinancialProvider on the 10th of each month.
 * - AuditListGross shows only one entry per month (the most recent tax transaction for that month)
 *   and limits the view to the last 5 months.
 */

import React from 'react';
import { useGame } from '../contexts/GameContext';
import { useFinancials } from '../contexts/FinancialContext';

/**
 * formatISO
 * @description Format a Date to a readable short string
 */
function formatISO(iso?: string | Date) {
  try {
    const d = typeof iso === 'string' ? new Date(iso) : iso instanceof Date ? iso : new Date();
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(iso);
  }
}

/**
 * NextAuditBadge
 * @description Small component that computes the next scheduled audit date (10th monthly).
 */
export const NextAuditBadge: React.FC = () => {
  const next = React.useMemo(() => {
    const now = new Date();
    // Candidate is the 10th of current month
    const candidate = new Date(now.getFullYear(), now.getMonth(), 10, 0, 0, 0, 0);
    if (candidate.getTime() <= now.getTime()) {
      // already passed -> next month
      candidate.setMonth(candidate.getMonth() + 1);
    }
    return candidate;
  }, []);
  return <div className="text-sm text-slate-200 font-medium">Next audit: {formatISO(next)}</div>;
};

/**
 * AuditListGross
 * @description Renders a short list of recent tax audit / tax payment transactions.
 * - Reads actual transactions from company.finances.transactions and filters those of type 'tax'
 *   or transactions that explicitly mention tax in category/description.
 * - Ensures only a single entry per year-month is shown (latest in that month).
 * - Shows up to the last 5 months.
 */
export const AuditListGross: React.FC = () => {
  const { gameState } = useGame();
  const { monthlyRoadTolls, monthlyVehicleTax, monthlyPayrollTaxes, monthlyCIT } = useFinancials();

  const transactions: any[] = React.useMemo(() => {
    try {
      const txs = (gameState.company as any)?.finances?.transactions || [];
      if (!Array.isArray(txs)) return [];

      // Filter tax-ish transactions
      const taxTxs = txs.filter((t: any) => {
        if (!t) return false;
        if (t.type === 'tax') return true;
        const cat = String(t.category || '').toLowerCase();
        const desc = String(t.description || '').toLowerCase();
        if (cat.includes('tax') || desc.includes('tax') || desc.includes('audit') || cat.includes('payroll') || cat.includes('vehicle') || cat.includes('tolls')) return true;
        return false;
      });

      // Map to year-month -> keep the latest transaction within that month
      const byMonth = new Map<string, any>();
      taxTxs.forEach((t: any) => {
        try {
          const date = t.date ? new Date(t.date) : null;
          if (!date || Number.isNaN(date.getTime())) return;
          const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const existing = byMonth.get(ym);
          if (!existing) {
            byMonth.set(ym, t);
            return;
          }
          const existingDate = existing.date ? new Date(existing.date) : null;
          if (!existingDate || (date.getTime() > existingDate.getTime())) {
            byMonth.set(ym, t);
          }
        } catch {
          // ignore malformed tx
        }
      });

      // Convert map to array sorted by date desc and limit to 5 months
      const arr = Array.from(byMonth.values()).sort((a: any, b: any) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });

      return arr.slice(0, 5);
    } catch {
      return [];
    }
  }, [gameState.company]);

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-slate-400">
        No tax audit records available. Monthly tax payments are processed on the 10th of each month and will appear here when paid.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((a: any) => (
        <div key={a.id || (a.date + Math.random())} className="flex items-center justify-between bg-slate-700 p-2 rounded border border-slate-600">
          <div>
            <div className="text-sm text-slate-200 font-medium">{a.description || 'Monthly tax audit payment'}</div>
            <div className="text-xs text-slate-400">{formatISO(a.date)}</div>
          </div>
          <div className="text-right">
            <div className="text-white font-semibold">${Number(a.amount).toLocaleString()}</div>
            <div className="text-xs text-emerald-400">Paid</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default {} as any;