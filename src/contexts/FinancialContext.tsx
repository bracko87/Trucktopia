/**
 * FinancialContext.tsx
 *
 * Centralized financial helpers and in-memory actions for the finances subsystem.
 *
 * Responsibilities:
 * - Expose finance calculations (monthly revenue/expenses, taxes, tolls, vehicle tax)
 * - Provide actions to add transactions, take/repay loans and manage leases
 * - Persist changes by delegating updated Company object to the GameContext.createCompany
 * - Auto-record important expenses into Transactions so company balance history is visible
 * - Run monthly tax collection on the 10th of each month (single payment per month)
 *
 * Notes:
 * - Money is displayed and calculated in USD only.
 * - Per your request we keep numbers as plain numbers (no cents integer migration).
 * - This provider tries to be conservative and avoid double-deducting capital:
 *   - If an external engine (GameContext) already deducted capital (e.g. startTraining),
 *     the provider will create a matching transaction but will NOT deduct capital again.
 *   - When the provider itself pays a scheduled obligation (monthly taxes), it will deduct capital.
 */

import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { useGame } from './GameContext';
import { Company } from '../types/game';
import { financeApply } from '../utils/financeClient';
import getUserAccessToken from '../utils/getUserAccessToken';

/**
 * FinancialTransaction
 * @description Minimal transaction shape used by the finance panels
 */
export interface FinancialTransaction {
  id: string;
  date: string; // ISO
  type: 'income' | 'expense' | 'tax' | 'loan' | 'repayment' | 'leasing';
  amount: number; // USD positive
  description?: string;
  category?: string; // optional category (Staff, Maintenance, Loans, Taxes, Leasing, Equipment, Other)
  meta?: Record<string, any>;
}

/**
 * LoanRecord
 * @description Loan representation stored on company.finances.loans
 */
export interface LoanRecord {
  id: string;
  principal: number;
  annualRate: number; // percent, e.g. 6 -> 6%
  termMonths: number;
  outstanding: number;
  startDate: string;
  status: 'active' | 'paid' | 'defaulted';
}

/**
 * LeaseRecord
 * @description Leasing entry stored on company.finances.leases
 */
export interface LeaseRecord {
  id: string;
  assetLabel: string;
  monthlyPayment: number;
  remainingMonths: number;
  startDate: string;
  status: 'active' | 'completed';
}

/**
 * FinancialsModel
 * @description Shape mounted under company.finances
 */
export interface FinancialsModel {
  transactions: FinancialTransaction[];
  loans: LoanRecord[];
  leases: LeaseRecord[];
  balanceHistory?: Array<{ t: string; balance: number }>;
}

/**
 * FinancialContextType
 * @description Public API of the FinancialContext
 */
export interface FinancialContextType {
  finances: FinancialsModel;
  addTransaction: (tx: FinancialTransaction, opts?: { syncOnly?: boolean }) => void;
  takeLoan: (loan: Omit<LoanRecord, 'outstanding' | 'status' | 'startDate' | 'id'> & { id?: string }) => void;
  repayLoan: (loanId: string, amount: number) => void;
  addLease: (lease: Omit<LeaseRecord, 'startDate' | 'id' | 'status'> & { id?: string }) => void;
  monthlyPayrollTaxes: () => number;
  monthlyCIT: () => number;
  monthlyRoadTolls: (monthlyKm?: number) => number;
  monthlyVehicleTax: () => number;
  monthlyNetProfitEstimate: () => number;
}

/**
 * Create the context
 */
const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

/**
 * Hook to consume FinancialContext
 * @returns FinancialContextType
 */
export const useFinancials = (): FinancialContextType => {
  const ctx = useContext(FinancialContext);
  if (!ctx) throw new Error('useFinancials must be used within FinancialProvider');
  return ctx;
};

interface Props {
  children: ReactNode;
}

/**
 * Utility: format date to ISO (day precision)
 */
function todayISO() {
  return new Date().toISOString();
}

/**
 * FinancialProvider
 * @description Provides finance helpers. All state is persisted into company via GameContext.createCompany.
 */
export const FinancialProvider: React.FC<Props> = ({ children }) => {
  const { gameState, createCompany } = useGame();

  // Keep last seen snapshot so we can auto-sync important events to transactions
  const lastCompanyRef = useRef<Company | null>(null);

  /**
   * getFinancesModel
   * @description Ensure company.finances exists and returns a safe model
   */
  const getFinancesModel = (): FinancialsModel => {
    const company = gameState.company as Company | null;
    if (!company) {
      return { transactions: [], loans: [], leases: [], balanceHistory: [] };
    }
    // @ts-ignore - allow finances optional
    const f = company.finances as FinancialsModel | undefined;
    if (!f) {
      return { transactions: [], loans: [], leases: [], balanceHistory: [] };
    }
    return {
      transactions: Array.isArray(f.transactions) ? f.transactions : [],
      loans: Array.isArray(f.loans) ? f.loans : [],
      leases: Array.isArray(f.leases) ? f.leases : [],
      balanceHistory: Array.isArray(f.balanceHistory) ? f.balanceHistory : []
    };
  };

  /**
   * persistTransactions
   * @description Append transactions to company.finances.transactions and optionally adjust capital.
   * If syncOnly === true we will NOT alter company.capital (used when GameContext already deducted amount).
   */
  const persistTransactions = (txs: FinancialTransaction[], opts?: { syncOnly?: boolean }) => {
    if (!gameState.company || !gameState.currentUser) return;
    try {
      const prevFinances = (gameState.company as any).finances || {};
      const prevTxs = Array.isArray(prevFinances.transactions) ? prevFinances.transactions.slice() : [];
      const merged = [...prevTxs, ...txs];

      const updatedCompany: Company = {
        ...gameState.company,
        // @ts-ignore
        finances: {
          ...prevFinances,
          transactions: merged
        }
      };

      // If we should deduct capital (provider paying), reduce capital by total tx amounts (expenses/tax/repayment negative sign logic)
      if (!opts?.syncOnly) {
        const delta = txs.reduce((acc, it) => {
          // income increases, others decrease
          if (it.type === 'income' || it.type === 'loan') return acc + it.amount;
          return acc - it.amount;
        }, 0);
        updatedCompany.capital = Math.max(0, Number((updatedCompany.capital || 0) + delta));
      }

      // Persist via createCompany (keeps other behavior intact)
      createCompany(updatedCompany);
    } catch (err) {
      // best-effort persist
      console.warn('[FinancialProvider] persistTransactions failed', err);
    }
  };

  /**
   * addTransaction
   * @description Append a single transaction. By default this will also adjust company capital.
   * If opts.syncOnly === true the transaction will be recorded but capital will NOT be changed
   * (useful when another system already applied the money change).
   */
  const addTransaction = (tx: FinancialTransaction, opts?: { syncOnly?: boolean }) => {
    persistTransactions([{ ...tx, date: tx.date || todayISO() }], { syncOnly: !!opts?.syncOnly });
  };

  /**
   * takeLoan
   * @description Create loan record and add proceeds as an income transaction.
   */
  /**
   * takeLoan
   * @description Create loan record and call server RPC to apply proceeds atomically.
   *              Falls back to local persist when server call fails.
   */
  const takeLoan = (loanPartial: Omit<LoanRecord, 'outstanding' | 'status' | 'startDate' | 'id'> & { id?: string }) => {
    const id = loanPartial.id ?? `loan-${Date.now()}`;
    const startDate = todayISO();
    const loan: LoanRecord = {
      id,
      principal: loanPartial.principal,
      annualRate: loanPartial.annualRate,
      termMonths: loanPartial.termMonths,
      outstanding: loanPartial.principal,
      startDate,
      status: 'active'
    };
    const tx: FinancialTransaction = {
      id: `tx-${Date.now()}`,
      date: startDate,
      type: 'loan',
      amount: loan.principal,
      description: `Loan received (${loan.id})`,
      category: 'Loans'
    };

    (async () => {
      try {
        // Retrieve a user access token (best-effort)
        const token = getUserAccessToken();

        // Try to apply on server (delta in cents)
        const res = await financeApply({
          companyId: (gameState.company as Company)?.id ?? '',
          deltaCents: Math.round(loan.principal * 100),
          type: 'loan',
          description: `Loan received (${loan.id})`,
          token
        });

        if (res && res.success) {
          // Server applied change. Merge server transaction (if any) and reconcile capital
          const finances = getFinancesModel();
          const mergedLoans = [...finances.loans, loan];

          // Prefer server-provided transaction row to avoid duplicate synthetic rows
          const serverTx = res.transaction ?? tx;
          const existingTxs = Array.isArray(finances.transactions) ? finances.transactions.slice() : [];
          let mergedTxs = existingTxs;

          // Detect duplicates by id when possible
          if (serverTx && serverTx.id) {
            const found = existingTxs.some((t: any) => String(t.id) === String(serverTx.id));
            if (!found) mergedTxs = [...existingTxs, serverTx];
          } else {
            // fallback: use heuristics (timestamp + amount + description) to avoid trivial duplicates
            const similar = existingTxs.some((t: any) => {
              try {
                return t.amount === serverTx.amount && t.description === serverTx.description && new Date(t.date).toISOString() === new Date(serverTx.date).toISOString();
              } catch {
                return false;
              }
            });
            if (!similar) mergedTxs = [...existingTxs, serverTx];
          }

          const updatedCompany: Company = {
            ...(gameState.company as Company),
            // @ts-ignore
            finances: {
              ...((gameState.company as any)?.finances ?? {}),
              loans: mergedLoans,
              transactions: mergedTxs
            }
          };

          // If server returned canonical new balance in cents, use it (best source)
          if (typeof res.newBalanceCents === 'number') {
            updatedCompany.capital = Number(res.newBalanceCents) / 100;
          } else {
            // Fallback: add principal to local capital
            updatedCompany.capital = Math.max(0, Number(((updatedCompany.capital || 0) + loan.principal)));
          }

          // Persist via GameContext.createCompany if available
          try {
            createCompany(updatedCompany);
          } catch {
            // fallback: best-effort local persist
            persistTransactions([tx], { syncOnly: false });
          }
          return;
        }

        // If server reports failure, fallback to local persist
        persistTransactions([tx], { syncOnly: false });
      } catch (err) {
        // On network or RPC error, fallback to local persist to keep UX working
        // eslint-disable-next-line no-console
        console.warn('[FinancialProvider.takeLoan] financeApply failed, falling back to local persist', err);
        persistTransactions([tx], { syncOnly: false });
      }
    })();
  };

  /**
   * repayLoan
   * @description Pay down loan outstanding and create repayment transaction; does not compute amortization schedule.
   */
  /**
   * repayLoan
   * @description Pay down loan outstanding and create repayment transaction;
   *              attempt to call server RPC to perform atomic repayment. Falls back to local persist.
   */
  const repayLoan = (loanId: string, amount: number) => {
    const finances = getFinancesModel();
    const loans = finances.loans.map(l => {
      if (l.id !== loanId) return l;
      const remaining = Math.max(0, Number((l.outstanding - amount)));
      return { ...l, outstanding: remaining, status: remaining === 0 ? 'paid' : l.status };
    });
    const tx: FinancialTransaction = {
      id: `tx-${Date.now()}`,
      date: todayISO(),
      type: 'repayment',
      amount,
      description: `Loan repayment (${loanId})`,
      category: 'Loans'
    };

    (async () => {
      try {
        const token = getUserAccessToken();

        const res = await financeApply({
          companyId: (gameState.company as Company)?.id ?? '',
          deltaCents: -Math.round(amount * 100),
          type: 'repayment',
          description: `Loan repayment (${loanId})`,
          token
        });

        if (res && res.success) {
          // Prefer server-provided transaction row to avoid duplicate synthetic rows
          const serverTx = res.transaction ?? tx;
          const existingTxs = Array.isArray(finances.transactions) ? finances.transactions.slice() : [];
          let mergedTxs = existingTxs;

          if (serverTx && serverTx.id) {
            const found = existingTxs.some((t: any) => String(t.id) === String(serverTx.id));
            if (!found) mergedTxs = [...existingTxs, serverTx];
          } else {
            const similar = existingTxs.some((t: any) => {
              try {
                return t.amount === serverTx.amount && t.description === serverTx.description && new Date(t.date).toISOString() === new Date(serverTx.date).toISOString();
              } catch {
                return false;
              }
            });
            if (!similar) mergedTxs = [...existingTxs, serverTx];
          }

          // Persist repayment tx locally (syncOnly so we don't double-deduct)
          persistTransactions([], { syncOnly: true }); // no-op persist; we'll persist via createCompany below

          // Update loan outstanding locally and persist company if server returned canonical balance
          const updatedCompany: Company = {
            ...(gameState.company as Company),
            // @ts-ignore
            finances: {
              ...((gameState.company as any)?.finances ?? {}),
              loans,
              transactions: mergedTxs
            }
          };
          if (typeof res.newBalanceCents === 'number') {
            updatedCompany.capital = Number(res.newBalanceCents) / 100;
          }
          try {
            createCompany(updatedCompany);
          } catch {
            // ignore
          }
          return;
        }

        // Fallback: persist and deduct capital locally
        persistTransactions([tx], { syncOnly: false });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[FinancialProvider.repayLoan] financeApply failed, falling back to local persist', err);
        persistTransactions([tx], { syncOnly: false });
      }
    })();
  };

  /**
   * addLease
   * @description Add a leasing obligation and register first transaction (optional).
   */
  const addLease = (leasePartial: Omit<LeaseRecord, 'startDate' | 'id' | 'status'> & { id?: string }) => {
    const id = leasePartial.id ?? `lease-${Date.now()}`;
    const startDate = todayISO();
    const lease: LeaseRecord = { id, assetLabel: leasePartial.assetLabel, monthlyPayment: leasePartial.monthlyPayment, remainingMonths: leasePartial.remainingMonths, startDate, status: 'active' };
    const tx: FinancialTransaction = {
      id: `tx-${Date.now()}`,
      date: startDate,
      type: 'leasing',
      amount: lease.monthlyPayment,
      description: `Lease started: ${lease.assetLabel}`,
      category: 'Leasing'
    };
    persistTransactions([tx], { syncOnly: false });
  };

  /**
   * monthlyPayrollTaxes
   * @description Compute payroll taxes = 30% of gross monthly salaries (if company staff present).
   */
  const monthlyPayrollTaxes = (): number => {
    const company = gameState.company as Company | null;
    if (!company || !Array.isArray((company as any).staff)) return 0;
    const staff = (company as any).staff as any[];
    const totalSalary = staff.reduce((s, it) => s + (typeof it.salary === 'number' ? it.salary : Number(it.salary || 0)), 0);
    return Number((totalSalary * 0.30) || 0);
  };

  /**
   * monthlyRoadTolls
   * @description Road tolls at $0.05 per km. When monthlyKm param omitted attempt to estimate
   *              by summing active job distances for current month. If none available returns 0.
   */
  const monthlyRoadTolls = (monthlyKm?: number): number => {
    if (typeof monthlyKm === 'number') return Number((monthlyKm * 0.05) || 0);
    const company = gameState.company as Company | null;
    if (!company || !Array.isArray((company as any).activeJobs)) return 0;
    const jobs = (company as any).activeJobs as any[];
    // sum distances of jobs with startTime in current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const km = jobs.reduce((acc, j) => {
      try {
        const t = new Date(j.startTime || j.start || j.createdAt || null).getTime();
        if (Number.isFinite(t) && t >= startOfMonth && t < endOfMonth) {
          return acc + (Number(j.distance || j.km || 0));
        }
      } catch { /* ignore */ }
      return acc;
    }, 0);
    return Number((km * 0.05) || 0);
  };

  /**
   * monthlyVehicleTax
   * @description Vehicle tax yearly base $1,200 per truck. Discounts:
   *  - truck age < 5 years => 50% discount
   *  - truck age < 8 years => 20% discount
   * Compute monthly prorated liability for all company trucks.
   */
  const monthlyVehicleTax = (): number => {
    const company = gameState.company as Company | null;
    if (!company || !Array.isArray(company.trucks)) return 0;
    const now = new Date();
    const yearlyTaxBase = 1200;
    const yearlyTotal = company.trucks.reduce((acc, t) => {
      try {
        const year = Number(t.year || (new Date()).getFullYear());
        const age = now.getFullYear() - year;
        let tax = yearlyTaxBase;
        if (age < 5) tax = yearlyTaxBase * 0.5;
        else if (age < 8) tax = yearlyTaxBase * 0.8;
        return acc + tax;
      } catch {
        return acc + yearlyTaxBase;
      }
    }, 0);
    // monthly prorated
    return Number((yearlyTotal / 12) || 0);
  };

  /**
   * monthlyCIT
   * @description Corporate Income Tax: 12% on monthly taxable profit.
   * Taxable profit = estimated monthly income - monthly operating expenses - payroll cost - road tolls - leasing payments
   * For income & expenses we use transactions: income = sum income tx in month; expenses = sum expense/tax/repayment in month (except loan proceeds).
   */
  const monthlyCIT = (): number => {
    const finances = getFinancesModel();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const txs = finances.transactions || [];
    const income = txs.reduce((acc, t) => {
      const d = new Date(t.date).getTime();
      if (d >= startOfMonth && d < endOfMonth && t.type === 'income') return acc + t.amount;
      return acc;
    }, 0);
    const expenses = txs.reduce((acc, t) => {
      const d = new Date(t.date).getTime();
      if (d >= startOfMonth && d < endOfMonth && (t.type === 'expense' || t.type === 'tax' || t.type === 'repayment' || t.type === 'leasing')) return acc + t.amount;
      return acc;
    }, 0);
    const payroll = monthlyPayrollTaxes();
    const tolls = monthlyRoadTolls();
    const leases = (finances.leases || []).reduce((acc, l) => acc + (l.status === 'active' ? l.monthlyPayment : 0), 0);
    const taxableProfit = Math.max(0, income - (expenses + payroll + tolls + leases));
    return Number((taxableProfit * 0.12) || 0);
  };

  /**
   * monthlyNetProfitEstimate
   * @description Simple monthly net profit estimate after taxes and obligations.
   */
  const monthlyNetProfitEstimate = (): number => {
    const finances = getFinancesModel();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    const txs = finances.transactions || [];
    const income = txs.reduce((acc, t) => {
      const d = new Date(t.date).getTime();
      if (d >= startOfMonth && d < endOfMonth && t.type === 'income') return acc + t.amount;
      return acc;
    }, 0);
    const expenses = txs.reduce((acc, t) => {
      const d = new Date(t.date).getTime();
      if (d >= startOfMonth && d < endOfMonth && (t.type !== 'loan')) return acc + t.amount;
      return acc;
    }, 0);
    const payrollTaxes = monthlyPayrollTaxes();
    const tolls = monthlyRoadTolls();
    const vehicleTax = monthlyVehicleTax();
    const cit = monthlyCIT();
    const leases = (finances.leases || []).reduce((acc, l) => acc + (l.status === 'active' ? l.monthlyPayment : 0), 0);
    return Number(income - expenses - payrollTaxes - tolls - vehicleTax - cit - leases);
  };

  /**
   * Auto-sync important events to Transactions
   *
   * - Training started: GameContext.startTraining deducts cost immediately. We detect new training entries
   *   and create a matching 'expense' transaction for transparency (syncOnly so we don't double-deduct).
   *
   * - Other capital changes that are not accompanied by a known category are recorded as a single
   *   "System expense/income" transaction (this ensures every capital change has a visible transaction).
   *
   * This effect compares the lastCompanyRef to the current snapshot.
   */
  useEffect(() => {
    try {
      const prev = lastCompanyRef.current;
      const cur = gameState.company;
      if (!cur) {
        lastCompanyRef.current = null;
        return;
      }

      // First mount: set snapshot and exit
      if (!prev) {
        lastCompanyRef.current = cur;
        return;
      }

      const createdTxs: FinancialTransaction[] = [];

      // 1) Training started detection: any staff that has training in cur and did not in prev
      const prevStaffById = new Map((prev.staff || []).map((s: any) => [String(s.id), s]));
      (cur.staff || []).forEach((s: any) => {
        try {
          const pid = prevStaffById.get(String(s.id));
          const prevTraining = pid ? pid.training : null;
          const curTraining = s.training ?? null;
          if (!prevTraining && curTraining && typeof curTraining.cost === 'number') {
            // Training cost already deducted by GameContext.startTraining; create sync-only tx for visibility
            createdTxs.push({
              id: `tx-training-${s.id}-${Date.now()}`,
              date: curTraining.startDate || todayISO(),
              type: 'expense',
              amount: Number(curTraining.cost || 0),
              description: `Training: ${s.name} - ${curTraining.skill}`,
              category: 'Staff',
              meta: { staffId: s.id, training: true }
            });
          }
        } catch {
          // ignore per-staff errors
        }
      });

      // 2) Detect capital delta not explained by the above transactions.
      // Compute numeric capital difference between prev and cur.
      const prevCap = Number(prev.capital || 0);
      const curCap = Number(cur.capital || 0);
      const capDelta = Math.round((curCap - prevCap) * 100) / 100; // can be negative

      // Sum of createdTxs amounts (expenses are positive amounts here)
      const createdSum = createdTxs.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.amount), 0);
      // If capital decreased and we did not create txs matching the absolute drop -> create a generic expense tx (syncOnly)
      if (capDelta < 0) {
        const unexplained = Math.abs(capDelta) - createdSum;
        if (unexplained > 0.5) {
          createdTxs.push({
            id: `tx-auto-expense-${Date.now()}`,
            date: todayISO(),
            type: 'expense',
            amount: Number(Math.round(unexplained)),
            description: 'Automatic expense (system sync)',
            category: 'Other',
            meta: { inferred: true }
          });
        }
      } else if (capDelta > 0) {
        // Capital increased (income or loan). If no explicit loan/income tx exists we create one visible tx.
        const existingIncome = (getFinancesModel().transactions || []).slice().reverse().find(t => t.type === 'income' || t.type === 'loan');
        // only create if no recent income in same second
        if (!existingIncome) {
          createdTxs.push({
            id: `tx-auto-income-${Date.now()}`,
            date: todayISO(),
            type: 'income',
            amount: Number(Math.round(capDelta)),
            description: 'Automatic income (system sync)',
            category: 'Other',
            meta: { inferred: true }
          });
        }
      }

      // Persist createdTxs as syncOnly (do not double-deduct). If any txs, record them.
      if (createdTxs.length > 0) {
        persistTransactions(createdTxs, { syncOnly: true });
      }

      // update snapshot
      lastCompanyRef.current = cur;
    } catch (err) {
      console.warn('[FinancialProvider] auto-sync error', err);
      lastCompanyRef.current = gameState.company ?? null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.company]);

  /**
   * Monthly tax collection (single payment on 10th of each month)
   *
   * Behavior:
   * - Runs on mount and whenever company changes
   * - If today is the 10th and taxes for the current (year-month) have NOT been paid yet,
   *   compute the tax breakdown:
   *    - Payroll Taxes
   *    - Vehicle Tax (monthly prorated)
   *    - Road Tolls
   *    - CIT (corporate income tax)
   * - Create separate tax transactions for each box (type 'tax', category = specific)
   * - Deduct the total from company.capital once (persist via createCompany)
   * - Record a local marker (localStorage tm_tax_paid_<companyId>_<YYYY-MM>) so it's only paid once per month
   */
  useEffect(() => {
    try {
      const company = gameState.company;
      if (!company || !gameState.currentUser) return;
      const now = new Date();
      const day = now.getDate();
      // Only run tax & payroll payment on the 10th of each month (single-run)
      if (day !== 10) return;

      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const key = `tm_tax_paid_${company.id}_${ym}`;
      if (localStorage.getItem(key)) {
        // already paid this month
        return;
      }

      // Compute each obligation
      const payrollTax = monthlyPayrollTaxes(); // payroll taxes (e.g. 30% payroll)
      const vehicle = monthlyVehicleTax();
      const tolls = monthlyRoadTolls();
      const cit = monthlyCIT();

      // Compute gross monthly salaries (actual payouts) - ensure realistic salary recording
      const grossSalaries = Array.isArray((company as any).staff)
        ? (company as any).staff.reduce((s: number, st: any) => s + (Number(st.salary || 0) || 0), 0)
        : 0;

      // Build separate transactions for each obligation (amounts positive)
      const txs: FinancialTransaction[] = [];

      // 1) Salaries (actual payroll payout) - recorded as an expense
      if (grossSalaries > 0) {
        txs.push({
          id: `tx-salary-${Date.now()}`,
          date: todayISO(),
          type: 'expense',
          amount: Math.round(grossSalaries),
          description: 'Staff salaries (monthly payroll)',
          category: 'Staff Salaries'
        });
      }

      // 2) Payroll taxes (separate tax entry)
      if (payrollTax > 0) {
        txs.push({
          id: `tx-tax-payroll-${Date.now()}`,
          date: todayISO(),
          type: 'tax',
          amount: Math.round(payrollTax),
          description: 'Payroll taxes (monthly)',
          category: 'Payroll Taxes'
        });
      }

      if (vehicle > 0) {
        txs.push({
          id: `tx-tax-vehicle-${Date.now()}`,
          date: todayISO(),
          type: 'tax',
          amount: Math.round(vehicle),
          description: 'Vehicle tax (monthly)',
          category: 'Vehicle Tax'
        });
      }

      if (tolls > 0) {
        txs.push({
          id: `tx-tax-tolls-${Date.now()}`,
          date: todayISO(),
          type: 'tax',
          amount: Math.round(tolls),
          description: 'Road tolls (monthly)',
          category: 'Road Tolls'
        });
      }

      if (cit > 0) {
        txs.push({
          id: `tx-tax-cit-${Date.now()}`,
          date: todayISO(),
          type: 'tax',
          amount: Math.round(cit),
          description: 'Corporate income tax (monthly estimate)',
          category: 'CIT'
        });
      }

      // If no obligations, mark as paid and exit
      const total = txs.reduce((s, t) => s + (t.type === 'income' || t.type === 'loan' ? t.amount : t.amount), 0);
      if (total <= 0) {
        localStorage.setItem(key, '1');
        return;
      }

      // Persist and deduct capital once (provider pays). This will deduct the sum of all expense/tax txs.
      persistTransactions(txs, { syncOnly: false });

      // Mark as paid for this month so it doesn't run again
      localStorage.setItem(key, '1');
    } catch (err) {
      console.warn('[FinancialProvider] monthly tax collection failed', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.company, gameState.currentUser]);

  const ctxValue: FinancialContextType = {
    finances: getFinancesModel(),
    addTransaction,
    takeLoan,
    repayLoan,
    addLease,
    monthlyPayrollTaxes,
    monthlyCIT,
    monthlyRoadTolls,
    monthlyVehicleTax,
    monthlyNetProfitEstimate
  };

  return <FinancialContext.Provider value={ctxValue}>{children}</FinancialContext.Provider>;
};

export default FinancialContext;