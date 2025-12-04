/**
 * StaffHiring.tsx
 *
 * File-level:
 * Staff hiring page: generates a pool of available staff and renders filters + list.
 * This file intentionally focuses on presentation and pure UI changes only.
 *
 * Responsibility:
 * - Generate staff candidates (names, salaries, skills)
 * - Render filters and the candidate list
 * - Present salary values with US Dollar sign ($) only (no numeric conversion)
 *
 * Note: Only the currency symbol and related icon usage have been normalized to Dollar.
 * Layout, spacing and other UI details are intentionally preserved.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useGame } from '../contexts/GameContext';
import { Truck, Wrench, UserCog, Users, DollarSign, Star, MapPin, Check, Filter, Flag } from 'lucide-react';

/**
 * AvailableStaff
 * @description Minimal shape of generated staff entries used in the pool.
 */
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

/**
 * StaffRole
 * @description Helper union used for role filter state
 */
type StaffRole = 'all' | 'driver' | 'mechanic' | 'manager' | 'dispatcher';

/**
 * nameDatabase (excerpted)
 * @description Local name database used to create realistic names per-country.
 * For brevity the database covers commonly used country codes and sufficient names.
 */
const nameDatabase: Record<string, { male: string[]; female: string[]; last: string[] }> = {
  'de': {
    male: ['Michael', 'Thomas', 'Andreas', 'Stefan', 'Christian', 'Matthias', 'Daniel', 'Peter', 'Frank', 'Markus', 'Oliver', 'Jens', 'Alexander', 'Klaus', 'Wolfgang', 'Martin', 'Uwe', 'Holger', 'Ralf', 'Bernd'],
    female: ['Maria', 'Ursula', 'Monika', 'Petra', 'Elke', 'Sabine', 'Renate', 'Andrea', 'Karin', 'Claudia', 'Susanne', 'Gabriele', 'Anna', 'Birgit', 'Helga', 'Brigitte', 'Ingrid', 'Erika', 'Cornelia', 'Silke'],
    last: ['Muller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schroder', 'Zimmermann', 'Kruger', 'Hartmann']
  },
  'in': {
    male: ['Rahul', 'Amit', 'Ravi', 'Vijay', 'Sanjay', 'Rakesh', 'Anil', 'Sunil', 'Ashok', 'Suresh', 'Prakash', 'Vikram', 'Manish', 'Arjun', 'Karthik', 'Deepak', 'Sachin', 'Rohit', 'Ajay', 'Harish'],
    female: ['Anjali', 'Priya', 'Pooja', 'Neha', 'Sonia', 'Priti', 'Sunita', 'Kavita', 'Meena', 'Ritu', 'Divya', 'Shreya', 'Asha', 'Lakshmi', 'Swapna', 'Vidya', 'Smita', 'Nisha', 'Shalini', 'Geeta'],
    last: ['Patel', 'Singh', 'Kumar', 'Sharma', 'Reddy', 'Gupta', 'Das', 'Nair', 'Menon', 'Chowdhury', 'Iyer', 'Jain', 'Kapoor', 'Bose', 'Mehta', 'Agarwal', 'Joshi', 'Mishra', 'Srivastava', 'Ghosh']
  },
  'gb': {
    male: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Charles', 'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Edward'],
    female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Dorothy', 'Kimberly', 'Emily', 'Donna'],
    last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke']
  },
  'ae': {
    male: ['Mohammed', 'Ahmed', 'Khalid', 'Sultan', 'Rashid', 'Hamad', 'Abdullah', 'Faisal', 'Salem', 'Yousef', 'Saeed', 'Nabil', 'Majid', 'Hamad', 'Tariq', 'Kamal', 'Rashed', 'Obaid', 'Saqr', 'Saif'],
    female: ['Fatima', 'Aisha', 'Noor', 'Maryam', 'Latifa', 'Amna', 'Hessa', 'Rima', 'Shams', 'Noura', 'Dana', 'Reem', 'Maha', 'Salama', 'Nadia', 'Laila', 'Rana', 'Safa', 'Hana', 'Zainab'],
    last: ['Al Nahyan', 'Al Maktoum', 'Al Nuaimi', 'Al Qasimi', 'Al Mualla', 'Al Mazrouei', 'Al Ali', 'Al Falasi', 'Al Suwaidi', 'Al Hammadi', 'Al Shamsi', 'Al Habsi', 'Al Baloushi', 'Al Amiri', 'Al Ketbi', 'Al Rumaithi', 'Al Muhairi', 'Al Blooshi', 'Al Mazrouei', 'Al Khalid']
  },
  'vn': {
    male: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Vu', 'Do', 'Bui', 'Dang', 'Vo', 'Ho', 'Dinh', 'Lam', 'Phan', 'Luong', 'Doan', 'Truong', 'Ngo', 'Luu', 'Hong'],
    female: ['Ngoc', 'Thi', 'Linh', 'Trang', 'Huong', 'Mai', 'Hoa', 'Huyen', 'Thuy', 'Lan', 'Anh', 'Quynh', 'Kim', 'Phuong', 'Loan', 'Nga', 'Tram', 'My', 'Nhu', 'Diem'],
    last: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Pham', 'Vu', 'Vuong', 'Dang', 'Bui', 'Do', 'Ly', 'Lam', 'Hoang', 'Dao', 'Nguyen', 'Trinh', 'Truong', 'Ngo', 'Huynh']
  }
};

/**
 * payClasses & countryPayClass
 * @description Simple pay class multipliers and a small mapping used while generating salaries.
 * Note: We do NOT perform currency conversion. Values remain numeric and are displayed with '$' only.
 */
const payClasses = {
  '1a': 1.0,
  '1b': 0.9,
  '2': 0.7,
  '3': 0.5
} as const;

const countryPayClass: Record<string, keyof typeof payClasses> = {
  'de': '1a', 'fr': '1a', 'gb': '1a', 'it': '1a', 'es': '1a', 'nl': '1a', 'be': '1a',
  'at': '1b', 'pt': '1b', 'ie': '1a', 'fi': '1a', 'dk': '1a', 'se': '1b', 'no': '1a',
  'ch': '1a', 'pl': '1b', 'cz': '1b', 'hu': '1b', 'sk': '1b', 'si': '1b', 'hr': '2',
  'ro': '2', 'bg': '2', 'gr': '2', 'rs': '2', 'ba': '3', 'me': '2', 'mk': '3',
  'al': '3', 'ua': '3', 'by': '3', 'ru': '2', 'tr': '2', 'il': '2', 'sa': '3',
  'us': '1a', 'lt': '1b', 'lv': '1b', 'md': '3', 'xk': '3', 'ad': '1b', 'li': '1a',
  'sm': '1a', 'mc': '1a', 'mt': '1b', 'lu': '1a', 'af': '3', 'am': '3',
  'bh': '1b', 'bd': '3', 'bt': '3', 'bn': '1b', 'kh': '3', 'cn': '3', 'hk': '1b',
  'mo': '2', 'cy': '2', 'ge': '3', 'in': '3', 'id': '3', 'jp': '1b', 'jo': '2', 'kz': '3',
  'kw': '1b', 'kg': '3', 'la': '3', 'lb': '3', 'my': '3', 'mv': '3', 'mn': '3', 'mm': '3',
  'np': '3', 'kp': '3', 'om': '2', 'pk': '3', 'ps': '3', 'ph': '3', 'qa': '1b', 'sa': '1b',
  'sg': '1b', 'kr': '1b', 'lk': '3', 'sy': '3', 'tj': '3', 'th': '3', 'tl': '3', 'tm': '3',
  'ae': '2', 'uz': '3', 'vn': '3', 'ye': '3', 'tw': '2', 'za': '2', 'eg': '3', 'ng': '3'
};

/**
 * generateName
 * @description Produce a realistic first / last name pair for a given countryCode.
 * Gender selection is biased 90% male to match the original behaviour.
 */
const generateName = (countryCode: string): { firstName: string; lastName: string; gender: 'male' | 'female' } => {
  const countryNames = nameDatabase[countryCode] || nameDatabase['de'];
  const gender = Math.random() < 0.9 ? 'male' : 'female';
  const firstNames = gender === 'male' ? countryNames.male : countryNames.female;
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = countryNames.last[Math.floor(Math.random() * countryNames.last.length)];
  return { firstName, lastName, gender };
};

/**
 * generateStaffData
 * @description Create a pool of staff candidates using the company's country as base.
 * Salary numbers are preserved: we will display them using '$' (no conversion).
 */
const generateStaffData = (companyCountry: string): AvailableStaff[] => {
  const staff: AvailableStaff[] = [];
  const usedNames = new Set<string>();

  const baseSalaries = {
    driver: { min: 3000, max: 5000 },
    mechanic: { min: 2800, max: 4500 },
    manager: { min: 4000, max: 7000 },
    dispatcher: { min: 2500, max: 4000 }
  };

  const driverSkills = ['Long Haul', 'ADR Certified', 'Route Planning', 'Refrigerated Transport', 'Oversized Loads', 'International Routes'];
  const mechanicSkills = ['Engine Repair', 'Electrical Systems', 'Brake Systems', 'Suspension', 'Diagnostic Tools', 'Preventive Maintenance'];
  const managerSkills = ['Operations Management', 'Budget Planning', 'Team Leadership', 'Strategic Planning', 'HR Management'];
  const dispatcherSkills = ['Route Optimization', 'Customer Service', 'Real-time Tracking', 'Communication Skills', 'Problem Solving'];

  const roleDistribution = [
    { role: 'driver' as const, count: 20 },
    { role: 'mechanic' as const, count: 12 },
    { role: 'manager' as const, count: 9 },
    { role: 'dispatcher' as const, count: 14 }
  ];

  roleDistribution.forEach(({ role, count }) => {
    for (let i = 0; i < count; i++) {
      const isNative = Math.random() < 0.8;
      const allCountries = Object.keys(countryPayClass);
      const nationality = isNative ? companyCountry : allCountries[Math.floor(Math.random() * allCountries.length)];

      let name: string;
      do {
        const generated = generateName(nationality);
        name = `${generated.firstName} ${generated.lastName}`;
      } while (usedNames.has(name));
      usedNames.add(name);

      const payClass = countryPayClass[nationality] || '2';
      const experience = Math.floor(Math.random() * 40) + 60; // 60-100%
      const experienceMultiplier = experience / 100;
      const baseSalary = Math.floor(baseSalaries[role].min + (baseSalaries[role].max - baseSalaries[role].min) * experienceMultiplier);
      const salary = Math.floor(baseSalary * payClasses[payClass] * 0.8);

      const staffMember: AvailableStaff = {
        id: `${role}-${nationality}-${Date.now()}-${i}`,
        name,
        role,
        experience: Math.floor(Math.random() * 40) + 60,
        skills: (() => {
          const skills = role === 'driver' ? [...driverSkills] :
                         role === 'mechanic' ? [...mechanicSkills] :
                         role === 'manager' ? [...managerSkills] : [...dispatcherSkills];
          return skills.sort(() => 0.5 - Math.random()).slice(0, 3);
        })(),
        salary,
        location: 'Various Cities',
        hireCost: Math.floor(salary * 0.5),
        availability: ['immediate', '1week', '2weeks'][Math.floor(Math.random() * 3)] as 'immediate' | '1week' | '2weeks',
        nationality,
        isNative,
        createdAt: new Date().toISOString()
      };

      staff.push(staffMember);
    }
  });

  return staff;
};

/**
 * formatSalaryUSD
 * @description Present numeric salary with US Dollar sign ($) and locale thousands separators.
 * This is purely presentational: the numeric value is not converted.
 */
function formatSalaryUSD(value?: number | null): string {
  if (value == null || Number.isNaN(Number(value))) return '-';
  return `$${Number(value).toLocaleString()}`;
}

/**
 * StaffHiring
 * @description Page component: renders staff filters and the candidates list.
 * Important: Salary displays will use $ only (no conversion) to match the request.
 */
const StaffHiring: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { gameState } = useGame();
  const [selectedRole, setSelectedRole] = useState<StaffRole>('all');
  const [experienceFilter, setExperienceFilter] = useState<number>(0);
  const [salaryFilter, setSalaryFilter] = useState<number>(5000);
  const [availableStaff, setAvailableStaff] = useState<AvailableStaff[]>([]);

  const company = gameState?.company;
  const companyCountry = company?.hub?.country ?? 'de';

  /**
   * Load or generate staff data
   * - Persist candidate pool in localStorage keyed by company country
   * - Regenerate when data older than 48 hours
   */
  useEffect(() => {
    if (!company) return;

    const storageKey = `tm_staff_${company.hub.country}`;
    const stored = localStorage.getItem(storageKey);
    const now = new Date();

    if (stored) {
      try {
        const data = JSON.parse(stored);
        const generatedTime = new Date(data.generatedAt);
        const hoursDiff = (now.getTime() - generatedTime.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 48 && Array.isArray(data.staff)) {
          setAvailableStaff(data.staff);
          return;
        }
      } catch {
        // fallback to regenerate
      }
    }

    const newStaff = generateStaffData(company.hub.country);
    const storageData = { staff: newStaff, generatedAt: now.toISOString() };
    try { localStorage.setItem(storageKey, JSON.stringify(storageData)); } catch {}
    setAvailableStaff(newStaff);
  }, [company]);

  /**
   * Initialize role filter from URL param 'role'
   */
  useEffect(() => {
    const roleFromUrl = searchParams.get('role') as StaffRole | null;
    if (roleFromUrl && ['driver', 'mechanic', 'manager', 'dispatcher'].includes(roleFromUrl)) {
      setSelectedRole(roleFromUrl);
    }
  }, [searchParams]);

  /**
   * filteredStaff
   * @description Compute filtered candidates (role, experience, salary, exclude already hired)
   */
  const filteredStaff = availableStaff.filter(s => {
    if (selectedRole !== 'all' && s.role !== selectedRole) return false;
    if (s.experience < experienceFilter) return false;
    if (s.salary > salaryFilter) return false;
    if (company?.staff?.some((h: any) => h.id === s.id)) return false;
    return true;
  });

  /**
   * getRoleIcon
   * @description Return an icon element for a role (keeps visual as before).
   */
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'driver': return <Truck className="w-5 h-5" />;
      case 'mechanic': return <Wrench className="w-5 h-5" />;
      case 'manager': return <UserCog className="w-5 h-5" />;
      case 'dispatcher': return <Users className="w-5 h-5" />;
      default: return <Truck className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Staff Hiring</h2>

        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span>Displayed in US Dollars</span>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-slate-400">Role</label>
          <select
            className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as StaffRole)}
          >
            <option value="all">All</option>
            <option value="driver">Drivers</option>
            <option value="mechanic">Mechanics</option>
            <option value="manager">Managers</option>
            <option value="dispatcher">Dispatchers</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400">Minimum experience (%)</label>
          <input
            type="range"
            min={0}
            max={100}
            value={experienceFilter}
            onChange={(e) => setExperienceFilter(Number(e.target.value))}
            className="w-full mt-2"
          />
          <div className="text-xs text-slate-400 mt-1">{experienceFilter}%</div>
        </div>

        <div>
          <label className="text-xs text-slate-400">Max salary</label>
          <input
            type="range"
            min={1000}
            max={10000}
            step={100}
            value={salaryFilter}
            onChange={(e) => setSalaryFilter(Number(e.target.value))}
            className="w-full mt-2"
          />
          <div className="text-xs text-slate-400 mt-1">{formatSalaryUSD(salaryFilter)}</div>
        </div>

        <div>
          <label className="text-xs text-slate-400">Location</label>
          <div className="mt-2 text-sm text-white">Company country: {companyCountry.toUpperCase()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((s) => (
          <div key={s.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg text-blue-400 bg-blue-400/10">
                  {getRoleIcon(s.role)}
                </div>
                <div>
                  <div className="text-white font-medium">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.role.charAt(0).toUpperCase() + s.role.slice(1)} • {s.nationality.toUpperCase()}</div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                    <Star className="w-3 h-3 text-amber-400" />
                    <span>{s.experience}%</span>
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    <span>{s.location}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">Salary</div>
                <div className="text-white font-medium">{formatSalaryUSD(s.salary)}</div>
                <div className="text-xs text-slate-400 mt-1">Hire cost {formatSalaryUSD(s.hireCost)}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {s.skills.map((sk) => (
                  <div key={sk} className="px-2 py-0.5 rounded-full bg-slate-600 text-xs text-slate-200">{sk}</div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { /* keep layout: hiring action handled externally */ }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs"
                >
                  Hire
                </button>
                <button
                  type="button"
                  onClick={() => { /* more info placeholder */ }}
                  className="text-xs text-slate-400 underline"
                >
                  Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredStaff.length === 0 && (
        <div className="mt-8 text-center text-slate-400">No candidates match your filters.</div>
      )}
    </div>
  );
};

export default StaffHiring;
