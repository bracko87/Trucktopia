/**
 * Finances.helpers.tsx
 *
 * Helper UI pieces used by the Finances page for tax audit display.
 * - Exposes NextAuditBadge: next scheduled audit date (10th each month)
 * - Exposes AuditListGross: shows recent paid audits or synthesizes & persists three prior paid audits.
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
    const d = typeof iso === 'string' ? new Date(iso) : (iso instanceof Date ? iso : new Date());
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
 * @description Renders a short list of recent tax audits.
 * - Uses real audit transactions in company.finances.transactions when possible.
 * - Otherwise synthesizes 3 prior paid audits falling on the 10th of previous months,
 *   persists them into company.finances.transactions and renders them.
 */
export const AuditListGross: React.FC = () => {
  const { gameState, createCompany } = useGame();
  const {
    monthlyRoadTolls,
    monthlyVehicleTax,
    monthlyPayrollTaxes,
    monthlyCIT
  } = useFinancials();

  /**
   * findExistingAudits
   * @description Return transactions that look like tax/audit payments.
   */
  const findExistingAudits = React.useCallback(() => {
    try {
      const txs = (gameState.company as any)?.finances?.transactions || [];
      return (txs || []).filter((t: any) => {
        const desc = String(t.description || '').toLowerCase();
        if (typeof t.type === 'string' && t.type === 'tax') return true;
        if (/tax|audit|tax payment|taxes|tax-audit/i.test(desc)) return true;
        // expense txes with "tax" in description
        if (t.type === 'expense' && desc.includes('tax')) return true;
        return false;
      });
    } catch {
      return [];
    }
  }, [gameState.company]);

  const existingAudits = React.useMemo(() => findExistingAudits(), [findExistingAudits]);

  /**
   * synthesizeAudits
   * @description Build 3 synthetic past audit transactions using available hooks.
   */
  const synthesizeAudits = React.useCallback(() => {
    const now = new Date();
    const monthlyRoad = typeof monthlyRoadTolls === 'function' ? monthlyRoadTolls() : 0;
    const monthlyVehicle = typeof monthlyVehicleTax === 'function' ? monthlyVehicleTax() : 0;
    const monthlyPayroll = typeof monthlyPayrollTaxes === 'function' ? monthlyPayrollTaxes() : 0;
    const monthlyCit = typeof monthlyCIT === 'function' ? monthlyCIT() : 0;

    const base = Math.round(monthlyRoad + monthlyVehicle + monthlyPayroll + monthlyCit);
    const items: Array<any> = [];
    for (let i = 3; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 10, 0, 0, 0, 0);
      const variance = Math.round(base * (0.08 * (i - 1))); // small variation
      const amount = Math.max(100, base - variance);
      items.push({
        id: `synth-audit-${d.getFullYear()}-${d.getMonth() + 1}`,
        date: d.toISOString(),
        amount,
        description: 'Monthly tax audit payment',
        type: 'expense'
      });
    }
    return items;
  }, [monthlyRoadTolls, monthlyVehicleTax, monthlyPayrollTaxes, monthlyCIT]);

  /**
   * seedSynthesizedIfNeeded
   * @description If no existing audits found, persist synthesized audits into company.finances.transactions
   * so they appear in the Transactions list and persist across reloads.
   */
  React.useEffect(() => {
    try {
      if (!gameState.company) return;
      const existing = findExistingAudits();
      if (existing && existing.length > 0) return; // already present

      const synth = synthesizeAudits();
      if (!synth || synth.length === 0) return;

      // Persist by updating company.finances.transactions
      const prevFinances = (gameState.company as any).finances || {};
      const prevTxs = Array.isArray(prevFinances.transactions) ? prevFinances.transactions.slice() : [];
      const merged = [...prevTxs, ...synth];

      const updatedCompany = {
        ...gameState.company,
        finances: {
          ...prevFinances,
          transactions: merged
        }
      };
      // createCompany will persist using GameContext APIs
      createCompany(updatedCompany);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    } catch (err) {
      // ignore persistence failure
      // eslint-disable-next-line no-console
      console.warn('[AuditListGross] seeding audits failed', err);
    }
  }, [gameState.company, createCompany, findExistingAudits, synthesizeAudits]);

  const auditsToRender = existingAudits.length > 0 ? existingAudits : (gameState.company as any)?.finances?.transactions?.filter((t: any) => {
    const desc = String(t.description || '').toLowerCase();
    return /tax|audit|tax payment|taxes|tax-audit/i.test(desc) || (t.type === 'tax') || (t.type === 'expense' && desc.includes('tax'));
  })?.slice(-3) || [];

  if (!auditsToRender || auditsToRender.length === 0) {
    return <div className="text-slate-400">No tax audit records available.</div>;
  }

  return (
    <div className="space-y-2">
      {auditsToRender.slice().reverse().map((a: any) => (
        <div key={a.id || (a.date + Math.random())} className="flex items-center justify-between bg-slate-700 p-2 rounded border border-slate-600">
          <div>
            <div className="text-sm text-slate-200 font-medium">{a.description || 'Tax Audit'}</div>
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