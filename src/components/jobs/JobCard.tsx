/**
 * JobCard.tsx
 *
 * Presentational card for a single job with action buttons and assignment controls.
 *
 * Responsibilities:
 * - Show exact deadline (date + time) and remaining time for the job (if deadline present).
 * - Render a truck assignment selector (if trucks available).
 * - Show assigned drivers below the truck selector.
 * - Enforce safety checks before allowing Start Job Delivery:
 *    - Job must be in 'preparing' state (accepted jobs default to 'preparing')
 *    - A compatible truck/trailer must be assigned for the job cargo type
 *    - The assigned truck must have at least one driver assigned
 * - When Start Job Delivery is invoked it will:
 *    - Prefer calling onStartDelivery prop (if provided)
 *    - Otherwise perform an in-context transition to the next status ('picking-up')
 *      and persist the company via GameContext.createCompany
 *
 * Notes:
 * - The visual layout and styling were intentionally kept consistent with the
 *   existing design (Tailwind classes preserved).
 * - Defensive checks are applied to avoid runtime errors when fields are missing.
 */

import React, { useMemo } from 'react';
import type { ActiveJob, Company } from '../../types/game';
import { Truck, MapPin, X, Check, Play } from 'lucide-react';
import { useGame } from '../../contexts/GameContext';
import { isCompatibleCargoTrailer } from '../../utils/cargoTrailerCompatibility';

/**
 * JobCardProps
 * @description Props for JobCard component
 */
export interface JobCardProps {
  /**
   * job - The job to render
   */
  job: ActiveJob | any;
  /**
   * onAssignTruck - Called when assigning a truck (jobId, truckId)
   */
  onAssignTruck?: (jobId: string, truckId: string) => void;
  /**
   * onStartDelivery - Called when starting a delivery cycle (jobId)
   */
  onStartDelivery?: (jobId: string) => void;
  /**
   * onComplete - Called to mark the job/clone as completed
   */
  onComplete?: (jobId: string) => void;
  /**
   * onCancel - Called to cancel job/clone
   */
  onCancel?: (jobId: string) => void;
  /**
   * children - Optional extra controls
   */
  children?: React.ReactNode;
}

/**
 * formatDeadline
 * @description Format an ISO deadline and return display string + remaining time
 */
function formatDeadline(deadline?: string | Date): { display: string; remaining?: string } {
  if (!deadline) return { display: 'No deadline' };
  try {
    const d = typeof deadline === 'string' ? new Date(deadline) : new Date(deadline);
    if (Number.isNaN(d.getTime())) return { display: 'Invalid date' };
    const display = d.toLocaleString();
    const diff = d.getTime() - Date.now();
    if (diff <= 0) return { display, remaining: 'Past due' };
    const mins = Math.floor(diff / (60 * 1000));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    let rem = '';
    if (days > 0) rem += `${days}d `;
    if (hours % 24 > 0) rem += `${hours % 24}h `;
    if (mins % 60 > 0 && days === 0) rem += `${mins % 60}m`;
    rem = rem.trim();
    return { display, remaining: rem || 'Less than 1m' };
  } catch {
    return { display: 'Invalid date' };
  }
}

/**
 * safeResolveDriverName
 * @description Resolve driver name from company staff by id, fallback to raw id
 */
function safeResolveDriverName(company: Company | null, id?: string | null) {
  if (!id) return null;
  try {
    const staff = company?.staff ?? [];
    const found = staff.find((s: any) => String(s.id) === String(id));
    return found ? (found.name || String(found.id)) : String(id);
  } catch {
    return String(id);
  }
}

/**
 * extractTruckAssignedDrivers
 * @description Get up to two driver ids assigned to a truck object (legacy & new formats)
 */
function extractTruckAssignedDrivers(truck: any): (string | null)[] {
  if (!truck) return [null, null];
  if (Array.isArray(truck.assignedDrivers)) {
    return [truck.assignedDrivers[0] ?? null, truck.assignedDrivers[1] ?? null];
  }
  return [truck.assignedDriver ?? null, truck.assignedCoDriver ?? null];
}

/**
 * JobCard
 * @description Visual card for a single job with action buttons and assignment controls.
 */
const JobCard: React.FC<JobCardProps> = ({ job, onAssignTruck, onStartDelivery, onComplete, onCancel, children }) => {
  const { gameState, createCompany } = useGame();
  const company = gameState?.company ?? null;

  const assignedTruckObj = useMemo(() => {
    try {
      if (!company || !job?.assignedTruck) return null;
      return (company.trucks || []).find((t: any) => String(t.id) === String(job.assignedTruck)) || null;
    } catch {
      return null;
    }
  }, [company, job?.assignedTruck]);

  const assignedTrailerObj = useMemo(() => {
    try {
      if (!company) return null;
      // Prefer job.assignedTrailer then truck.assignedTrailer
      const trailerId = job?.assignedTrailer ?? assignedTruckObj?.assignedTrailer ?? null;
      if (!trailerId) return null;
      return (company.trailers || []).find((tr: any) => String(tr.id) === String(trailerId)) || null;
    } catch {
      return null;
    }
  }, [company, job?.assignedTrailer, assignedTruckObj?.assignedTrailer, assignedTruckObj]);

  /**
   * checkCompatibility
   * @description Return true when the assigned truck/trailer is compatible with job cargo type.
   *              This tries multiple sensible heuristics:
   *              - truck.specifications?.cargoTypes includes job.cargoType
   *              - truck.marketCargoTypes / cargoTypes fields include job.cargoType
   *              - assigned trailer type id/class is compatible using isCompatibleCargoTrailer
   */
  const checkCompatibility = (): boolean => {
    try {
      if (!job?.cargoType) return false;
      // Truck explicit cargo types
      const truck = assignedTruckObj;
      if (truck) {
        const explicit = truck.specifications?.cargoTypes ?? truck.marketCargoTypes ?? truck.cargoTypes ?? null;
        if (Array.isArray(explicit) && explicit.length > 0) {
          if (explicit.includes(job.cargoType)) return true;
        }
      }

      // Trailer compatibility via helper
      if (assignedTrailerObj) {
        // trailer.type or trailer.trailerClass can contain a type id like 'flatbed' or 'box-trailer'
        const trailerTypeCandidates: string[] = [];
        if (typeof assignedTrailerObj.type === 'string') trailerTypeCandidates.push(assignedTrailerObj.type);
        if (typeof assignedTrailerObj.trailerClass === 'string') trailerTypeCandidates.push(assignedTrailerObj.trailerClass);
        // also try derived candidate with '-trailer' suffix
        trailerTypeCandidates.forEach((c) => {
          if (c && !trailerTypeCandidates.includes(`${c}-trailer`)) trailerTypeCandidates.push(`${c}-trailer`);
        });
        // Test all candidates
        for (const cand of trailerTypeCandidates) {
          try {
            if (isCompatibleCargoTrailer(job.cargoType, cand)) return true;
          } catch {
            // ignore individual checks
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  };

  /**
   * checkHasDriverAssigned
   * @description Ensure the assigned truck has at least one driver assigned OR the job itself has driver(s)
   */
  const checkHasDriverAssigned = (): boolean => {
    try {
      // First prefer truck assigned drivers
      const truck = assignedTruckObj;
      if (truck) {
        const drivers = extractTruckAssignedDrivers(truck);
        if ((drivers[0] ?? drivers[1]) ) return true;
      }
      // Fallback to job-level assignment fields
      if (job.assignedDriver || job.assignedCoDriver) return true;
      return false;
    } catch {
      return false;
    }
  };

  const compatible = checkCompatibility();
  const hasDriver = checkHasDriverAssigned();

  // Start conditions:
  // - job.status should be 'preparing' (accepted default)
  // - compatible must be true
  // - hasDriver must be true
  const canStart = String(job?.status ?? '').toLowerCase() === 'preparing' && compatible && hasDriver;

  /**
   * handleAssignTruck
   * @description Use provided callback if present; otherwise mutate company in-context and persist.
   */
  const handleAssignTruck = (truckId: string | null) => {
    if (!company) return;
    if (typeof onAssignTruck === 'function') {
      onAssignTruck(job.id, truckId ?? '');
      return;
    }
    try {
      const updated: any = { ...company, trucks: company.trucks ?? [], trailers: company.trailers ?? [], staff: company.staff ?? [], activeJobs: company.activeJobs ?? [] };
      // Update job assignment in company.activeJobs
      updated.activeJobs = (updated.activeJobs || []).map((j: any) => (j.id === job.id ? { ...j, assignedTruck: truckId ?? '' } : j));
      createCompany(updated);
    } catch (err) {
      // never throw
      // eslint-disable-next-line no-console
      console.warn('assignTruck fallback failed', err);
    }
  };

  /**
   * internalStart
   * @description Start job delivery transition:
   *              - call onStartDelivery if provided
   *              - otherwise set status to 'picking-up' and persist company via createCompany
   */
  /**
   * internalStart
   * @description Starts job delivery only when the UI requirements are satisfied:
   *  - job.status must be 'preparing'
   *  - a compatible truck/trailer must be assigned for the job cargo type
   *  - the assigned truck must have at least one driver (or the job-level driver fields must be present)
   *
   * If requirements are not met, the function returns early and no job status change occurs.
   */
  const internalStart = () => {
    // Prevent accidental start if requirements not satisfied
    if (!canStart) {
      // Provide immediate feedback to the user — no automatic status transition.
      alert('Cannot start delivery. Ensure a compatible truck/trailer is assigned and at least one driver is assigned to the truck.');
      return;
    }

    if (typeof onStartDelivery === 'function') {
      try {
        onStartDelivery(job.id);
        return;
      } catch (err) {
        // Fallthrough to internal fallback
        // eslint-disable-next-line no-console
        console.warn('onStartDelivery handler threw, applying fallback', err);
      }
    }

    // Fallback: update in-context company activeJobs status -> 'picking-up' and persist
    if (!company) return;
    try {
      const updated: any = JSON.parse(JSON.stringify(company));
      updated.activeJobs = (updated.activeJobs || []).map((j: any) => {
        if (j.id !== job.id) return j;
        const clone = { ...j };
        clone.status = 'picking-up';
        clone.startTime = clone.startTime ?? new Date().toISOString();
        clone.estimatedCompletion = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        return clone;
      });
      // Persist using GameContext helper
      createCompany(updated);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('internalStart fallback failed', err);
    }
  };

  /**
   * handleCompleteClick
   */
  const handleCompleteClick = () => {
    if (typeof onComplete === 'function') {
      try { onComplete(job.id); return; } catch { /* continue */ }
    }
    // fallback: attempt to mark completed in company
    if (!company) return;
    try {
      const updated: any = JSON.parse(JSON.stringify(company));
      updated.activeJobs = (updated.activeJobs || []).map((j: any) => (j.id === job.id ? { ...j, status: 'completed', progress: 100 } : j));
      createCompany(updated);
    } catch (err) {
      // ignore
    }
  };

  /**
   * handleCancelClick
   */
  const handleCancelClick = () => {
    if (typeof onCancel === 'function') {
      try { onCancel(job.id); return; } catch { /* continue */ }
    }
    if (!company) return;
    try {
      const updated: any = JSON.parse(JSON.stringify(company));
      updated.activeJobs = (updated.activeJobs || []).map((j: any) => (j.id === job.id ? { ...j, status: 'cancelled' } : j));
      createCompany(updated);
    } catch (err) {
      // ignore
    }
  };

  const { display: deadlineDisplay, remaining: deadlineRemaining } = formatDeadline(job.deadline);

  // Build truck options for selector
  const truckOptions = (company?.trucks ?? []).map((t: any) => ({ id: t.id, label: `${t.brand ?? ''} ${t.model ?? ''}`.trim() || String(t.id) }));

  // Resolve assigned drivers to names (prefer truck assigned drivers, fallback to job fields)
  const assignedDriverNames: string[] = [];
  try {
    const truckDrivers = extractTruckAssignedDrivers(assignedTruckObj);
    if (truckDrivers[0]) assignedDriverNames.push(safeResolveDriverName(company, truckDrivers[0]));
    if (truckDrivers[1]) assignedDriverNames.push(safeResolveDriverName(company, truckDrivers[1]));
    // If none from truck, fall back to job.assignedDriver / assignedCoDriver
    if (assignedDriverNames.length === 0) {
      if (job.assignedDriver) assignedDriverNames.push(safeResolveDriverName(company, job.assignedDriver));
      if (job.assignedCoDriver) assignedDriverNames.push(safeResolveDriverName(company, job.assignedCoDriver));
    }
  } catch {
    // ignore
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-400">#{String(job.id).slice(-8)}</div>
          <div className="text-white font-medium">{job.title || 'Transport Job'}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
            <MapPin className="w-3 h-3" />
            <span>{job.origin || 'Unknown'} → {job.destination || 'Unknown'}</span>
          </div>
        </div>

        <div className="text-right">
          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${job.status === 'completed' ? 'text-green-400 bg-green-400/10' : job.status === 'cancelled' ? 'text-red-400 bg-red-400/10' : 'text-slate-300 bg-slate-700/40'}`}>
            <span className="mr-2 text-xs">{String(job.status ?? 'unknown')}</span>
            <span className="text-xs text-slate-400 ml-1">{job.progress ?? 0}%</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">{job.distance ? `${job.distance} km` : ''}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3">
        <div className="text-slate-400 text-sm">Details</div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-medium">{job.weight ? `${job.weight} t` : '—'}</div>
            <div className="text-xs text-slate-400">Value: {typeof job.value === 'number' ? '$' + job.value.toLocaleString() : '—'}</div>

            <div className="mt-3 text-xs text-slate-400">
              <div>Deadline: <span className="text-white ml-2">{deadlineDisplay}</span></div>
              {deadlineRemaining && <div>Remaining: <span className="text-white ml-2">{deadlineRemaining}</span></div>}
            </div>
          </div>

          <div className="flex flex-col items-end space-y-2">
            {/* Truck selector */}
            <div className="flex items-center space-x-2">
              <label className="text-slate-400 text-xs mr-2">Assigned Truck</label>
              <select
                value={job.assignedTruck ?? ''}
                onChange={(e) => handleAssignTruck(e.target.value || null)}
                className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1"
              >
                <option value="">Unassigned</option>
                {truckOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Show assigned trailer (if any) */}
            <div className="text-xs text-slate-400">
              Trailer: <span className="text-white ml-2">{assignedTrailerObj ? (assignedTrailerObj.trailerClass ?? assignedTrailerObj.type ?? assignedTrailerObj.model ?? 'Trailer') : 'None'}</span>
            </div>

            {/* Assigned drivers shown below truck selector */}
            <div className="mt-2 text-xs text-slate-400 w-full text-right">
              <div className="text-slate-400">Assigned Drivers</div>
              {assignedDriverNames.length === 0 ? (
                <div className="text-white">None</div>
              ) : (
                assignedDriverNames.map((n, idx) => (
                  <div key={idx} className="text-white">{`Driver ${idx + 1}: ${n}`}</div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div />
          <div className="flex items-center space-x-2">
            <button
              onClick={internalStart}
              disabled={!canStart}
              aria-disabled={!canStart}
              title={!canStart ? (String(job?.status).toLowerCase() !== 'preparing' ? 'Job not in preparing state' : !compatible ? 'Assign a compatible truck/trailer' : 'Assign at least one driver to the truck') : 'Start Job Delivery'}
              className={`flex items-center space-x-2 ${canStart ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-slate-700 text-slate-400 cursor-not-allowed'} py-1 px-2 rounded text-sm`}
            >
              <Play className="w-4 h-4" />
              <span>Start Job Delivery</span>
            </button>

            <button onClick={handleCompleteClick} className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-sm">
              <Check className="w-4 h-4" />
              <span>Complete</span>
            </button>

            <button onClick={handleCancelClick} className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white py-1 px-2 rounded text-sm">
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
};

export default JobCard;