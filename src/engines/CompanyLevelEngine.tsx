/**
 * CompanyLevelEngine.tsx
 * 
 * Background engine that calculates company rank based on 5 KPIs.
 * Updated: Increased thresholds for late-game challenge.
 */

import React, { useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
import { getTierForScore } from '../data/companyLevels';

/**
 * CompanyLevelEngine
 * @description Monitors company data and promotes levels based on weighted performance.
 */
const CompanyLevelEngine: React.FC = () => {
  const { gameState, createCompany } = useGame() as any;
  const lastLevelRef = useRef<string | null>(null);

  useEffect(() => {
    const company = gameState?.company;
    if (!company) return;

    // --- 1. KPI Calculations (New Higher Caps) ---

    // Fleet (Capped at 100 units - Trailers count as 0.5)
    const trucksCount = Array.isArray(company.trucks) ? company.trucks.length : 0;
    const trailersCount = Array.isArray(company.trailers) ? company.trailers.length : 0;
    const fleetScore = Math.min(1, (trucksCount + trailersCount * 0.5) / 100);

    // Finance (Capped at €2,500,000 total capital)
    const capital = company.capital || 0;
    const financeScore = Math.min(1, capital / 2500000);

    // Operations (Capped at 5,000 jobs)
    const jobsCount = company.stats?.completedJobs || 0;
    const opsScore = Math.min(1, jobsCount / 5000);

    // Infrastructure (Capped at 20 hubs)
    const hubsCount = Array.isArray(company.hubs) ? company.hubs.length : 1;
    const infraScore = Math.min(1, hubsCount / 20);

    // Staff (Capped at 100% avg skill)
    const staff = Array.isArray(company.staff) ? company.staff : [];
    const avgSkill = staff.length > 0 
      ? staff.reduce((acc: number, s: any) => acc + (s.experience || 0), 0) / (staff.length * 100)
      : 0;
    const staffScore = Math.min(1, avgSkill);

    // --- 2. Weighted Total (New Weights) ---
    const totalScore = 
      (fleetScore * 0.35) + // Increased fleet importance
      (financeScore * 0.25) + 
      (opsScore * 0.15) + 
      (infraScore * 0.15) + 
      (staffScore * 0.10);

    const newLevel = getTierForScore(totalScore);

    // --- 3. Update if changed ---
    if (newLevel !== company.level) {
      console.log(`[LevelEngine] Company promoted from ${company.level} to ${newLevel} (Score: ${totalScore.toFixed(3)})`);
      
      createCompany({
        ...company,
        level: newLevel,
        levelScore: totalScore 
      });
    }
  }, [gameState?.company, createCompany]);

  return null; 
};

export default CompanyLevelEngine;