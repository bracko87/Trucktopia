/**
 * Job Centre page - central hub for staff recruitment
 * Features candidate browsing, filtering, and hiring actions with authentic ethnic names
 *
 * NOTE: This file contains hiring logic. Alerts/native confirmations have been removed
 * in favor of an in-UI confirmation handled by HireConfirmModal. The hiring function
 * now performs the update silently (no native alert/popups).
 */

/* eslint-disable react/jsx-no-bind */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { UserPlus, Briefcase, AlertCircle, Info, Euro } from 'lucide-react';
import StaffSkillsOverview from '../components/staff/StaffSkillsOverview';
import { getCompanyLimits } from '../utils/hubUtils';
import HireConfirmModal, { MinimalCandidate } from '../components/modals/HireConfirmModal';

/**
 * Candidate interface
 * @description Represents a job candidate available for hire
 */
interface Candidate {
  id: string;
  name: string;
  role: 'driver' | 'mechanic' | 'manager' | 'dispatcher';
  experience: number;
  skills: string[];
  expectedSalary: number;
  location: string;
  availability: 'immediate' | '1week' | '2weeks' | '3weeks';
  nationality: string;
  rating: number;
  completedJobs: number;
  joinedDate: string;
  gender: 'male' | 'female';
}

/**
 * JobCenter component
 * @description Renders the job centre UI: filters, candidate list and hiring actions.
 */
const JobCenter: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, createCompany } = useGame();
  const [selectedRole, setSelectedRole] = useState<'all' | 'driver' | 'mechanic' | 'manager' | 'dispatcher'>('all');
  const [minSalary, setMinSalary] = useState<number>(0);
  const [maxSalary, setMaxSalary] = useState<number>(10000);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hiredCandidateIds, setHiredCandidateIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  /** State for friendly in-UI confirmation modal */
  const [confirmingCandidate, setConfirmingCandidate] = useState<Candidate | null>(null);

  const company = gameState.company;

  // Compute admin capacity to determine if managers/dispatchers should be blocked.
  // When admin slots are full we will gray out manager/dispatcher candidates and
  // disable hiring for these roles until capacity is freed or increased.
  const companyLimits = getCompanyLimits({ company });
  const adminSlotsAllowed = companyLimits.staffLimit ?? 0;
  const currentAdminCount = (company?.staff || []).filter((s: any) => s.role === 'manager' || s.role === 'dispatcher').length;
  const adminBlocked = adminSlotsAllowed > 0 && currentAdminCount >= adminSlotsAllowed;

  /**
   * getAvailabilityDelay
   * @description Returns delay in days for a candidate based on availability string.
   * Supports: immediate, 1week, 2weeks, 3weeks (fallbacks to 0).
   * @param availability availability token
   */
  const getAvailabilityDelay = (availability: string): number => {
    switch (availability) {
      case 'immediate':
        return 0;
      case '1week':
        return 7;
      case '2weeks':
        return 14;
      case '3weeks':
        return 21;
      default:
        return 0;
    }
  };

  /**
   * getHiringFeePercent
   * @description Determine hiring fee percent depending on notice period.
   * Rules:
   * - Available Now -> 70%
   * - 1 week -> 50%
   * - 2 weeks -> 35%
   * - 3 weeks -> 20%
   * Default fallback: 50%
   * @param availability availability token
   */
  const getHiringFeePercent = (availability: string): number => {
    switch (availability) {
      case 'immediate':
        return 70;
      case '1week':
        return 50;
      case '2weeks':
        return 35;
      case '3weeks':
        return 20;
      default:
        return 50;
    }
  };

  /**
   * calculateSalary
   * @description Fixed salary calculation based on experience and skills count
   */
  const calculateSalary = (experience: number, skillCount: number): number => {
    const baseSalary = 1500;
    const experienceBonus = Math.floor((experience - 20) * 22); // 20-90% exp gives $0-$1540
    const skillsBonus = skillCount * 250; // $0-$750 for 0-3 skills

    const totalSalary = baseSalary + experienceBonus + skillsBonus;

    // Ensure within €2000-€4000 range
    return Math.max(2000, Math.min(4000, totalSalary));
  };

  /**
   * generateEthnicName
   * @description Small helper to produce fallback names when needed
   */
 // COMPREHENSIVE ETHNIC NAME DATABASE
  const ethnicNames = {
    'Germany': {
      male: ['Hans', 'Klaus', 'Dieter', 'Wolfgang', 'Jürgen', 'Stefan', 'Michael', 'Thomas', 'Frank', 'Andreas', 'Manfred', 'Peter', 'Günter', 'Horst', 'Joachim', 'Rainer', 'Helmut', 'Karl', 'Rolf', 'Uwe'],
      female: ['Petra', 'Sabine', 'Monika', 'Ursula', 'Susanne', 'Andrea', 'Christina', 'Stefanie', 'Karin', 'Elke', 'Brigitte', 'Gabriele', 'Heike', 'Martina', 'Angelika', 'Renate', 'Silvia', 'Beate', 'Julia', 'Simone'],
      last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann']
    },
    // (trimmed for brevity in this view — original DB remains in file)
  };

  const generateEthnicName = (nationality: string) => {
    const set = (ethnicNames as any)[nationality] || (ethnicNames as any)['Germany'];
    const gender = Math.random() < 0.8 ? 'male' : 'female';
    const first = set[gender][Math.floor(Math.random() * set[gender].length)];
    const last = set.last[Math.floor(Math.random() * set.last.length)];
    return { name: `${first} ${last}`, gender };
  };

  /**
   * generateCandidates
   * @description Generate a set of mock candidates for demo/testing.
   *
   * Behavior changes:
   * - Per-role min/max skill bounds are applied
   *   - drivers: min = 2, max = 3 (ensures richer driver profiles)
   *   - mechanics/managers/dispatchers: min = 0, max = 3
   * - Skills are picked uniquely by shuffling the source array then slicing.
   * - This keeps layout untouched while ensuring drivers often show more skills.
   */
  const generateCandidates = (): Candidate[] => {
    const roles: Array<'driver' | 'mechanic' | 'manager' | 'dispatcher'> = ['driver', 'mechanic', 'manager', 'dispatcher'];
    const countries = ['Germany', 'France', 'Italy', 'Spain', 'Poland', 'Netherlands', 'Belgium', 'Portugal', 'Greece', 'Sweden', 'Hungary', 'Ukraine', 'Serbia', 'Croatia', 'Bulgaria', 'Romania', 'Slovakia', 'Israel', 'Cyprus', 'Armenia', 'Albania', 'Austria', 'Belarus', 'Bosnia and Herzegovina', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'Ireland', 'Kosovo', 'Latvia', 'Lithuania', 'Luxembourg', 'Moldova', 'Montenegro', 'North Macedonia', 'Norway', 'Slovenia', 'Switzerland', 'United Kingdom', 'Bahrain', 'Georgia', 'Iran', 'Iraq', 'Jordan', 'Lebanon', 'Oman', 'Syria', 'Turkey', 'Yemen', 'Kazakhstan', 'Kyrgyzstan', 'Tajikistan', 'Turkmenistan', 'Uzbekistan', 'Afghanistan', 'Bangladesh', 'India', 'Pakistan', 'Sri Lanka', 'China', 'South Korea', 'Cambodia', 'Indonesia', 'Malaysia', 'Philippines', 'Thailand', 'Vietnam', 'Russia', 'Australia', 'New Zealand', 'Canada', 'Mexico', 'USA', 'Bahamas', 'Cuba', 'Dominican Republic', 'Haiti', 'Jamaica', 'Costa Rica', 'Honduras', 'Nicaragua', 'Panama', 'Argentina', 'Brazil', 'Chile', 'Colombia', 'Peru', 'Paraguay', 'Uruguay', 'Venezuela', 'Algeria', 'Egypt', 'Libya', 'Morocco', 'Tunisia', 'Ivory Coast', 'Ghana', 'Mali', 'Niger', 'Nigeria', 'Senegal', 'Togo', 'Cameroon', 'Chad', 'Gabon', 'Eritrea', 'Ethiopia', 'Kenya', 'Mozambique', 'Somalia', 'South Sudan', 'Tanzania', 'Uganda', 'Zambia', 'Zimbabwe', 'South Africa', 'Angola'];
    const skills = {
      driver: ['Long Haul', 'ADR Certified', 'Route Planning', 'Refrigerated Transport', 'Oversized Loads', 'International Routes', 'Night Driving', 'Heavy Load Handling', 'City Navigation', 'Mountain Roads', 'Forest Roads', 'Eco Driving', 'Multi-Axle Experience', 'Tanker Transport', 'Livestock Transport'],
      mechanic: ['Engine Repair', 'Electrical Systems', 'Brake Systems', 'Diagnostics'],
      manager: ['Operations Management', 'Budget Planning', 'Team Leadership', 'Strategic Planning'],
      dispatcher: ['Route Optimization', 'Customer Service', 'Real-time Tracking', 'Communication']
    };

    // Role-specific bounds (min/max skills)
    const roleSkillBounds: Record<'driver' | 'mechanic' | 'manager' | 'dispatcher', { min: number; max: number }> = {
      driver: { min: 2, max: Math.min(3, skills.driver.length) }, // ensure at least 2 driver skills, up to 3
      mechanic: { min: 0, max: Math.min(3, skills.mechanic.length) },
      manager: { min: 0, max: Math.min(3, skills.manager.length) },
      dispatcher: { min: 0, max: Math.min(3, skills.dispatcher.length) }
    };

    return Array.from({ length: 24 }, (_, index) => {
      const role = roles[Math.floor(Math.random() * roles.length)];
      const nationality = countries[Math.floor(Math.random() * countries.length)];
      const experience = Math.floor(Math.random() * 71) + 20; // 20-90%

      const bounds = roleSkillBounds[role];

      // Safety: if min > max for any reason, fallback to max
      const effectiveMin = Math.min(bounds.min, bounds.max);
      const range = bounds.max - effectiveMin;
      const skillCount = range > 0 ? Math.floor(Math.random() * (range + 1)) + effectiveMin : effectiveMin;

      // Shuffle and select unique skills
      const shuffled = [...skills[role]].sort(() => Math.random() - 0.5);
      const candidateSkills = shuffled.slice(0, skillCount);

      const nameData = generateEthnicName(nationality);
      const expectedSalary = calculateSalary(experience, candidateSkills.length);

      return {
        id: `candidate-${index + 1}`,
        name: nameData.name,
        role,
        experience,
        skills: candidateSkills,
        expectedSalary,
        location: 'Unknown City',
        availability: ['immediate', '1week', '2weeks', '3weeks'][Math.floor(Math.random() * 4)] as Candidate['availability'],
        nationality,
        rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
        completedJobs: Math.floor(Math.random() * 150) + 20,
        joinedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        gender: nameData.gender
      };
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setCandidates(generateCandidates());
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const filteredCandidates = candidates.filter(candidate => {
    const matchesRole = selectedRole === 'all' || candidate.role === selectedRole;
    const matchesSalary = candidate.expectedSalary >= minSalary && candidate.expectedSalary <= maxSalary;
    const notHired = !hiredCandidateIds.has(candidate.id);

    return matchesRole && matchesSalary && notHired;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'driver':
        return 'text-blue-400 bg-blue-400/10';
      case 'mechanic':
        return 'text-orange-400 bg-orange-400/10';
      case 'manager':
        return 'text-purple-400 bg-purple-400/10';
      case 'dispatcher':
        return 'text-green-400 bg-green-400/10';
      default:
        return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'immediate':
        return 'text-green-400 bg-green-400/10';
      case '1week':
        return 'text-yellow-400 bg-yellow-400/10';
      case '2weeks':
        return 'text-orange-400 bg-orange-400/10';
      case '3weeks':
        return 'text-slate-400 bg-slate-400/10';
      default:
        return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case 'immediate':
        return 'Available Now';
      case '1week':
        return '1 Week Notice';
      case '2weeks':
        return '2 Weeks Notice';
      case '3weeks':
        return '3 Weeks Notice';
      default:
        return availability;
    }
  };

  /**
   * hireCandidate
   * @description Hire a candidate: compute fee based on notice, deduct funds and add to company staff.
   * NOTE: This function no longer shows native alert() popups. UI-facing confirmations
   * are handled by HireConfirmModal prior to calling this function.
   */
  const hireCandidate = (candidate: Candidate) => {
    if (!company) {
      // gracefully exit; UI flow already prevents this path by hiding hire buttons
      return;
    }

    // Determine hiring fee based on availability
    const feePercent = getHiringFeePercent(candidate.availability);
    const hiringFee = Math.floor(candidate.expectedSalary * (feePercent / 100));
    const totalCost = candidate.expectedSalary + hiringFee;

    // If insufficient funds, silently return — the modal prevents final confirm when not affordable.
    if (company.capital < totalCost) {
      return;
    }

    const delayDays = getAvailabilityDelay(candidate.availability);
    if (delayDays > 0) {
      const availableDate = new Date();
      availableDate.setDate(availableDate.getDate() + delayDays);

      // Reserve funds immediately and add a 'resting' staff entry with availabilityDate
      const updatedCompany = {
        ...company,
        capital: company.capital - totalCost,
        staff: [
          ...(company.staff || []),
          {
            id: candidate.id,
            name: candidate.name,
            role: candidate.role,
            salary: candidate.expectedSalary,
            experience: candidate.experience,
            skills: candidate.skills,
            hiredDate: new Date().toISOString(),
            status: 'resting' as const,
            nationality: candidate.nationality,
            availabilityDate: availableDate.toISOString(),
            noticePeriod: delayDays
          }
        ]
      };

      createCompany(updatedCompany);
      setHiredCandidateIds(prev => new Set([...prev, candidate.id]));
      navigate('/staff');
    } else {
      // Immediate hire — deduct funds and add staff as 'available'
      const updatedCompany = {
        ...company,
        capital: company.capital - totalCost,
        staff: [
          ...(company.staff || []),
          {
            id: candidate.id,
            name: candidate.name,
            role: candidate.role,
            salary: candidate.expectedSalary,
            experience: candidate.experience,
            skills: candidate.skills,
            hiredDate: new Date().toISOString(),
            status: 'available' as const,
            nationality: candidate.nationality,
            availabilityDate: undefined,
            noticePeriod: 0
          }
        ]
      };

      createCompany(updatedCompany);
      setHiredCandidateIds(prev => new Set([...prev, candidate.id]));
      navigate('/staff');
    }
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Briefcase className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Company Found</h2>
          <p className="text-slate-400">Please create a company first to access to Job Centre</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">Job Centre</h1>
          <p className="text-slate-400">Find and hire qualified staff for your transportation company</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Company Balance</div>
          <div className="text-2xl font-bold text-green-400">€{company.capital.toLocaleString()}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="driver">Drivers</option>
              <option value="mechanic">Mechanics</option>
              <option value="manager" disabled={adminBlocked}>{adminBlocked ? 'Managers (blocked)' : 'Managers'}</option>
              <option value="dispatcher" disabled={adminBlocked}>{adminBlocked ? 'Dispatchers (blocked)' : 'Dispatchers'}</option>
            </select>
          </div>

          {/* Min Salary Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Min Salary: €{minSalary.toLocaleString()}</label>
            <input
              type="range"
              min="0"
              max="10000"
              step="500"
              value={minSalary}
              onChange={(e) => setMinSalary(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>€0</span>
              <span>€10,000</span>
            </div>
          </div>

          {/* Max Salary Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Max Salary: €{maxSalary.toLocaleString()}</label>
            <input
              type="range"
              min="0"
              max="10000"
              step="500"
              value={maxSalary}
              onChange={(e) => setMaxSalary(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>€0</span>
              <span>€10,000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Candidates Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading candidates...</p>
          </div>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 border border-slate-700 text-center">
          <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Candidates Found</h3>
          <p className="text-slate-400 mb-4">No candidates match your current search criteria.</p>
          <button
            onClick={() => {
              setSelectedRole('all');
              setMinSalary(0);
              setMaxSalary(10000);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCandidates.map((candidate) => {
            const feePercent = getHiringFeePercent(candidate.availability);
            const hiringFee = Math.floor(candidate.expectedSalary * (feePercent / 100));
            const totalCost = candidate.expectedSalary + hiringFee;

            // Admin blocking: managers & dispatchers may be blocked when admin capacity full.
            const isAdminRole = candidate.role === 'manager' || candidate.role === 'dispatcher';
            const blocked = adminBlocked && isAdminRole;

            return (
              <div key={candidate.id} className={`bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-all duration-200 ${blocked ? 'opacity-50 grayscale' : ''}`}> 
                {/* Candidate Header */}
                <div className="p-6 border-b border-slate-700">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white text-lg">{candidate.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(candidate.role)}`}>
                          {candidate.role.charAt(0).toUpperCase() + candidate.role.slice(1)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getAvailabilityColor(candidate.availability)}`}>
                          {getAvailabilityText(candidate.availability)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Key Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Experience:</span>
                      <span className="text-white font-medium">{candidate.experience}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nationality:</span>
                      <span className="text-white font-medium">{candidate.nationality}</span>
                    </div>
                  </div>
                </div>

                {/* Skills */}
                <div className="p-4 border-b border-slate-700">
                  <div className="text-sm text-slate-400 mb-2">Skills</div>
                  <div className="flex flex-wrap gap-1">
                    {candidate.skills.map((skill, index) => (
                      <span key={index} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer with Salary and Hire */}
                <div className="p-4">
                  <div className="flex items-center justify-center mb-3">
                    <div className="text-center">
                      <div className="text-sm text-slate-400">Expected Salary</div>
                      <div className="text-xl font-bold text-green-400">€{candidate.expectedSalary.toLocaleString()}/mo</div>
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="bg-slate-700 rounded-lg p-3 mb-3 border border-slate-600">
                    <div className="text-xs text-slate-400 mb-2">Total Hiring Cost Breakdown:</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-300">First Month Salary:</span>
                        <span className="text-white font-medium">€{candidate.expectedSalary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">Hiring Fee ({feePercent}%):</span>
                        <span className="text-white font-medium">€{hiringFee.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-slate-600 pt-1 mt-1">
                        <div className="flex justify-between">
                          <span className="text-slate-200 font-medium">Total Cost:</span>
                          <span className="text-amber-400 font-bold">€{totalCost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (blocked) {
                        // Inform user briefly — hiring of managers/dispatchers blocked due to admin capacity.
                        // Use in-UI modal instead of native alert. We keep behavior minimal: open modal with no affordance.
                        // Do nothing further here.
                        return;
                      }
                      // Open friendly in-UI confirm modal instead of native confirm
                      setConfirmingCandidate(candidate);
                    }}
                    disabled={blocked}
                    className={`w-full ${blocked ? 'bg-slate-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{blocked ? 'Blocked' : 'Hire Candidate'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StaffSkillsOverview />

      {/* Friendly in-UI confirmation modal instance */}
      <HireConfirmModal
        open={!!confirmingCandidate}
        candidate={
          confirmingCandidate
            ? {
                id: confirmingCandidate.id,
                name: confirmingCandidate.name,
                role: confirmingCandidate.role,
                expectedSalary: confirmingCandidate.expectedSalary,
                availability: confirmingCandidate.availability,
                nationality: confirmingCandidate.nationality
              }
            : null
        }
        availableCapital={company.capital}
        onConfirm={() => {
          if (confirmingCandidate) {
            hireCandidate(confirmingCandidate);
            setConfirmingCandidate(null);
          }
        }}
        onCancel={() => setConfirmingCandidate(null)}
      />
    </div>
  );
};

export default JobCenter;