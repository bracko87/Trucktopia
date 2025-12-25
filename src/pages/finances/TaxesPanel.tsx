/**
 * TaxesPanel.tsx
 *
 * Taxes tab extracted from the original Finances page.
 */

import React from 'react';
import { useFinancials } from '../../contexts/FinancialContext';
import { useGame } from '../../contexts/GameContext';
import { CurrencyLabel } from './Common';
import { NextAuditBadge, AuditListGross } from '../Finances.helpers';

const MetricCardLocal: React.FC<{ title: string; value: React.ReactNode; tone?: 'green' | 'red' | 'blue' }> = ({
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
 * TaxesPanel
 * @description Interactive taxes tab with visible tax types and actions.
 */
const TaxesPanel: React.FC = () => {
  const { monthlyPayrollTaxes, monthlyCIT, monthlyNetProfitEstimate, monthlyRoadTolls, monthlyVehicleTax, addTransaction } =
    useFinancials();
  const { gameState } = useGame();

  // Base for salary/payroll taxes – sum of visible staff salaries
  const payrollBase = React.useMemo(() => {
    try {
      const staff = Array.isArray(gameState.company?.staff) ? gameState.company!.staff : [];
      return staff.reduce((s: number, st: any) => s + (Number(st.salary || 0) || 0), 0);
    } catch {
      return 0;
    }
  }, [gameState.company?.staff]);

  const payroll = React.useMemo(() => {
    try {
      if (typeof monthlyPayrollTaxes === 'function') {
        const v = monthlyPayrollTaxes();
        return Math.max(0, Math.round(Number(v || 0)));
      }
      const rate = 0.15;
      return Math.max(0, Math.round(payrollBase * rate));
    } catch {
      return 0;
    }
  }, [monthlyPayrollTaxes, payrollBase]);

  const cit = React.useMemo(() => {
    try {
      if (typeof monthlyCIT === 'function') {
        const v = monthlyCIT();
        return Math.max(0, Math.round(Number(v || 0)));
      }
      const net = typeof monthlyNetProfitEstimate === 'function' ? monthlyNetProfitEstimate() : 0;
      const estimate = net > 0 ? Math.round(net * 0.12) : 0;
      return Math.max(0, estimate);
    } catch {
      return 0;
    }
  }, [monthlyCIT, monthlyNetProfitEstimate]);

  const road = React.useMemo(() => {
    try {
      if (typeof monthlyRoadTolls === 'function') {
        const v = monthlyRoadTolls();
        return Math.max(0, Math.round(Number(v || 0)));
      }
      return 0;
    } catch {
      return 0;
    }
  }, [monthlyRoadTolls, gameState.company?.activeJobs]);

  const registration = React.useMemo(() => {
    try {
      if (typeof monthlyVehicleTax === 'function') {
        const v = monthlyVehicleTax();
        return Math.max(0, Math.round(Number(v || 0)));
      }
      return 0;
    } catch {
      return 0;
    }
  }, [monthlyVehicleTax, gameState.company?.trucks, gameState.company?.trailers]);

  const breakdown = React.useMemo(
    () => ({
      payroll,
      cit,
      road,
      registration
    }),
    [payroll, cit, road, registration]
  );

  const grossTaxes = React.useMemo(
    () => Object.values(breakdown).reduce((s, n) => s + (Number(n || 0) || 0), 0),
    [breakdown]
  );

  const companyBalance = Number(gameState.company?.capital || 0);

  const makeExpenseTx = (amount: number, description: string) => ({
    id: `tax-${description.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    date: new Date().toISOString(),
    // Taxes paid from the Taxes panel are recorded as 'tax' type so they appear in audit lists
    type: 'tax' as const,
    // Keep amounts positive: the provider will deduct capital when persisting transactions.
    amount: Math.round(amount),
    description,
    category: description
  });

  const paySingle = (key: keyof typeof breakdown, label: string) => {
    const amount = Math.max(0, Math.round(breakdown[key] || 0));
    if (!amount) {
      window.alert('Nothing to pay for ' + label);
      return;
    }
    if (companyBalance < amount && !window.confirm('Company balance is lower than this payment. Proceed anyway?')) {
      return;
    }
    if (!window.confirm(`Confirm payment: ${label} — $${amount.toLocaleString()}`)) return;

    try {
      addTransaction(makeExpenseTx(amount, `${label} payment`));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('paySingle error', err);
      window.alert('Failed to record payment');
    }
  };

  const payAll = () => {
    if (grossTaxes <= 0) {
      window.alert('Nothing to pay');
      return;
    }
    if (companyBalance < grossTaxes && !window.confirm('Company balance is lower than total taxes. Proceed anyway?')) {
      return;
    }
    if (!window.confirm(`Confirm payment: All Taxes — $${grossTaxes.toLocaleString()}`)) return;

    const entries = [
      { amount: breakdown.payroll, label: 'Payroll Taxes' },
      { amount: breakdown.cit, label: 'Corporate Income Tax (CIT)' },
      { amount: breakdown.road, label: 'Road Tax' },
      { amount: breakdown.registration, label: 'Vehicle Registration Tax' }
    ].filter((e) => e.amount > 0);

    try {
      entries.forEach((e) => {
        try {
          addTransaction(makeExpenseTx(e.amount, `${e.label} payment`));
        } catch (innerErr) {
          // eslint-disable-next-line no-console
          console.warn('payAll individual tx failed', e, innerErr);
        }
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('payAll error', err);
      window.alert('Failed to record payments');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Taxes</h2>
        <div className="text-sm text-slate-400">Monthly tax estimates (live) and quick payment actions</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCardLocal title="Payroll Taxes (Monthly)" value={<CurrencyLabel value={breakdown.payroll} />} tone="red" />
        <MetricCardLocal title="Corporate Income Tax (Monthly est.)" value={<CurrencyLabel value={breakdown.cit} />} tone="red" />
        <MetricCardLocal title="Road Tax (Monthly est.)" value={<CurrencyLabel value={breakdown.road} />} tone="red" />
        <MetricCardLocal title="Registration Tax (Monthly est.)" value={<CurrencyLabel value={breakdown.registration} />} tone="red" />
      </div>

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-400">Tax Breakdown & Actions</div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between bg-slate-700 p-3 rounded border border-slate-600">
                <div>
                  <div className="text-sm text-slate-200 font-medium">Payroll Taxes</div>
                  <div className="text-xs text-slate-400">
                    Estimated from visible staff salaries
                    {payrollBase ? ` (${payrollBase.toLocaleString()} USD payroll base)` : ''}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">{'$' + Math.round(breakdown.payroll).toLocaleString()}</div>
                  <div className="mt-2 flex gap-2 justify-end">
                    <button onClick={() => paySingle('payroll', 'Payroll Taxes')} className="px-3 py-1 bg-blue-600 rounded text-white text-xs">
                      Pay
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-700 p-3 rounded border border-slate-600">
                <div>
                  <div className="text-sm text-slate-200 font-medium">Corporate Income Tax (CIT)</div>
                  <div className="text-xs text-slate-400">Uses monthly CIT hook (12% on taxable monthly profit) when available.</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">{'$' + Math.round(breakdown.cit).toLocaleString()}</div>
                  <div className="mt-2 flex gap-2 justify-end">
                    <button onClick={() => paySingle('cit', 'Corporate Income Tax (CIT)')} className="px-3 py-1 bg-blue-600 rounded text-white text-xs">
                      Pay
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-700 p-3 rounded border border-slate-600">
                <div>
                  <div className="text-sm text-slate-200 font-medium">Road Tax</div>
                  <div className="text-xs text-slate-400">Road tolls estimated from driven distance: $0.05 per km (uses monthly road tolls hook).</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">{'$' + Math.round(breakdown.road).toLocaleString()}</div>
                  <div className="mt-2 flex gap-2 justify-end">
                    <button onClick={() => paySingle('road', 'Road Tax')} className="px-3 py-1 bg-blue-600 rounded text-white text-xs">
                      Pay
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-700 p-3 rounded border border-slate-600">
                <div>
                  <div className="text-sm text-slate-200 font-medium">Vehicle Registration Tax</div>
                  <div className="text-xs text-slate-400">
                    Vehicle Tax: monthly prorated based on vehicle class & age (small $600/yr, medium $1000/yr, big $1500/yr) with age discounts.
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">{'$' + Math.round(breakdown.registration).toLocaleString()}</div>
                  <div className="mt-2 flex gap-2 justify-end">
                    <button onClick={() => paySingle('registration', 'Vehicle Registration Tax')} className="px-3 py-1 bg-blue-600 rounded text-white text-xs">
                      Pay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-400">Summary</div>
            <div className="mt-3 bg-slate-700 p-3 rounded border border-slate-600">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-300">Gross monthly taxes</div>
                <div className="text-white font-bold">{'$' + grossTaxes.toLocaleString()}</div>
              </div>
              <div className="text-xs text-slate-400 mt-2">Sum of payroll, CIT, road and registration taxes for the current month.</div>

              <div className="mt-4 flex items-center justify-between">
                <button onClick={payAll} disabled={grossTaxes <= 0} className={`px-4 py-2 rounded-md text-white ${grossTaxes > 0 ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-600 cursor-not-allowed'}`}>
                  Pay All
                </button>
                <div className="text-xs text-slate-400">
                  Available: <CurrencyLabel value={Math.round(companyBalance)} />
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 mt-3">
              Explanations:
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>
                  <span className="text-slate-200">Payroll Taxes:</span> based on visible
                  staff salaries or the monthly payroll hook if provided.
                </li>
                <li>
                  <span className="text-slate-200">CIT:</span> uses monthly CIT hook when
                  available, otherwise 20% of your positive net profit estimate.
                </li>
                <li>
                  <span className="text-slate-200">Road Tax:</span> a simple monthly road
                  charge per truck plus a tonnage component.
                </li>
                <li>
                  <span className="text-slate-200">Registration Tax:</span> tonne-based
                  registration cost across trucks and trailers.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Audit widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">Next Audit</div>
            <NextAuditBadge />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-sm text-slate-400">Recent Tax Audits</div>
          <div className="mt-3">
            <AuditListGross />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxesPanel;