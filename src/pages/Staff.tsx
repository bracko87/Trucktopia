/**
 * Staff.tsx
 *
 * Staff Management page
 * - Lists Drivers, Mechanics, Dispatchers and Administration positions
 * - Provides Quick Navigation that includes Hire Staff and Company Benefits
 *
 * Modifications:
 * - Company Benefits flow uses a confirmation modal (CompanyBenefitsModal) and does NOT use
 *   any browser-native confirm/alert dialogs in the benefit confirmation flow.
 * - Staff Bonus enforces a 3-month (90 days) cooldown and the timestamp is persisted to company.benefits.staffBonusLast.
 * - Staff Family Day enforces a 6-month (180 days) cooldown and is persisted to company.benefits.familyDayLast.
 * - Benefit totals and bonuses are shown only in the modal and Confirm is the final step.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame } from '../contexts/GameContext';
import {
  Crown,
  Briefcase,
  TrendingUp,
  Users2,
  Settings,
  Truck as TruckIcon,
  Wrench,
  UserCog,
  Users,
  Star,
  Euro,
  UserMinus,
  UserPlus,
  MessageSquare,
} from 'lucide-react';
import DriverCompactCard, { CompactStaff } from '../components/staff/DriverCompactCard';
import CompanyBenefitsModal from '../components/staff/CompanyBenefitsModal';

/**
 * StaffMember
 * @description Interface describing a staff entry in company state
 */
interface StaffMember {
  id: string;
  name: string;
  role: 'driver' | 'mechanic' | 'manager' | 'dispatcher';
  salary: number;
  experience: number;
  hiredDate: string;
  status: 'available' | 'resting' | 'on-job';
  isOwner?: boolean;
  availabilityDate?: string;
  noticePeriod?: number;
  skills?: string[];
  nationality?: string;
  happiness?: number;
}

/**
 * AdministrationPosition
 * @description For showing admin positions and assignments
 */
interface AdministrationPosition {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  assignedStaff?: StaffMember | undefined;
  requiredRole?: string[];
}

/**
 * StaffManagement
 * @description Main component for staff management and admin assignment
 */
const StaffManagement: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, createCompany } = useGame();
  const [activeTab, setActiveTab] = useState<'drivers' | 'mechanics' | 'dispatchers' | 'administration'>('drivers');

  /**
   * Local UI state for Company Benefits
   */
  const [selectedBenefitSelect, setSelectedBenefitSelect] = useState<string>('');
  const [benefitModalOpen, setBenefitModalOpen] = useState<boolean>(false);
  const [pendingBenefit, setPendingBenefit] = useState<'staff_bonus' | 'family_day' | ''>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const company = gameState.company;

  /**
   * administrationPositions
   * @description Admin positions with requirement: only 'manager' allowed for assignable positions.
   */
  const [administrationPositions, setAdministrationPositions] = useState<AdministrationPosition[]>([
    {
      id: 'ceo',
      title: 'CEO',
      icon: <Crown className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-amber-500 to-yellow-600 text-white',
      description: 'Chief Executive Officer',
      assignedStaff: undefined,
      requiredRole: [], // CEO handled as owner
    },
    {
      id: 'coo',
      title: 'COO',
      icon: <Briefcase className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white',
      description: 'Chief Operating Officer',
      requiredRole: ['manager'],
    },
    {
      id: 'cfo',
      title: 'CFO',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-green-500 to-green-600 text-white',
      description: 'Chief Financial Officer',
      requiredRole: ['manager'],
    },
    {
      id: 'hr_director',
      title: 'HR Director',
      icon: <Users2 className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white',
      description: 'Human Resources Director',
      requiredRole: ['manager'],
    },
    {
      id: 'technical_director',
      title: 'Technical Director',
      icon: <Settings className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white',
      description: 'Head of Technical Operations',
      requiredRole: ['manager'],
    },
    {
      id: 'operations_director',
      title: 'Operations Director',
      icon: <TruckIcon className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white',
      description: 'Director of Operations',
      requiredRole: ['manager'],
    },
    {
      id: 'administration_manager',
      title: 'Admin Manager',
      icon: <UserCog className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-pink-500 to-pink-600 text-white',
      description: 'Administration Manager',
      requiredRole: ['manager'],
    },
    {
      id: 'fleet_manager',
      title: 'Fleet Manager',
      icon: <TruckIcon className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white',
      description: 'Fleet and Vehicle Manager',
      requiredRole: ['manager'],
    },
    {
      id: 'staff_manager',
      title: 'Staff Manager',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-teal-500 to-teal-600 text-white',
      description: 'Staff and Personnel Manager',
      requiredRole: ['manager'],
    },
    {
      id: 'marketing_manager',
      title: 'Marketing Manager',
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'bg-gradient-to-br from-rose-500 to-rose-600 text-white',
      description: 'Marketing and PR Manager',
      requiredRole: ['manager'],
    },
  ]);

  /**
   * resolveSavedAssignments
   * @description Validate and apply saved admin assignments from localStorage.
   *              Reject assignments where the staff is missing or role mismatch (e.g., dispatcher).
   * @param companyEmail company email (storage key)
   */
  const resolveSavedAssignments = (companyEmail: string | undefined) => {
    if (!companyEmail) return;
    try {
      const raw = localStorage.getItem(`tm_admin_positions_${companyEmail}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as any[];
      if (!Array.isArray(parsed)) return;

      setAdministrationPositions(prev =>
        prev.map(pos => {
          const saved = parsed.find(p => p.id === pos.id);
          if (!saved || !saved.assignedStaff) return pos;

          // Prefer resolution by id
          const staffId = saved.assignedStaff.id;
          const match = company?.staff?.find(s => s.id === staffId);

          // fallback to name match (case-insensitive)
          const fallback = company?.staff?.find(s => s.name.toLowerCase() === String(saved.assignedStaff.name || '').toLowerCase());

          const resolved = match || fallback || undefined;
          if (!resolved) {
            console.warn(`[Staff] Saved assignment for position ${pos.id} could not be resolved (staff missing).`);
            return pos;
          }

          // Validate role
          if (pos.requiredRole && pos.requiredRole.length > 0 && !pos.requiredRole.includes(resolved.role)) {
            console.warn(`[Staff] Saved assignment rejected for position ${pos.id}: ${resolved.name} has role \"${resolved.role}\" which is not allowed for ${pos.title}.`);
            return pos;
          }

          return { ...pos, assignedStaff: resolved };
        })
      );
    } catch (e) {
      console.warn('[Staff] Failed to parse saved admin positions', e);
    }
  };

  /**
   * saveAdministrationPositions
   * @description Persist minimal assignment data to localStorage (id + name + role).
   * @param email company email storage key
   * @param positions positions to save
   */
  const saveAdministrationPositions = (email: string | undefined, positions: AdministrationPosition[]) => {
    if (!email) return;
    try {
      const clean = positions.map(p => ({
        id: p.id,
        title: p.title,
        requiredRole: p.requiredRole,
        assignedStaff: p.assignedStaff
          ? { id: p.assignedStaff.id, name: p.assignedStaff.name, role: p.assignedStaff.role }
          : undefined,
      }));
      localStorage.setItem(`tm_admin_positions_${email}`, JSON.stringify(clean));
    } catch {
      // ignore storage errors
    }
  };

  /**
   * useEffect: initialize CEO and load saved assignments
   */
  useEffect(() => {
    if (!company) return;

    // Assign CEO to owner
    setAdministrationPositions(prev =>
      prev.map(p =>
        p.id === 'ceo'
          ? {
              ...p,
              assignedStaff: {
                id: company.email,
                name: company.email.split('@')[0],
                role: 'manager',
                salary: 0,
                experience: 100,
                hiredDate: company.founded instanceof Date ? company.founded.toISOString() : new Date().toISOString(),
                status: 'available',
                isOwner: true,
              } as StaffMember,
            }
          : p
      )
    );

    resolveSavedAssignments(company.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.email, company?.staff]);

  /**
   * workAsDriverMyself
   * @description Owner becomes a driver (free)
   */
  const workAsDriverMyself = () => {
    if (!company) {
      setNotification({ type: 'error', message: 'No company found. Please create a company first.' });
      return;
    }

    if (company.staff?.some(s => s.isOwner)) {
      setNotification({ type: 'error', message: 'You are already working as a driver in your company!' });
      return;
    }

    const ownerDriver: StaffMember = {
      id: `owner-driver-${company.email}`,
      name: company.email.split('@')[0],
      role: 'driver',
      salary: 0,
      experience: 15,
      hiredDate: new Date().toISOString(),
      status: 'available',
      isOwner: true,
    };

    const updatedCompany = { ...company, staff: [...(company.staff || []), ownerDriver] };
    createCompany(updatedCompany);
    setNotification({ type: 'success', message: 'You are now working as a driver in your company for FREE!' });
  };

  /**
   * removeStaff
   * @description Remove a staff member and clean assignments referencing them
   * @param staffId id to remove
   */
  const removeStaff = (staffId: string) => {
    if (!company) return;
    const staffToRemove = company.staff?.find(s => s.id === staffId);
    if (!staffToRemove) return;

    // Use in-app confirmation modal style: simple browser confirm exists currently in other flows.
    // Note: Benefit confirmation flow uses the dedicated modal — no native confirm there.
    if (staffToRemove.isOwner) {
      if (!confirm('Are you sure you want to remove yourself from driver position?')) return;
    } else {
      if (!confirm(`Are you sure you want to remove ${staffToRemove.name} from your staff?`)) return;
    }

    const updatedCompany = { ...company, staff: (company.staff || []).filter(s => s.id !== staffId) };
    createCompany(updatedCompany);

    // Unassign from any admin positions
    setAdministrationPositions(prev => {
      const updated = prev.map(p => (p.assignedStaff?.id === staffId ? { ...p, assignedStaff: undefined } : p));
      saveAdministrationPositions(company.email, updated);
      return updated;
    });

    setNotification({ type: 'success', message: `${staffToRemove.isOwner ? 'You have been removed' : staffToRemove.name + ' has been removed'} from the staff.` });
  };

  /**
   * isStaffAssignedToAnyPosition
   * @description Return true if staff id is assigned to any admin position
   * @param staffId staff id
   */
  const isStaffAssignedToAnyPosition = (staffId: string) => {
    return administrationPositions.some(p => p.assignedStaff?.id === staffId);
  };

  /**
   * handleAssignFromSelect
   * @description Assign a staff member to a position after validating role/availability/assignment
   * @param positionId id of position
   * @param staffId id of selected staff
   */
  const handleAssignFromSelect = (positionId: string, staffId: string) => {
    if (!company) return;
    const position = administrationPositions.find(p => p.id === positionId);
    if (!position) return;

    const staff = (company.staff || []).find(s => s.id === staffId);
    if (!staff) {
      setNotification({ type: 'error', message: 'Selected staff is no longer in your company.' });
      return;
    }

    // Validate role - requiredRole for all assignable positions is ['manager']
    if (position.requiredRole && position.requiredRole.length > 0 && !position.requiredRole.includes(staff.role)) {
      setNotification({ type: 'error', message: `${staff.name} is a ${staff.role} and cannot be assigned to ${position.title}.` });
      return;
    }

    // Validate availability: allow owner or status === 'available'
    if (!staff.isOwner && staff.status !== 'available') {
      setNotification({ type: 'error', message: `${staff.name} is not available right now and cannot be assigned.` });
      return;
    }

    // Validate not assigned already
    const already = administrationPositions.find(p => p.assignedStaff?.id === staff.id);
    if (already) {
      setNotification({ type: 'error', message: `${staff.name} is already assigned to ${already.title}. Unassign first.` });
      return;
    }

    const updated = administrationPositions.map(p => (p.id === positionId ? { ...p, assignedStaff: staff } : p));
    setAdministrationPositions(updated);
    saveAdministrationPositions(company.email, updated);
    setNotification({ type: 'success', message: `${staff.name} has been assigned as ${position.title}!` });
  };

  /**
   * unassignPosition
   * @description Remove assignment from position id and persist
   * @param positionId id
   */
  const unassignPosition = (positionId: string) => {
    if (!company) return;
    const updated = administrationPositions.map(p => (p.id === positionId ? { ...p, assignedStaff: undefined } : p));
    setAdministrationPositions(updated);
    saveAdministrationPositions(company.email, updated);
  };

  /**
   * getBenefitDetails
   * @description Returns benefit metadata for modal rendering and validation
   */
  const getBenefitDetails = (key: 'staff_bonus' | 'family_day' | '') => {
    if (key === 'staff_bonus') {
      const costPerEmployee = 500; // USD
      const happinessGain = 15;
      const currencySymbol = '$';
      const cooldownDays = 90; // 3 months
      return { costPerEmployee, happinessGain, currencySymbol, cooldownDays };
    }
    if (key === 'family_day') {
      const costPerEmployee = 250; // EUR
      const happinessGain = 8;
      const currencySymbol = '€';
      const cooldownDays = 180; // 6 months (new requirement)
      return { costPerEmployee, happinessGain, currencySymbol, cooldownDays };
    }
    return null;
  };

  /**
   * computeDisabledReason
   * @description Compute if benefit is currently blocked (insufficient funds / cooldown / no employees)
   *              Returns null when allowed, otherwise human readable reason string.
   */
  const computeDisabledReason = (key: 'staff_bonus' | 'family_day' | '', employees: number) => {
    if (!company) return 'No company found.';
    if (!key) return 'No benefit selected.';
    if (employees === 0) return 'You have no employees to apply this benefit to.';

    const details = getBenefitDetails(key);
    if (!details) return 'Unknown benefit.';

    const totalCost = details.costPerEmployee * employees;
    if ((company.capital || 0) < totalCost) {
      return `${details.currencySymbol}${totalCost.toLocaleString()} required. Insufficient funds.`;
    }

    if (key === 'staff_bonus') {
      const last = company.benefits?.staffBonusLast ? new Date(company.benefits.staffBonusLast) : null;
      if (last) {
        const now = new Date();
        const days = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
        if (days < details.cooldownDays) {
          const remaining = Math.ceil(details.cooldownDays - days);
          return `Staff Bonus is on cooldown. Available in ${remaining} day(s).`;
        }
      }
    }

    if (key === 'family_day') {
      const last = company.benefits?.familyDayLast ? new Date(company.benefits.familyDayLast) : null;
      if (last) {
        const now = new Date();
        const days = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
        if (days < details.cooldownDays) {
          const remaining = Math.ceil(details.cooldownDays - days);
          return `Staff Family Day is on cooldown. Available in ${remaining} day(s).`;
        }
      }
    }

    // allowed
    return null;
  };

  /**
   * applyBenefit
   * @description Actually apply the benefit changes to company state and persist timestamps.
   *              No browser-native dialogs are used here. Parent ensures validation via computeDisabledReason.
   */
  const applyBenefit = (benefitKey: 'staff_bonus' | 'family_day') => {
    if (!company) {
      setNotification({ type: 'error', message: 'No company found. Please create a company first.' });
      return;
    }

    const employees = (company.staff || []).length || 0;
    if (employees === 0) {
      setNotification({ type: 'error', message: 'You have no employees to apply this benefit to.' });
      return;
    }

    const details = getBenefitDetails(benefitKey);
    if (!details) {
      setNotification({ type: 'error', message: 'Unknown benefit selected.' });
      return;
    }

    const disabledReason = computeDisabledReason(benefitKey, employees);
    if (disabledReason) {
      setNotification({ type: 'error', message: disabledReason });
      return;
    }

    try {
      const now = new Date();
      const currentBenefits: any = company.benefits && typeof company.benefits === 'object' ? { ...company.benefits } : {};
      const totalCost = details.costPerEmployee * employees;

      if (benefitKey === 'staff_bonus') {
        const updatedStaff = (company.staff || []).map((s: any) => {
          const prev = typeof s.happiness === 'number' ? s.happiness : 100;
          return { ...s, happiness: Math.min(100, Math.round(prev + details.happinessGain)) };
        });

        const updatedCompany = {
          ...company,
          capital: (company.capital || 0) - totalCost,
          staff: updatedStaff,
          benefits: { ...currentBenefits, staffBonusLast: now.toISOString() },
        };

        createCompany(updatedCompany);
        setNotification({ type: 'success', message: 'Staff Bonus applied. All staff happiness increased.' });
      } else if (benefitKey === 'family_day') {
        const updatedStaff = (company.staff || []).map((s: any) => {
          const prev = typeof s.happiness === 'number' ? s.happiness : 100;
          return { ...s, happiness: Math.min(100, Math.round(prev + details.happinessGain)) };
        });

        const updatedCompany = {
          ...company,
          capital: (company.capital || 0) - totalCost,
          staff: updatedStaff,
          benefits: { ...currentBenefits, familyDayLast: now.toISOString() },
        };

        createCompany(updatedCompany);
        setNotification({ type: 'success', message: 'Staff Family Day organized. All staff happiness increased.' });
      }
    } catch (err) {
      console.error('[Staff][applyBenefit] Error:', err);
      setNotification({ type: 'error', message: 'Failed to apply benefit. See console for details.' });
    }
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Company Found</h2>
          <p className="text-slate-400">Please create a company first to view staff</p>
        </div>
      </div>
    );
  }

  const staffList: StaffMember[] = company.staff || [];

  /**
   * sortByAvailability
   * @description Available staff first, then future available sorted by date
   * @param arr staff array
   */
  const sortByAvailability = (arr: StaffMember[]) => {
    const today = new Date();
    const available: StaffMember[] = [];
    const future: StaffMember[] = [];

    arr.forEach(s => {
      if (!s.availabilityDate) {
        available.push(s);
      } else {
        const avail = new Date(s.availabilityDate);
        if (isNaN(avail.getTime()) || avail <= today) available.push(s);
        else future.push(s);
      }
    });

    future.sort((a, b) => {
      const da = a.availabilityDate ? new Date(a.availabilityDate).getTime() : 0;
      const db = b.availabilityDate ? new Date(b.availabilityDate).getTime() : 0;
      return da - db;
    });

    return [...available, ...future];
  };

  /**
   * getFilteredStaff
   * @description Return staff filtered for tabs
   */
  const getFilteredStaff = (tab: typeof activeTab) => {
    let base: StaffMember[] = [];
    switch (tab) {
      case 'drivers':
        base = staffList.filter(s => s.role === 'driver');
        break;
      case 'mechanics':
        base = staffList.filter(s => s.role === 'mechanic');
        break;
      case 'dispatchers':
        base = staffList.filter(s => s.role === 'dispatcher');
        break;
      case 'administration':
        base = staffList.filter(s => s.role === 'manager');
        break;
      default:
        base = staffList;
    }
    return sortByAvailability(base);
  };

  const emptyLabelForTab = (tab: typeof activeTab) => {
    if (tab === 'mechanics') return 'mechanics';
    if (tab === 'dispatchers') return 'dispatchers';
    if (tab === 'administration') return 'administration managers';
    return 'staff';
  };

  const filteredStaff = getFilteredStaff(activeTab);

  // Hired managers sorted with availability
  const hiredManagers = sortByAvailability(staffList.filter(s => s.role === 'manager'));

  // prepare modal computed values when opening
  const employeesCount = (company?.staff || []).length || 0;
  const benefitDetails = getBenefitDetails(pendingBenefit || '');
  const costPerEmployee = benefitDetails ? benefitDetails.costPerEmployee : 0;
  const totalCost = costPerEmployee * employeesCount;
  const currencySymbol = benefitDetails ? benefitDetails.currencySymbol : '$';
  const happinessGain = benefitDetails ? benefitDetails.happinessGain : 0;
  const cooldownText =
    pendingBenefit === 'staff_bonus'
      ? 'Allowed once every 3 months.'
      : pendingBenefit === 'family_day'
      ? 'Allowed once every 6 months.'
      : null;

  const disabledReason = computeDisabledReason(pendingBenefit || '', employeesCount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff Management</h1>
          <p className="text-slate-400">Manage your company team members and administration</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm text-slate-400">Total Staff</div>
            <div className="text-2xl font-bold text-blue-400">{staffList.length}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Company Balance</div>
            <div className="text-2xl font-bold text-green-400">€{(company.capital || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div className={`rounded-lg p-3 ${notification.type === 'success' ? 'bg-emerald-900/40 border border-emerald-700 text-emerald-200' : 'bg-red-900/40 border border-red-700 text-red-200'}`}>
          {notification.message}
        </div>
      )}

      {/* Work as Driver Myself */}
      {!staffList.some(s => s.isOwner) && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Work as Driver Myself</h3>
              <p className="text-slate-400 text-sm">Take on driving duties yourself to save on labor costs. You'll work for FREE!</p>
            </div>
            <button
              onClick={workAsDriverMyself}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Work as Driver</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="border-b border-slate-700">
          <div className="flex space-x-1 p-1">
            <button
              onClick={() => setActiveTab('drivers')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'drivers' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Drivers ({staffList.filter(s => s.role === 'driver').length})
            </button>
            <button
              onClick={() => setActiveTab('mechanics')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'mechanics' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Mechanics ({staffList.filter(s => s.role === 'mechanic').length})
            </button>
            <button
              onClick={() => setActiveTab('dispatchers')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'dispatchers' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Dispatchers ({staffList.filter(s => s.role === 'dispatcher').length})
            </button>
            <button
              onClick={() => setActiveTab('administration')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'administration' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Administration ({administrationPositions.filter(p => p.assignedStaff).length}/{administrationPositions.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Administration tab */}
          {activeTab === 'administration' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Company Administration</h2>
                <p className="text-slate-400">Assign managers to key positions in your company</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {administrationPositions.map(position => (
                  <div key={position.id} className="bg-slate-700 rounded-xl border border-slate-600 hover:border-slate-500 transition-all duration-200">
                    <div className={`${position.color} p-4 rounded-t-xl`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {position.icon}
                          <div>
                            <h3 className="font-bold text-lg">{position.title}</h3>
                            <p className="text-xs opacity-90">{position.description}</p>
                          </div>
                        </div>
                        {position.id === 'ceo' && <Crown className="w-5 h-5" />}
                      </div>
                    </div>

                    <div className="p-4">
                      {position.assignedStaff ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-white">{position.assignedStaff.name} <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">{position.assignedStaff.role}</span></div>
                              <div className="text-xs text-slate-400">{position.assignedStaff.role}</div>
                            </div>
                            {position.id !== 'ceo' && (
                              <button
                                onClick={() => {
                                  if (!confirm(`Unassign ${position.assignedStaff?.name}?`)) return;
                                  unassignPosition(position.id);
                                }}
                                className="text-red-400 hover:text-red-300 transition-colors"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <Star className="w-4 h-4 text-yellow-400" />
                              <span className="text-slate-300">{position.assignedStaff.experience}%</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Euro className="w-4 h-4 text-green-400" />
                              <span className="text-slate-300">
                                {position.assignedStaff.salary === 0 ? 'FREE' : `€${position.assignedStaff.salary.toLocaleString()}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-center py-2">
                            <p className="text-slate-400 text-sm">Position Vacant</p>
                          </div>

                          {position.id !== 'ceo' && position.requiredRole && (
                            <div>
                              <select
                                onChange={(e) => {
                                  const staffId = e.target.value;
                                  if (!staffId) return;
                                  handleAssignFromSelect(position.id, staffId);
                                  e.currentTarget.selectedIndex = 0;
                                }}
                                className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                defaultValue=""
                              >
                                <option value="" disabled>Select Manager...</option>
                                {(company.staff || [])
                                  .filter(s => position.requiredRole?.includes(s.role))
                                  .filter(s => (s.isOwner ? true : s.status === 'available'))
                                  .filter(s => !isStaffAssignedToAnyPosition(s.id))
                                  .map(s => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.role})
                                    </option>
                                  ))}
                              </select>

                              { (company.staff || []).filter(s => position.requiredRole?.includes(s.role)).length === 0 && (
                                <p className="text-xs text-slate-500 mt-2">No suitable managers available. Hire managers from Job Center first.</p>
                              )}

                              { (company.staff || []).filter(s => position.requiredRole?.includes(s.role)).length > 0 &&
                                (company.staff || []).filter(s => position.requiredRole?.includes(s.role)).every(s => !s.isOwner && s.status !== 'available') && (
                                  <p className="text-xs text-slate-500 mt-2">Managers are hired but none are currently available.</p>
                                )
                              }
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hired Managers box */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Hired Managers</h3>
                <p className="text-sm text-slate-400 mb-4">All managers currently employed in your company (available first).</p>

                <div className="space-y-4">
                  {hiredManagers.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">No managers hired yet.</div>
                  ) : (
                    hiredManagers.map(m => {
                      const compact: CompactStaff = {
                        id: m.id,
                        name: m.name,
                        role: m.role,
                        experience: m.experience,
                        salary: m.salary === 0 ? 'FREE' : m.salary,
                        hiredDate: m.hiredDate,
                        status: m.status,
                        isOwner: m.isOwner,
                        availabilityDate: m.availabilityDate,
                        skills: m.skills,
                        nationality: m.nationality,
                      };

                      const isUnavailable = m.availabilityDate ? new Date(m.availabilityDate) > new Date() : false;

                      return (
                        <div key={m.id} className={isUnavailable ? 'opacity-60 grayscale' : ''}>
                          <DriverCompactCard
                            staff={compact}
                            fullWidth={true}
                            onRemove={(id) => removeStaff(id)}
                            onAssign={(id) => navigate('/job-center')}
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Drivers / Mechanics / Dispatchers lists */}
          {activeTab !== 'administration' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {activeTab === 'drivers' ? 'Drivers' : activeTab === 'mechanics' ? 'Mechanics' : 'Dispatchers'}
                  </h3>
                  <p className="text-sm text-slate-400">List view — one entry per row. Expand an entry for more details.</p>
                </div>
              </div>

              <div className="space-y-4">
                {filteredStaff.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    No {emptyLabelForTab(activeTab)} found
                  </div>
                ) : (
                  filteredStaff.map((staff) => {
                    const compact: CompactStaff = {
                      id: staff.id,
                      name: staff.name,
                      role: staff.role,
                      experience: staff.experience,
                      salary: staff.salary === 0 ? 'FREE' : staff.salary,
                      hiredDate: staff.hiredDate,
                      status: staff.status,
                      isOwner: staff.isOwner,
                      availabilityDate: staff.availabilityDate,
                      skills: staff.skills,
                      nationality: staff.nationality,
                    };

                    const isUnavailable = staff.availabilityDate ? new Date(staff.availabilityDate) > new Date() : false;

                    return (
                      <div key={staff.id} className={isUnavailable ? 'opacity-60 grayscale' : ''}>
                        <DriverCompactCard
                          staff={compact}
                          fullWidth={true}
                          onRemove={(id) => removeStaff(id)}
                          onAssign={(id) => navigate('/job-center')}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Navigation</h3>

        {/* Grid updated to include Company Benefits box next to Hire Staff */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/job-center')}
            className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg p-4 text-left transition-colors"
          >
            <UserPlus className="w-6 h-6 text-blue-400 mb-2" />
            <h4 className="font-medium text-white">Hire Staff</h4>
            <p className="text-sm text-slate-400 mt-1">Recruit new team members</p>
          </button>

          {/* Company Benefits card */}
          <div className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg p-4 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-white">Company Benefits</h4>
                <p className="text-sm text-slate-400 mt-1">One-time company-wide perks to boost staff happiness.</p>
              </div>
            </div>

            <div className="mt-3">
              <label htmlFor="company-benefit-select" className="sr-only">Select benefit</label>
              <select
                id="company-benefit-select"
                value={selectedBenefitSelect}
                onChange={(e) => setSelectedBenefitSelect(e.target.value)}
                className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue=""
              >
                <option value="" disabled>Select Benefit...</option>
                <option value="staff_bonus">Staff Bonus — $500 / employee</option>
                <option value="family_day">Staff Family Day — €250 / employee</option>
              </select>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => {
                  if (!selectedBenefitSelect) {
                    setNotification({ type: 'error', message: 'Please select a benefit to apply.' });
                    return;
                  }

                  if (!company) {
                    setNotification({ type: 'error', message: 'No company found. Please create a company first.' });
                    return;
                  }

                  const employees = (company.staff || []).length || 0;
                  if (employees === 0) {
                    setNotification({ type: 'error', message: 'You have no employees to apply this benefit to.' });
                    return;
                  }

                  // open confirmation modal with computed totals
                  setPendingBenefit(selectedBenefitSelect as 'staff_bonus' | 'family_day');
                  setBenefitModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Apply
              </button>

              <div className="text-sm text-slate-400">Employees: <span className="text-white">{(company?.staff || []).length}</span></div>
            </div>

            {/* NOTE: Benefit descriptions are intentionally removed from inline card.
                They are shown in the confirmation modal when the user clicks Apply. */}
          </div>
        </div>
      </div>

      {/* Company Benefits confirmation modal */}
      <CompanyBenefitsModal
        open={benefitModalOpen}
        benefitKey={pendingBenefit}
        employees={employeesCount}
        costPerEmployee={costPerEmployee}
        totalCost={totalCost}
        currencySymbol={currencySymbol}
        happinessGain={happinessGain}
        cooldownText={cooldownText || undefined}
        disabledReason={disabledReason || undefined}
        onClose={() => {
          setBenefitModalOpen(false);
          setPendingBenefit('');
        }}
        onConfirm={() => {
          // final step: apply benefit (no native confirm), the modal Confirm is last step
          if (pendingBenefit) applyBenefit(pendingBenefit);
          setBenefitModalOpen(false);
          setPendingBenefit('');
          setSelectedBenefitSelect('');
        }}
      />
    </div>
  );
};

export default StaffManagement;
