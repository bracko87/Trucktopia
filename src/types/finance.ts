/**
 * finance.ts
 *
 * Definitions for the centralized financial system.
 */

export type TransactionCategory = 
  | 'JOB_REVENUE' 
  | 'VEHICLE_PURCHASE' 
  | 'VEHICLE_SALE' 
  | 'FUEL' 
  | 'MAINTENANCE' 
  | 'SALARY' 
  | 'HUB_UPGRADE' 
  | 'TRAINING' 
  | 'LOAN_REPAYMENT'
  | 'FINE'
  | 'OTHER';

export interface CompanyTransaction {
  id: string;
  company_id: string;
  amount: number;
  category: TransactionCategory;
  reference_id?: string;
  description: string;
  created_at: string;
}

/**
 * Profitability Summary
 */
export interface FinanceSummary {
  daily_income: number;
  daily_expenses: number;
  net_profit: number;
  projected_salaries: number;
}
