/**
 * TransactionsPanel.tsx
 *
 * Transactions tab extracted from the original Finances page.
 */

import React from 'react';
import { useFinancials } from '../../contexts/FinancialContext';
import { CurrencyLabel } from './Common';

/**
 * TransactionsPanel
 * @description Quick-add transactions and recent list (Transactions tab)
 */
const TransactionsPanel: React.FC = () => {
  const { finances, addTransaction } = useFinancials();
  const [desc, setDesc] = React.useState<string>('');
  const [amt, setAmt] = React.useState<number>(0);
  const [type, setType] = React.useState<'income' | 'expense'>('income');

  const handleAdd = () => {
    const tx = {
      id: `tx-${Date.now()}`,
      date: new Date().toISOString(),
      type,
      amount: Number(amt),
      description: desc
    };
    addTransaction(tx);
    setDesc('');
    setAmt(0);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Transactions</h2>
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={type} onChange={(e) => setType(e.target.value as 'income' | 'expense')} className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white">
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <input placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white md:col-span-2" />
          <input type="number" value={amt} onChange={(e) => setAmt(Number(e.target.value))} className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white" />
        </div>
        <div className="pt-3">
          <button onClick={handleAdd} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">Add Transaction</button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-white font-semibold mb-2">Recent Transactions</h3>
        {(finances.transactions || []).slice().reverse().slice(0, 20).map((tx: any) => (
          <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
            <div>
              <div className="font-medium text-white">{tx.description || tx.type}</div>
              <div className="text-xs text-slate-400">{new Date(tx.date).toLocaleString()}</div>
            </div>
            <div className={`font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-rose-400'}`}>
              {tx.type === 'income' ? '+' : '-'}
              <CurrencyLabel value={tx.amount} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionsPanel;