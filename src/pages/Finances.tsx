/**
 * Finances page showing company financial information
 */

import React from 'react';
import { useGame } from '../contexts/GameContext';
import { DollarSign, TrendingUp, TrendingDown, Calendar, PieChart, BarChart } from 'lucide-react';

const Finances: React.FC = () => {
  const { gameState } = useGame();

  if (!gameState.company) return null;

  // Mock financial data
  const financialRecords = [
    { id: 1, date: new Date('2024-10-25'), type: 'income' as const, category: 'Contract Payment', amount: 18500, description: 'Contract #C-2847 completed' },
    { id: 2, date: new Date('2024-10-24'), type: 'expense' as const, category: 'Maintenance', amount: 1200, description: 'Truck #T-001 service' },
    { id: 3, date: new Date('2024-10-23'), type: 'expense' as const, category: 'Salaries', amount: 9800, description: 'Monthly staff payments' },
    { id: 4, date: new Date('2024-10-22'), type: 'income' as const, category: 'Contract Payment', amount: 12700, description: 'Contract #C-2845 completed' },
    { id: 5, date: new Date('2024-10-21'), type: 'expense' as const, category: 'Fuel', amount: 3200, description: 'Fuel purchase for fleet' },
  ];

  const monthlyIncome = 45200;
  const monthlyExpenses = 21500;
  const netProfit = monthlyIncome - monthlyExpenses;

  const expenseCategories = [
    { category: 'Salaries', amount: 9800, color: 'bg-blue-500' },
    { category: 'Fuel', amount: 5200, color: 'bg-orange-500' },
    { category: 'Maintenance', amount: 3200, color: 'bg-yellow-500' },
    { category: 'Insurance', amount: 1800, color: 'bg-purple-500' },
    { category: 'Other', amount: 1500, color: 'bg-slate-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Overview</h1>
          <p className="text-slate-400">Monitor your company's financial performance</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">${gameState.company.capital.toLocaleString()}</div>
          <div className="text-sm text-slate-400">Current Balance</div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <span className="text-sm font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded">
              +12.5%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">${monthlyIncome.toLocaleString()}</h3>
          <p className="text-sm text-slate-300">Monthly Income</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-red-500/10">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
            <span className="text-sm font-medium text-red-400 bg-red-400/10 px-2 py-1 rounded">
              -8.2%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">${monthlyExpenses.toLocaleString()}</h3>
          <p className="text-sm text-slate-300">Monthly Expenses</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
            <span className={`text-sm font-medium px-2 py-1 rounded ${
              netProfit >= 0 
                ? 'text-green-400 bg-green-400/10' 
                : 'text-red-400 bg-red-400/10'
            }`}>
              {netProfit >= 0 ? '+' : ''}{((netProfit / monthlyIncome) * 100).toFixed(1)}%
            </span>
          </div>
          <h3 className={`text-2xl font-bold mb-1 ${
            netProfit >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            ${netProfit.toLocaleString()}
          </h3>
          <p className="text-sm text-slate-300">Net Profit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-blue-400" />
            <span>Expense Breakdown</span>
          </h2>
          <div className="space-y-4">
            {expenseCategories.map((item, index) => {
              const percentage = (item.amount / monthlyExpenses) * 100;
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm text-slate-300">{item.category}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-white font-medium w-16 text-right">
                      ${item.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <BarChart className="w-5 h-5 text-green-400" />
            <span>Recent Transactions</span>
          </h2>
          <div className="space-y-3">
            {financialRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    record.type === 'income' ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {record.type === 'income' ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{record.category}</p>
                    <p className="text-xs text-slate-400">{record.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${
                    record.type === 'income' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {record.type === 'income' ? '+' : '-'}${record.amount.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">
                    {record.date.toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Metrics */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">Financial Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-xl font-bold text-green-400 mb-1">47.6%</div>
            <div className="text-sm text-slate-400">Profit Margin</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-400 mb-1">18.2</div>
            <div className="text-sm text-slate-400">ROI (%)</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-400 mb-1">$2.18/km</div>
            <div className="text-sm text-slate-400">Revenue per km</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-purple-400 mb-1">94.7%</div>
            <div className="text-sm text-slate-400">On-time Delivery</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Finances;