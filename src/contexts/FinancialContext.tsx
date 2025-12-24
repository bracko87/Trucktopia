/**
 * FinancialContext.tsx
 *
 * Centralized financial helpers and in-memory actions for the finances subsystem.
 *
 * Responsibilities:
 * - Expose finance calculations (monthly revenue/expenses, taxes, tolls, vehicle tax)
 * - Provide actions to add transactions, take/repay loans and manage leases
 * - Persist changes by delegating updated Company object to the GameContext.createCompany
 *
 * Notes:
 * - Money is displayed and calculated in USD only.
 * - Per your request we keep numbers as plain numbers (no cents integer migration).
 * - This module is isolated and does not modify hubs, company creation logic or unrelated systems.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useGame } from './GameContext';
import { Company } from '../types/game';

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
  addTransaction: (tx: FinancialTransaction) => void;
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
   * persistFinances
   * @description Persist updated finances by calling createCompany with updated company object.
   */
  const persistFinances = (finances: FinancialsModel) => {
    if (!gameState.currentUser || !gameState.company) return;
    const updated: Company = {
      ...gameState.company,
      // @ts-ignore - attach finances on company
      finances
    };
    // Reuse createCompany to persist changes (non-invasive to other systems)
    createCompany(updated);
  };

  /**
   * addTransaction
   * @description Append a transaction and update company capital accordingly.
   */
  const addTransaction = (tx: FinancialTransaction) => {
    const finances = getFinancesModel();
    const next = { ...finances, transactions: [...finances.transactions, tx] };
    // update company capital: income increases, expense/tax decreases
    if (gameState.company) {
      const delta = tx.type === 'income' ? tx.amount : -tx.amount;
      const updatedCompany: Company = { ...gameState.company, capital: Number((gameState.company.capital || 0) + delta) };
      // attach finances then persist with createCompany to keep behavior consistent
      // @ts-ignore
      updatedCompany.finances = next;
      createCompany(updatedCompany);
    } else {
      persistFinances(next);
    }
  };

  /**
   * takeLoan
   * @description Create loan record and add proceeds as an income transaction.
   */
  const takeLoan = (loanPartial: Omit<LoanRecord, 'outstanding' | 'status' | 'startDate' | 'id'> & { id?: string }) => {
    const finances = getFinancesModel();
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
      description: `Loan received (${loan.id})`
    };
    const next: FinancialsModel = { ...finances, loans: [...finances.loans, loan], transactions: [...finances.transactions, tx] };
    persistFinances(next);
    // Also update company capital immediately via createCompany (persistFinances uses createCompany)
    if (gameState.company) {
      const updatedCompany: Company = { ...gameState.company, capital: Number((gameState.company.capital || 0) + loan.principal) };
      // @ts-ignore
      updatedCompany.finances = next;
      createCompany(updatedCompany);
    }
  };

  /**
   * repayLoan
   * @description Pay down loan outstanding and create repayment transaction; does not compute amortization schedule.
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
      description: `Loan repayment (${loanId})`
    };
    const next: FinancialsModel = { ...finances, loans, transactions: [...finances.transactions, tx] };
    // Deduct from capital
    if (gameState.company) {
      const updatedCompany: Company = { ...gameState.company, capital: Number((gameState.company.capital || 0) - amount) };
      // @ts-ignore
      updatedCompany.finances = next;
      createCompany(updatedCompany);
    } else {
      persistFinances(next);
    }
  };

  /**
   * addLease
   * @description Add a leasing obligation and register first transaction (optional).
   */
  const addLease = (leasePartial: Omit<LeaseRecord, 'startDate' | 'id' | 'status'> & { id?: string }) => {
    const finances = getFinancesModel();
    const id = leasePartial.id ?? `lease-${Date.now()}`;
    const startDate = todayISO();
    const lease: LeaseRecord = { id, assetLabel: leasePartial.assetLabel, monthlyPayment: leasePartial.monthlyPayment, remainingMonths: leasePartial.remainingMonths, startDate, status: 'active' };
    const next: FinancialsModel = { ...finances, leases: [...finances.leases, lease] };
    persistFinances(next);
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
    const payroll = monthlyPayrollTaxes(); // payroll taxes, but payroll itself already part of expenses if recorded; include payroll taxes as deductible expense here
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