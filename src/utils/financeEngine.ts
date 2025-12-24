/**
 * financeEngine.ts
 * 
 * Central logic for the financial system. 
 * All money movements must go through recordTransaction.
 */

import { supabase } from './supabaseClient';
import { TransactionCategory } from '../types/finance';

/**
 * recordTransaction
 * @description The single source of truth for moving money.
 */
export const recordTransaction = async (
  companyId: string,
  amount: number,
  category: TransactionCategory,
  description: string,
  refId?: string
) => {
  try {
    // 1. Log to Ledger
    await supabase.from('company_transactions').insert({
      company_id: companyId,
      amount,
      category,
      description,
      reference_id: refId
    });

    // 2. Update cached capital in the company record
    // In a real app, this would be a Supabase RPC or Atomic Update.
    const { data: company } = await supabase.from('companies').select('capital').eq('id', companyId).single();
    const newCapital = (company?.capital || 0) + amount;

    await supabase.from('companies').update({ capital: newCapital }).eq('id', companyId);

    return { success: true, newCapital };
  } catch (err) {
    console.error('Finance Engine Error:', err);
    return { success: false, error: err };
  }
};

/**
 * formatCurrency
 * @description Formats to USD ($)
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};
