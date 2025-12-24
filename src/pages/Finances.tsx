/**
 * Finances.tsx
 *
 * Page wrapper that composes the split panels for the Finances page.
 *
 * Responsibilities:
 * - Mount FinancialProvider
 * - Provide tabbed navigation between Overview / Loans / Taxes / Leasing / Transactions
 * - Keep page layout consistent with the original implementation
 */

import React from 'react';
import { FinancialProvider } from '../contexts/FinancialContext';
import OverviewPanel from './finances/OverviewPanel';
import LoansPanel from './finances/LoansPanel';
import TaxesPanel from './finances/TaxesPanel';
import LeasingPanel from './finances/LeasingPanel';
import TransactionsPanel from './finances/TransactionsPanel';
import { Tabs } from './finances/Common';

/**
 * Finances page
 * @description Composes the finances page from focused sub-panels.
 */
export default function Finances() {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.info('[Finances] mounted (split modules)');
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', panel: <OverviewPanel /> },
    { id: 'loans', label: 'Loans', panel: <LoansPanel /> },
    { id: 'taxes', label: 'Taxes', panel: <TaxesPanel /> },
    { id: 'leasing', label: 'Leasing', panel: <LeasingPanel /> },
    { id: 'transactions', label: 'Transactions', panel: <TransactionsPanel /> }
  ];

  return (
    <FinancialProvider>
      <div className="container mx-auto px-4 py-6">
        <Tabs tabs={tabs} />
      </div>
    </FinancialProvider>
  );
}