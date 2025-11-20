/**
 * src/components/dev/DemoCompanyCreator.tsx
 *
 * Small developer helper UI to quickly create a demo company for the active user.
 * This file provides a single button that builds a sensible demo Company object and
 * calls useGame().createCompany to persist it into the current user's game state.
 *
 * The component is intentionally tiny and single-responsibility so it can be removed
 * or turned into an admin-only feature later.
 */

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { CheckCircle, Building, Truck } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import type { Company } from '../../types/game';

interface DemoCompanyCreatorProps {
  /**
   * Optional override for the demo company name (useful for testing).
   */
  name?: string;
}

/**
 * DemoCompanyCreator
 * @description Button to create a prefilled demo company for the current user.
 */
const DemoCompanyCreator: React.FC<DemoCompanyCreatorProps> = ({ name = 'Demo Logistics' }) => {
  const { createCompany, gameState } = useGame();
  const [isCreating, setIsCreating] = useState(false);

  /**
   * buildDemoCompany
   * @description Construct a demo Company object that matches the app's expected shape.
   */
  const buildDemoCompany = (): Company => {
    const hub = {
      id: 'frankfurt',
      name: 'Frankfurt',
      country: 'Germany',
      region: 'euro-asia',
      capacity: 10,
      level: 1,
      cost: 2000
    };

    const now = new Date();

    const demo: Company = {
      id: `demo-company-${Date.now()}`,
      name,
      level: 'startup',
      capital: 8000, // starting capital after hub cost
      reputation: 0,
      employees: 3,
      founded: now,
      hub,
      trucks: [],
      trailers: [],
      contracts: [],
      activeJobs: [],
      staff: [],
      logo: null
    };

    return demo;
  };

  /**
   * handleCreate
   * @description Create the demo company via GameContext and provide basic UI feedback.
   */
  const handleCreate = async () => {
    if (!gameState.currentUser) {
      alert('Please login first');
      return;
    }
    setIsCreating(true);
    try {
      const company = buildDemoCompany();
      // createCompany is synchronous in the current GameContext implementation
      createCompany(company);
      // small delay for UX
      setTimeout(() => {
        setIsCreating(false);
      }, 700);
    } catch (err) {
      console.error('DemoCompanyCreator.create error', err);
      alert('Failed to create demo company');
      setIsCreating(false);
    }
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow">
          <Truck className="w-6 h-6 text-white" />
        </div>
        <h3 className="mt-3 text-lg font-semibold text-white">Quick Start</h3>
        <p className="text-sm text-slate-400">Create a demo company to explore the dashboard and features immediately.</p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleCreate}
          disabled={isCreating}
          className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white font-semibold"
        >
          {isCreating ? (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.25" strokeWidth="4" />
                <path d="M22 12a10 10 0 00-10-10" stroke="white" strokeWidth="4" strokeLinecap="round" />
              </svg>
              Creating...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Create Demo Company
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DemoCompanyCreator;