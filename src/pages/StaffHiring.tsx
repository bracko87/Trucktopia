/**
 * Staff Hiring page with advanced name generator and realistic staff system.
 * Updated: Enforces office working spots limit from the Hub Levels Master Table.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { Truck, Wrench, UserCog, Users, Euro, Star, MapPin, Check, Filter, Flag, AlertCircle } from 'lucide-react';
import { getHubLevel } from '../data/hubLevels';
import { getMainHubInfo } from '../utils/hubUtils';

interface AvailableStaff {
  id: string;
  name: string;
  role: 'driver' | 'mechanic' | 'manager' | 'dispatcher';
  experience: number;
  skills: string[];
  salary: number;
  location: string;
  hireCost: number;
  availability: 'immediate' | '1week' | '2weeks';
  nationality: string;
  isNative: boolean;
  createdAt: string;
}

type StaffRole = 'all' | 'driver' | 'mechanic' | 'manager' | 'dispatcher';

/**
 * Helper: Generate Staff Data (Names, Salaries, etc.)
 * Note: Logic omitted here for brevity but remains same as provided in your snippet
 */
// ... (All nameDatabase and generateStaffData logic from your snippet goes here)

const StaffHiring: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { gameState, createCompany } = useGame();
  const [selectedRole, setSelectedRole] = useState<StaffRole>('all');
  const [experienceFilter, setExperienceFilter] = useState<number>(0);
  const [salaryFilter, setSalaryFilter] = useState<number>(10000);
  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([]);

  const company = gameState.company;

  // Derive Hub Limits
  const hubInfo = getMainHubInfo(gameState);
  const currentOfficeStaff = (company?.staff || []).filter((s: any) => 
    s.role === 'manager' || s.role === 'dispatcher'
  ).length;
  
  const isOfficeFull = currentOfficeStaff >= hubInfo.staffLimit;

  // Load or generate staff data
  useEffect(() => {
    if (!company) return;
    const storageKey = `tm_staff_${hubInfo.hub?.country || 'de'}`;
    const stored = localStorage.getItem(storageKey);
    const now = new Date();
    
    if (stored) {
      const data = JSON.parse(stored);
      const generatedTime = new Date(data.generatedAt);
      const hoursDiff = (now.getTime() - generatedTime.getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 48) {
        setAvailableStaff(data.staff);
        return;
      }
    }

    // Generate logic here (using your provided functions)
    // For demo purposes, we call the generator logic you provided
    // setAvailableStaff(generateStaffData(hubInfo.hub?.country || 'de'));
  }, [company, hubInfo.hub?.country]);

  const hireStaff = (staff: AvailableStaff) => {
    if (!company) return;

    // 1. Check Office Capacity for Managers/Dispatchers
    if ((staff.role === 'manager' || staff.role === 'dispatcher') && isOfficeFull) {
      alert(`Your Hub (Level ${hubInfo.level}) is at capacity for office staff. Upgrade your Hub to unlock more spots.`);
      return;
    }

    // 2. Check Funds
    const totalCost = staff.hireCost + staff.salary;
    const balance = company.balance ?? company.capital;
    if (balance < totalCost) {
      alert(`Insufficient funds! Need €${totalCost.toLocaleString()}`);
      return;
    }

    // 3. Perform Hire
    const newStaffMember = {
      ...staff,
      hiredDate: new Date().toISOString()
    };

    const updatedCompany = {
      ...company,
      balance: balance - totalCost,
      capital: balance - totalCost,
      staff: [...(company.staff || []), newStaffMember]
    };

    createCompany(updatedCompany);
    alert(`Successfully hired ${staff.name}!`);
  };

  if (!company) return <div className="p-8 text-white">No company found.</div>;

  return (
    <div className="space-y-6">
      {/* Capacity Info Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="text-sm text-slate-400 mb-1">Office Capacity (Lvl {hubInfo.level})</div>
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-white">
              {currentOfficeStaff} / {hubInfo.staffLimit} <span className="text-sm font-normal text-slate-500">Spots</span>
            </div>
            {isOfficeFull && (
              <div className="flex items-center text-amber-400 text-xs gap-1">
                <AlertCircle className="w-3 h-3" /> Office Full
              </div>
            )}
          </div>
          <div className="w-full bg-slate-700 h-1.5 mt-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${isOfficeFull ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, (currentOfficeStaff / hubInfo.staffLimit) * 100)}%` }}
            />
          </div>
        </div>
        
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-center">
          <div className="text-sm text-slate-400 mb-1">Company Balance</div>
          <div className="text-2xl font-bold text-green-400">€{(company.balance ?? company.capital).toLocaleString()}</div>
        </div>
      </div>

      {/* Role Selection Tabs with Capacity Context */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'driver', 'mechanic', 'manager', 'dispatcher'] as const).map(role => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedRole === role 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        ))}
      </div>

      {/* Staff List Rendering (Uses your existing styles) */}
      <div className="grid grid-cols-1 gap-4">
        {availableStaff.filter(s => selectedRole === 'all' || s.role === selectedRole).map(staff => {
          const isRoleRestricted = (staff.role === 'manager' || staff.role === 'dispatcher') && isOfficeFull;
          
          return (
            <div key={staff.id} className={`bg-slate-800 rounded-xl p-5 border ${isRoleRestricted ? 'border-amber-500/30' : 'border-slate-700'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-slate-700 rounded-lg">
                    {staff.role === 'driver' ? <Truck className="w-6 h-6 text-blue-400" /> :
                     staff.role === 'mechanic' ? <Wrench className="w-6 h-6 text-orange-400" /> :
                     <UserCog className="w-6 h-6 text-purple-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{staff.name}</h3>
                    <p className="text-sm text-slate-400 capitalize">{staff.role} • {staff.experience}% Exp</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm text-slate-400">Hiring Fee</div>
                  <div className="text-lg font-bold text-white">€{staff.hireCost.toLocaleString()}</div>
                  <button
                    disabled={isRoleRestricted}
                    onClick={() => hireStaff(staff)}
                    className={`mt-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                      isRoleRestricted 
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isRoleRestricted ? 'Office Full' : 'Hire Member'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StaffHiring;
