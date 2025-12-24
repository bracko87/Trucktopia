/**
 * LoansPanel.tsx
 *
 * Loans & Credits tab extracted from the original Finances page.
 */

import React from 'react';
import { useFinancials } from '../../contexts/FinancialContext';
import { useGame } from '../../contexts/GameContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, LineChart, Line, BarChart, Bar, Tooltip, Legend } from 'recharts';
import { CurrencyLabel } from './Common';

/**
 * LoansPanel
 * @description UI for selecting bank offer, previewing amortization and taking a loan.
 */
const LoansPanel: React.FC = () => {
  const { finances, takeLoan, repayLoan } = useFinancials();
  const { gameState } = useGame();

  interface BankOffer {
    id: string;
    name: string;
    shortApr: number;
    longApr: number;
    minWeeks: number;
    maxWeeks: number;
    multiplier: number;
    maxLoan?: number;
  }

  const banks: BankOffer[] = React.useMemo(
    () => [
      { id: 'smartbank', name: 'SmartBank', shortApr: 4.0, longApr: 7.5, minWeeks: 4, maxWeeks: 52, multiplier: 2.5, maxLoan: 200000 },
      { id: 'upec', name: 'UPE Credit', shortApr: 4.8, longApr: 8.0, minWeeks: 4, maxWeeks: 52, multiplier: 2.0, maxLoan: 150000 },
      { id: 'tradelend', name: 'TradeLend', shortApr: 5.0, longApr: 9.0, minWeeks: 4, maxWeeks: 52, multiplier: 1.8, maxLoan: 100000 },
      { id: 'horizon', name: 'Horizon Finance', shortApr: 4.5, longApr: 8.8, minWeeks: 4, maxWeeks: 52, multiplier: 2.2, maxLoan: 180000 },
      { id: 'metrocap', name: 'MetroCap', shortApr: 6.0, longApr: 11.0, minWeeks: 4, maxWeeks: 52, multiplier: 1.5, maxLoan: 80000 },
      { id: 'national', name: 'National Fund', shortApr: 3.9, longApr: 6.5, minWeeks: 4, maxWeeks: 52, multiplier: 3.0, maxLoan: 250000 },
      { id: 'river', name: 'Riverbank', shortApr: 5.5, longApr: 9.5, minWeeks: 4, maxWeeks: 52, multiplier: 1.7, maxLoan: 120000 },
      { id: 'capitalx', name: 'CapitalOneX', shortApr: 4.2, longApr: 6.9, minWeeks: 4, maxWeeks: 52, multiplier: 2.0, maxLoan: 160000 },
      { id: 'frontier', name: 'Frontier Loans', shortApr: 6.5, longApr: 12.0, minWeeks: 4, maxWeeks: 52, multiplier: 1.3, maxLoan: 70000 },
      { id: 'atlas', name: 'Atlas Finance', shortApr: 5.1, longApr: 9.0, minWeeks: 4, maxWeeks: 52, multiplier: 2.1, maxLoan: 140000 }
    ],
    []
  );

  const [selectedBankId, setSelectedBankId] = React.useState<string>(banks[0].id);
  const [principal, setPrincipal] = React.useState<number>(10000);
  const [termWeeks, setTermWeeks] = React.useState<number>(12);

  const selectedBank = React.useMemo(() => banks.find((b) => b.id === selectedBankId) ?? banks[0], [banks, selectedBankId]);

  const computeDynamicApr = React.useCallback((bank: BankOffer, weeks: number) => {
    const w = Math.max(bank.minWeeks, Math.min(bank.maxWeeks, Math.floor(weeks)));
    const t = (w - 4) / Math.max(1, 52 - 4);
    const monthlyMax = 9.0;
    const monthlyMin = 6.0;
    const monthlyApr = Number((monthlyMax - t * (monthlyMax - monthlyMin)).toFixed(2));
    return monthlyApr;
  }, []);

  const chosenApr = React.useMemo(() => computeDynamicApr(selectedBank, termWeeks), [selectedBank, termWeeks, computeDynamicApr]);

  const weeklyRatePct = React.useMemo(() => {
    const weeksPerMonth = 4.345;
    return Number((chosenApr / weeksPerMonth).toFixed(4));
  }, [chosenApr]);

  const computeWeeklyPayment = (P: number, weeklyPct: number, weeks: number) => {
    if (weeks <= 0 || P <= 0) return 0;
    const r = weeklyPct / 100;
    if (r <= 0) return P / weeks;
    return (P * r) / (1 - Math.pow(1 + r, -weeks));
  };

  const weeklyPayment = React.useMemo(() => computeWeeklyPayment(principal, weeklyRatePct, termWeeks), [principal, weeklyRatePct, termWeeks]);

  const creditInfo = React.useMemo(() => {
    const company = gameState.company;
    const capital = company && typeof company.capital === 'number' ? company.capital : 0;
    const founded = company && company.founded ? new Date(company.founded).getTime() : Date.now();
    const years = Math.max(0, (Date.now() - founded) / (1000 * 60 * 60 * 24 * 365));

    const capScore = Math.min(70, Math.round(Math.log10(Math.max(1, capital)) * 12));
    const ageScore = Math.min(30, Math.round(Math.min(10, years) * 3));
    const computedScore = Math.min(100, capScore + ageScore);

    const score =
      typeof (company as any)?.creditScore === 'number' ? Math.max(0, Math.min(100, Math.round((company as any).creditScore))) : computedScore;

    const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';

    const baseLimit = Math.round(capital * selectedBank.multiplier + Math.floor(Math.min(10, years)) * 10000);
    const effectiveMax = selectedBank.maxLoan ? Math.min(baseLimit, selectedBank.maxLoan) : baseLimit;
    const numericLimit = Math.max(5000, effectiveMax);

    const typicalRange = grade === 'A' ? '≥ 150k' : grade === 'B' ? '50k–150k' : grade === 'C' ? '15k–50k' : '5k–15k';

    return { score, grade, limit: numericLimit, typicalRange };
  }, [gameState.company, selectedBank]);

  const canTake = principal >= 100 && principal <= creditInfo.limit && principal <= (selectedBank.maxLoan ?? Infinity);

  const buildSchedule = React.useCallback(() => {
    const items: Array<{ t: string; balance: number }> = [];
    let balanceLocal = principal;
    const payment = computeWeeklyPayment(principal, weeklyRatePct, termWeeks);
    const r = weeklyRatePct / 100;

    for (let w = 0; w <= termWeeks; w++) {
      if (w % Math.max(1, Math.round(termWeeks / 20)) === 0) {
        items.push({ t: `w${w}`, balance: Math.round(Math.max(0, balanceLocal)) });
      }
      if (w === termWeeks) break;
      const interest = balanceLocal * r;
      const principalPaid = Math.max(0, payment - interest);
      balanceLocal = Math.max(0, balanceLocal - principalPaid);
    }
    if (items.length === 0) items.push({ t: 'w0', balance: principal });
    return items;
  }, [principal, weeklyRatePct, termWeeks]);

  const chartData = React.useMemo(() => buildSchedule(), [buildSchedule]);

  const handleTakeLoan = () => {
    const weeks = Math.max(4, Math.min(52, Math.floor(termWeeks)));
    if (!canTake) {
      window.alert('Loan amount invalid or exceeds allowed credit limit.');
      return;
    }
    const id = `loan-${Date.now()}`;
    takeLoan({
      id,
      principal: Math.round(principal),
      annualRate: Number(chosenApr || 0),
      termMonths: Math.max(1, Math.round(weeks / 4))
    });
    window.alert('Loan taken: ' + id);
  };

  const activeLoans = (finances.loans || []).filter((l) => l.status === 'active');
  const repaidLoans = (finances.loans || []).filter((l) => l.status === 'paid');

  const handleRepayPrompt = (loanId: string) => {
    const amt = window.prompt('Repay amount (USD)', '1000');
    if (!amt) return;
    const n = Number(amt);
    if (!Number.isFinite(n) || n <= 0) {
      window.alert('Invalid amount');
      return;
    }
    repayLoan(loanId, n);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Loans & Credits</h2>
        <div className="text-sm text-slate-400 text-right">
          <div className="text-xs">Credit overview and offers</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 space-y-3">
          {banks.map((b) => {
            const dynamicApr = computeDynamicApr(b, termWeeks);
            const isSelected = b.id === selectedBankId;
            return (
              <button
                key={b.id}
                onClick={() => {
                  setSelectedBankId(b.id);
                  setTermWeeks((prev) => Math.max(b.minWeeks, Math.min(b.maxWeeks, Math.min(prev, 52))));
                }}
                className={`w-full text-left p-3 rounded-lg border ${isSelected ? 'border-yellow-500 bg-slate-700 shadow' : 'border-slate-700 bg-slate-800'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-md flex items-center justify-center text-slate-400">{b.name.charAt(0)}</div>
                    <div>
                      <div className="font-semibold text-white">{b.name}</div>
                      <div className="text-xs text-slate-400">Terms: {b.minWeeks}–{b.maxWeeks} weeks</div>
                      <div className="text-xs text-slate-400">APR (est): {dynamicApr}%</div>
                    </div>
                  </div>
                  <div className="text-sm text-white font-bold">Max {b.maxLoan ? `$${b.maxLoan.toLocaleString()}` : '—'}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-300">Principal (USD)</label>
              <input type="number" className="w-full bg-slate-700 border border-slate-600 px-3 py-2 rounded text-white" value={principal} onChange={(e) => setPrincipal(Number(e.target.value || 0))} />
              <div className="text-xs text-slate-400 mt-1">Credit limit: <span className="text-white font-medium">${creditInfo.limit.toLocaleString()}</span></div>
              {principal > creditInfo.limit && <div className="text-xs text-rose-400 mt-1">Requested amount exceeds computed credit limit.</div>}
            </div>

            <div>
              <label className="text-sm text-slate-300">Term (weeks)</label>
              <input type="number" min={4} max={52} className="w-full bg-slate-700 border border-slate-600 px-3 py-2 rounded text-white" value={termWeeks} onChange={(e) => setTermWeeks(Math.max(4, Math.min(52, Number(e.target.value || 4))))} />
              <div className="text-xs text-slate-400 mt-1">APR adapts with term: {chosenApr}% (monthly)</div>
            </div>

            <div>
              <label className="text-sm text-slate-300">Selected Lender</label>
              <div className="w-full bg-slate-700 border border-slate-600 px-3 py-2 rounded text-white">{selectedBank.name}</div>
            </div>

            <div>
              <label className="text-sm text-slate-300">Estimated weekly payment</label>
              <div className="text-lg font-bold text-green-400"><CurrencyLabel value={weeklyPayment} /></div>
              <div className="text-xs text-slate-400 mt-1">Weekly rate: {weeklyRatePct}%</div>
            </div>
          </div>

          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradLoan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tick={{ fill: '#94a3b8' }} />
                <YAxis tick={{ fill: '#94a3b8' }} />
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="balance" stroke="#60a5fa" fill="url(#gradLoan)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-400">Lender: <span className="text-white font-medium">{selectedBank.name}</span></div>
            <div className="flex items-center gap-3">
              <button disabled={!canTake} onClick={handleTakeLoan} className={`px-4 py-2 rounded-md text-white ${canTake ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 cursor-not-allowed'}`}>Take Loan</button>
            </div>
          </div>

          <div className="mt-3 bg-slate-800 rounded-lg p-3 border border-slate-700 text-sm text-slate-300">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400">Terms</div>
                <div className="text-white font-medium">{selectedBank.minWeeks}–{selectedBank.maxWeeks} weeks</div>
              </div>

              <div>
                <div className="text-xs text-slate-400">APR (est)</div>
                <div className="text-white font-medium">{chosenApr}%</div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Weekly payment</div>
                <div className="text-white font-medium"><CurrencyLabel value={weeklyPayment} /></div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Credit limit</div>
                <div className="text-white font-medium">${creditInfo.limit.toLocaleString()}</div>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-400">
              Typical limit range for this credit grade: <span className="text-white font-medium">{creditInfo.typicalRange}</span>
            </div>
          </div>

          <div className="mt-3 bg-slate-800 rounded-lg p-3 border border-slate-700 text-sm text-slate-300">
            <div className="text-xs text-slate-400 mb-2">Credit Rating (overview)</div>

            <div className="text-sm text-white font-medium mb-2">Current rating: {creditInfo.score} ({creditInfo.grade})</div>

            <div className="text-xs text-slate-400 space-y-2">
              <p>The credit rating (0–100) combines company capital and company age to estimate lender willingness and maximum recommended credit limit.</p>
              <p>Current bank credit limit: <span className="text-white font-medium">${creditInfo.limit.toLocaleString()}</span>.</p>
              <p>Displayed APR and weekly payment are estimates; if principal exceeds limit the Take Loan button will be disabled.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoansPanel;