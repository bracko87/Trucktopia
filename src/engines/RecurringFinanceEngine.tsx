/**
 * RecurringFinanceEngine.tsx
 * 
 * Handles periodic payments and automated financial snapshots.
 */

import React, { useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
import { supabase } from '../utils/supabaseClient';
import { recordTransaction, updateCreditScore } from '../utils/financeEngine';
import { useGameTime } from '../utils/gameTime';

const RecurringFinanceEngine: React.FC = () => {
  const { gameState } = useGame();
  const { gameTime } = useGameTime();
  const lastLoanRun = useRef<number | null>(null);
  const lastPayrollMonth = useRef<number | null>(null);
  const lastSnapshotDay = useRef<number | null>(null);

  useEffect(() => {
    if (!gameState.company?.id || !gameTime) return;

    const runEngine = async () => {
      const companyId = gameState.company!.id;
      const currentDay = Math.floor(gameTime.totalDays);
      const currentMonth = gameTime.month;

      // 1. Daily Credit Snapshot (for charts)
      if (lastSnapshotDay.current !== currentDay) {
        await supabase.from('company_credit_history').insert({
          company_id: companyId,
          score: gameState.company?.creditScore ?? 550
        });
        lastSnapshotDay.current = currentDay;
      }

      // 2. Weekly Loan Repayments
      if (lastLoanRun.current === null || currentDay >= lastLoanRun.current + 7) {
        const { data: loans } = await supabase.from('company_loans').select('*').eq('company_id', companyId).eq('status', 'ACTIVE');
        if (loans) {
          for (const loan of loans) {
            const amount = Math.min(loan.weekly_payment, loan.remaining_balance);
            if (gameState.company!.capital >= amount) {
              await recordTransaction(companyId, -amount, 'LOAN_REPAYMENT', `Weekly payment: #${loan.id.slice(-4)}`);
              const newBalance = loan.remaining_balance - amount;
              await supabase.from('company_loans').update({ remaining_balance: newBalance, status: newBalance <= 0 ? 'PAID' : 'ACTIVE' }).eq('id', loan.id);
              await updateCreditScore(companyId, newBalance <= 0 ? 50 : 2);
            } else {
              await updateCreditScore(companyId, -15); // Default penalty
            }
          }
        }
        lastLoanRun.current = currentDay;
      }

      // 3. Monthly Payroll (on the 5th)
      if (gameTime.day === 5 && gameTime.hour >= 10 && lastPayrollMonth.current !== currentMonth) {
        const staff = gameState.company?.staff || [];
        const totalPayroll = staff.reduce((sum, s) => sum + (s.salary || 0), 0);
        if (totalPayroll > 0) {
          const res = await recordTransaction(companyId, -totalPayroll, 'PAYROLL', `Monthly Payroll (${staff.length} staff)`);
          await updateCreditScore(companyId, res.success ? 10 : -30);
        }
        lastPayrollMonth.current = currentMonth;
      }
    };

    runEngine();
  }, [gameTime?.totalDays, gameState.company?.id]);

  return null;
};

export default RecurringFinanceEngine;
