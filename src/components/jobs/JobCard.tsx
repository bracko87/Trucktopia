/**
 * JobCard.tsx
 *
 * File-level:
 * Visual card for a single job with action buttons and assignment controls.
 *
 * Purpose:
 * - Render job metadata (origin/destination, deadline, weight, value)
 * - Allow assigning a truck from company trucks
 * - Provide Start / Complete / Cancel actions
 * - Prevent browser-native alert/confirm/prompt popups during start flow by suppressing
 *   native dialogs while handlers run (safeSuppressNativeDialogs).
 *
 * Notes:
 * - Layout and styles are preserved to avoid visual changes.
 * - All comments follow jsdoc-style comment rules required by the project.
 */

import React, { useMemo, useState } from "react";
import type { ActiveJob, Company } from "../../types/game";
import { Truck, MapPin, X, Check, Play } from "lucide-react";
import { useGame } from "../../contexts/GameContext";
import { isCompatibleCargoTrailer } from "../../utils/cargoTrailerCompatibility";

/**
 * JobCardProps
 * @description Props accepted by JobCard component.
 */
export interface JobCardProps {
  /** Job object to display */
  job: ActiveJob | any;
  /** Assign truck callback (jobId, truckId) */
  onAssignTruck?: (jobId: string, truckId: string) => void;
  /** Called when starting delivery (jobId) */
  onStartDelivery?: (jobId: string) => void;
  /** Called when completing the job (jobId) */
  onComplete?: (jobId: string) => void;
  /** Called when cancelling the job (jobId) */
  onCancel?: (jobId: string) => void;
  /** Extra children inside card */
  children?: React.ReactNode;
}

/**
 * formatDeadline
 * @description Format an ISO deadline and return display string + remaining time.
 * @param deadline ISO string or Date
 */
function formatDeadline(deadline?: string | Date): { display: string; remaining?: string } {
  if (!deadline) return { display: "No deadline" };
  try {
    const d = typeof deadline === "string" ? new Date(deadline) : new Date(deadline);
    if (Number.isNaN(d.getTime())) return { display: "Invalid date" };
    const display = d.toLocaleString();
    const diff = d.getTime() - Date.now();
    if (diff <= 0) return { display, remaining: "Past due" };
    const mins = Math.floor(diff / (60 * 1000));
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    let rem = "";
    if (days > 0) rem += `${days}d `;
    if (hours % 24 > 0) rem += `${hours % 24}h `;
    if (mins % 60 > 0 && days === 0) rem += `${mins % 60}m`;
    rem = rem.trim();
    return { display, remaining: rem || "Less than 1m" };
  } catch {
    return { display: "Invalid date" };
  }
}

/**
 * safeResolveDriverName
 * @description Resolve a driver name from company staff by id, fallback to id.
 * @param company Company or null
 * @param id Staff id
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
 * @description Get up to two driver ids assigned to a truck object (supports legacy formats).
 * @param truck truck object
 */
function extractTruckAssignedDrivers(truck: any): (string | null)[] {
  if (!truck) return [null, null];
  if (Array.isArray(truck.assignedDrivers)) {
    return [truck.assignedDrivers[0] ?? null, truck.assignedDrivers[1] ?? null];
  }
  return [truck.assignedDriver ?? null, truck.assignedCoDriver ?? null];
}

/**
 * safeSuppressNativeDialogs
 * @description Temporarily override native browser dialog functions (confirm/alert/prompt)
 * while the provided callback runs and for a short grace period afterwards to catch
 * delayed calls. Restores originals afterwards.
 *
 * @param cb Callback to run while suppression is active
 * @param graceMs How long to keep suppression after callback completes (ms)
 */
async function safeSuppressNativeDialogs<T>(cb: () => T | Promise<T>, graceMs = 1000): Promise<T | undefined> {
  if (typeof globalThis === "undefined" && typeof window === "undefined") {
    return await Promise.resolve(cb());
  }
  const glob: any = typeof globalThis !== "undefined" ? globalThis : (window as any);

  const originals: Partial<Record<string, any>> = {
    confirm: glob?.confirm,
    alert: glob?.alert,
    prompt: glob?.prompt,
  };

  const replacementConfirm = () => true;
  const replacementAlert = () => undefined;
  const replacementPrompt = () => null;

  try {
    try { if (glob) glob.confirm = replacementConfirm; } catch {}
    try { if (glob) glob.alert = replacementAlert; } catch {}
    try { if (glob) glob.prompt = replacementPrompt; } catch {}

    try { if (typeof window !== "undefined") (window as any).confirm = replacementConfirm; } catch {}
    try { if (typeof window !== "undefined") (window as any).alert = replacementAlert; } catch {}
    try { if (typeof window !== "undefined") (window as any).prompt = replacementPrompt; } catch {}

    const result = cb();
    if (result && typeof (result as any).then === "function") {
      const awaited = await (result as any);
      await new Promise((res) => setTimeout(res, graceMs));
      return awaited as T;
    }
    // synchronous
    await new Promise((res) => setTimeout(res, graceMs));
    return result as T;
  } finally {
    try { if (glob && originals.confirm !== undefined) glob.confirm = originals.confirm; } catch {}
    try { if (glob && originals.alert !== undefined) glob.alert = originals.alert; } catch {}
    try { if (glob && originals.prompt !== undefined) glob.prompt = originals.prompt; } catch {}

    try { if (typeof window !== "undefined" && originals.confirm !== undefined) (window as any).confirm = originals.confirm; } catch {}
    try { if (typeof window !== "undefined" && originals.alert !== undefined) (window as any).alert = originals.alert; } catch {}
    try { if (typeof window !== "undefined" && originals.prompt !== undefined) (window as any).prompt = originals.prompt; } catch {}
  }
}

/**
 * JobCard
 * @description Visual card for a single job with action buttons and assignment controls.
 * - UI layout and styling preserved.
 * - Uses inline, non-blocking notices instead of native alert().
 */
const JobCard: React.FC<JobCardProps> = ({ job, onAssignTruck, onStartDelivery, onComplete, onCancel, children }) => {
  const { gameState, createCompany } = useGame();
  const company = (gameState as any)?.company ?? null;

  /**
   * notice
   * @description Transient inline notice used instead of blocking native alert/popups.
   */
  const [notice, setNotice] = useState<string | null>(null);

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
      const trailerId = job?.assignedTrailer ?? assignedTruckObj?.assignedTrailer ?? null;
      if (!trailerId) return null;
      return (company.trailers || []).find((tr: any) => String(tr.id) === String(trailerId)) || null;
    } catch {
      return null;
    }
  }, [company, job?.assignedTrailer, assignedTruckObj?.assignedTrailer, assignedTruckObj]);

  /**
   * checkCompatibility
   * @description Check if assigned truck/trailer combination is compatible with job cargo type.
   */
  const checkCompatibility = (): boolean => {
    try {
      if (!job?.cargoType) return false;

      if (assignedTruckObj) {
        const explicit = assignedTruckObj.specifications?.cargoTypes ?? assignedTruckObj.marketCargoTypes ?? assignedTruckObj.cargoTypes ?? null;
        if (Array.isArray(explicit) && explicit.length > 0) {
          if (explicit.includes(job.cargoType)) return true;
        }
      }

      if (assignedTrailerObj) {
        const trailerTypeCandidates: string[] = [];
        if (typeof assignedTrailerObj.type === "string") trailerTypeCandidates.push(assignedTrailerObj.type);
        if (typeof assignedTrailerObj.trailerClass === "string") trailerTypeCandidates.push(assignedTrailerObj.trailerClass);
        trailerTypeCandidates.forEach((c) => {
          if (c && !trailerTypeCandidates.includes(c + "-trailer")) trailerTypeCandidates.push(c + "-trailer");
        });
        for (const cand of trailerTypeCandidates) {
          try {
            if (isCompatibleCargoTrailer(job.cargoType, cand)) return true;
          } catch { /* ignore */ }
        }
      }

      return false;
    } catch {
      return false;
    }
  };

  /**
   * checkHasDriverAssigned
   * @description True when the assigned truck has at least one driver OR job-level drivers exist.
   */
  const checkHasDriverAssigned = (): boolean => {
    try {
      if (assignedTruckObj) {
        const drivers = extractTruckAssignedDrivers(assignedTruckObj);
        if (drivers[0] || drivers[1]) return true;
      }
      if (job.assignedDriver || job.assignedCoDriver) return true;
      return false;
    } catch {
      return false;
    }
  };

  const compatible = checkCompatibility();
  const hasDriver = checkHasDriverAssigned();
  const canStart = String(job?.status ?? "").toLowerCase() === "preparing" && compatible && hasDriver;

  /**
   * handleAssignTruck
   * @description Assign truck to job using callback or in-context company mutation.
   * @param truckId selected truck id or null for unassign
   */
  const handleAssignTruck = (truckId: string | null) => {
    if (!company) return;
    if (typeof onAssignTruck === "function") {
      onAssignTruck(job.id, truckId ?? "");
      return;
    }
    try {
      const updated: any = { ...company, activeJobs: company.activeJobs ?? [] };
      updated.activeJobs = (updated.activeJobs || []).map((j: any) => (j.id === job.id ? { ...j, assignedTruck: truckId ?? "" } : j));
      createCompany(updated);
    } catch (err) {
      // best-effort: don't crash
      // eslint-disable-next-line no-console
      console.warn("assignTruck fallback failed", err);
    }
  };

  /**
   * internalStart
   * @description Start delivery flow. Suppresses native dialogs while handlers run.
   */
  const internalStart = async () => {
    if (!canStart) {
      setNotice("Cannot start delivery. Ensure a compatible truck/trailer is assigned and at least one driver is assigned to the truck.");
      setTimeout(() => setNotice(null), 3500);
      return;
    }

    if (typeof onStartDelivery === "function") {
      try {
        await safeSuppressNativeDialogs(() => Promise.resolve(onStartDelivery(job.id)), 1000);
        setNotice("Delivery started.");
        setTimeout(() => setNotice(null), 3000);
        return;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("onStartDelivery handler threw, applying fallback", err);
      }
    }

    if (!company) return;
    try {
      await safeSuppressNativeDialogs(async () => {
        const updated: any = JSON.parse(JSON.stringify(company));
        updated.activeJobs = (updated.activeJobs || []).map((j: any) => {
          if (j.id !== job.id) return j;
          const clone = { ...j };
          clone.status = "picking-up";
          clone.startTime = clone.startTime ?? new Date().toISOString();
          clone.estimatedCompletion = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
          return clone;
        });
        createCompany(updated);
        setNotice("Delivery started.");
        setTimeout(() => setNotice(null), 3000);
      }, 1000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("internalStart fallback failed", err);
      setNotice("Failed to start delivery");
      setTimeout(() => setNotice(null), 3000);
    }
  };

  /**
   * handleCompleteClick
   */
  const handleCompleteClick = () => {
    if (typeof onComplete === "function") {
      try { onComplete(job.id); return; } catch { /* continue */ }
    }
    if (!company) return;
    try {
      const updated: any = JSON.parse(JSON.stringify(company));
      updated.activeJobs = (updated.activeJobs || []).map((j: any) => (j.id === job.id ? { ...j, status: "completed", progress: 100 } : j));
      createCompany(updated);
    } catch {
      // ignore
    }
  };

  /**
   * handleCancelClick
   */
  const handleCancelClick = () => {
    if (typeof onCancel === "function") {
      try { onCancel(job.id); return; } catch { /* continue */ }
    }
    if (!company) return;
    try {
      const updated: any = JSON.parse(JSON.stringify(company));
      updated.activeJobs = (updated.activeJobs || []).map((j: any) => (j.id === job.id ? { ...j, status: "cancelled" } : j));
      createCompany(updated);
    } catch {
      // ignore
    }
  };

  const { display: deadlineDisplay, remaining: deadlineRemaining } = formatDeadline(job.deadline);

  const truckOptions = (company?.trucks ?? []).map((t: any) => ({ id: t.id, label: (String((t.brand ?? "") + " " + (t.model ?? "")).trim() || String(t.id)) }));

  const assignedDriverNames: string[] = [];
  try {
    const truckDrivers = extractTruckAssignedDrivers(assignedTruckObj);
    if (truckDrivers[0]) assignedDriverNames.push(safeResolveDriverName(company, truckDrivers[0]) as string);
    if (truckDrivers[1]) assignedDriverNames.push(safeResolveDriverName(company, truckDrivers[1]) as string);
    if (assignedDriverNames.length === 0) {
      if (job.assignedDriver) assignedDriverNames.push(safeResolveDriverName(company, job.assignedDriver) as string);
      if (job.assignedCoDriver) assignedDriverNames.push(safeResolveDriverName(company, job.assignedCoDriver) as string);
    }
  } catch {
    // ignore
  }

  // Build tooltip string without nested template literals to avoid accidental unterminated literals
  let startButtonTooltip = "Start Job Delivery";
  if (!canStart) {
    const stat = String(job?.status ?? "").toLowerCase();
    if (stat !== "preparing") startButtonTooltip = "Job not in preparing state";
    else if (!compatible) startButtonTooltip = "Assign a compatible truck/trailer";
    else startButtonTooltip = "Assign at least one driver to the truck";
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-400">#{String(job.id).slice(-8)}</div>
          <div className="text-white font-medium">{job.title || "Transport Job"}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center space-x-2">
            <MapPin className="w-3 h-3" />
            <span>{job.origin || "Unknown"} → {job.destination || "Unknown"}</span>
          </div>
        </div>

        <div className="text-right">
          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${job.status === "completed" ? "text-green-400 bg-green-400/10" : job.status === "cancelled" ? "text-red-400 bg-red-400/10" : "text-slate-300 bg-slate-700/40"}`}>
            <span className="mr-2 text-xs">{String(job.status ?? "unknown")}</span>
            <span className="text-xs text-slate-400 ml-1">{job.progress ?? 0}%</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">{job.distance ? `${job.distance} km` : ""}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3">
        <div className="text-slate-400 text-sm">Details</div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-medium">{job.weight ? `${job.weight} t` : "—"}</div>
            <div className="text-xs text-slate-400">Value: {typeof job.value === "number" ? "$" + job.value.toLocaleString() : "—"}</div>

            <div className="mt-3 text-xs text-slate-400">
              <div>Deadline: <span className="text-white ml-2">{deadlineDisplay}</span></div>
              {deadlineRemaining && <div>Remaining: <span className="text-white ml-2">{deadlineRemaining}</span></div>}
            </div>
          </div>

          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-2">
              <label className="text-slate-400 text-xs mr-2">Assigned Truck</label>
              <select
                value={job.assignedTruck ?? ""}
                onChange={(e) => handleAssignTruck(e.target.value || null)}
                className="bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1"
              >
                <option value="">Unassigned</option>
                {truckOptions.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-slate-400">
              Trailer: <span className="text-white ml-2">{assignedTrailerObj ? (assignedTrailerObj.trailerClass ?? assignedTrailerObj.type ?? assignedTrailerObj.model ?? "Trailer") : "None"}</span>
            </div>

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
              title={startButtonTooltip}
              className={`flex items-center space-x-2 ${canStart ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-700 text-slate-400 cursor-not-allowed"} py-1 px-2 rounded text-sm`}
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

      {notice && (
        <div className="mt-3 text-sm text-amber-300">
          {notice}
        </div>
      )}

      {children}
    </div>
  );
};

export default JobCard;
