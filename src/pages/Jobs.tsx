/**
 * Jobs.tsx
 *
 * Jobs page: shows Accepted Jobs above Current Deliveries with a visible separator.
 *
 * Responsibilities:
 * - Render Accepted Jobs block above the Current Deliveries block (stacked vertically)
 * - Provide a visible dividing line between the two sections
 * - Keep actions: start delivery (cloning), complete, cancel via GameContext
 *
 * Visual approach:
 * - Accepted Jobs are presented in a compact card area (rounded, bordered)
 * - A clear separator (border-t with slightly brighter color) divides the two sections
 * - Current Deliveries follow below in their own card area
 */

/* eslint-disable react/jsx-no-bind */
import React, { useMemo, useState } from 'react';
import { useGame } from '../contexts/GameContext';
import JobList from '../components/jobs/JobList';
import JobCard from '../components/jobs/JobCard';
import { Truck } from 'lucide-react';

/**
 * safeSuppressNativeDialogs
 * @description Temporarily override native browser dialog functions (confirm/alert/prompt)
 * to prevent white native popups during an operation. This replaces window.confirm/alert/prompt
 * and globalThis equivalents and restores them after the callback completes.
 *
 * Important:
 * - confirm() is overridden to always return true so any legacy confirm checks proceed.
 * - alert/prompt become no-ops to avoid showing blocking native dialogs.
 * - The replacement stays active through the awaited callback and for a small grace period
 *   afterwards (default 1000ms) to cover async/queued confirm calls triggered by parent handlers.
 *
 * @param cb Function to execute while native dialogs are suppressed
 * @param graceMs optional grace period to keep suppression after completion (default 1000ms)
 * @returns the callback result
 */
async function safeSuppressNativeDialogs<T>(cb: () => T | Promise<T>, graceMs = 1000): Promise<T | undefined> {
  if (typeof window === 'undefined' && typeof globalThis === 'undefined') {
    return await Promise.resolve(cb());
  }

  const glob = typeof globalThis !== 'undefined' ? globalThis as any : (window as any);

  const originals: Partial<Record<string, any>> = {
    confirm: glob?.confirm,
    alert: glob?.alert,
    prompt: glob?.prompt
  };

  const replacementConfirm = () => true;
  const replacementAlert = () => undefined;
  const replacementPrompt = () => null;

  try {
    try { if (glob) glob.confirm = replacementConfirm; } catch {}
    try { if (glob) glob.alert = replacementAlert; } catch {}
    try { if (glob) glob.prompt = replacementPrompt; } catch {}

    try { if (typeof window !== 'undefined') (window as any).confirm = replacementConfirm; } catch {}
    try { if (typeof window !== 'undefined') (window as any).alert = replacementAlert; } catch {}
    try { if (typeof window !== 'undefined') (window as any).prompt = replacementPrompt; } catch {}

    const result = cb();
    if (result && typeof (result as any).then === 'function') {
      const awaited = await (result as any);
      await new Promise(res => setTimeout(res, graceMs));
      return awaited as T;
    }
    await new Promise(res => setTimeout(res, graceMs));
    return result as T;
  } finally {
    try { if (glob && originals.confirm !== undefined) glob.confirm = originals.confirm; } catch {}
    try { if (glob && originals.alert !== undefined) glob.alert = originals.alert; } catch {}
    try { if (glob && originals.prompt !== undefined) glob.prompt = originals.prompt; } catch {}

    try { if (typeof window !== 'undefined' && originals.confirm !== undefined) (window as any).confirm = originals.confirm; } catch {}
    try { if (typeof window !== 'undefined' && originals.alert !== undefined) (window as any).alert = originals.alert; } catch {}
    try { if (typeof window !== 'undefined' && originals.prompt !== undefined) (window as any).prompt = originals.prompt; } catch {}
  }
}

/**
 * JobsPage
 * @description Main page component for jobs: accepted jobs appear first, deliveries follow.
 */
const JobsPage: React.FC = () => {
  const { gameState, createCompany, completeJob, cancelJob } = useGame();
  const company = gameState?.company;

  // Local transient notice to show non-blocking feedback (replaces native alert usage)
  const [notice, setNotice] = useState<string | null>(null);

  // Guard: no company -> friendly message
  if (!company) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-white">My Jobs</h1>
        <p className="text-slate-400">No company found. Please create or load a company.</p>
      </div>
    );
  }

  const allJobs = Array.isArray(company.activeJobs) ? company.activeJobs : [];

  /**
   * acceptedJobs
   * @description Canonical accepted jobs: those without parentJobId and not cancelled
   */
  const acceptedJobs = useMemo(
    () => allJobs.filter(j => j && !j.parentJobId && j.status !== 'cancelled'),
    [allJobs]
  );

  /**
   * currentDeliveries
   * @description Jobs that are clones (have parentJobId) and are not cancelled
   */
  const currentDeliveries = useMemo(
    () => allJobs.filter(j => j && j.parentJobId && j.status !== 'cancelled'),
    [allJobs]
  );

  /**
   * startDelivery
   * @description Create a cloned in-flight delivery from a canonical accepted job.
   * This function wraps operations in safeSuppressNativeDialogs to prevent any native
   * alert/confirm from appearing due to legacy handlers.
   */
  const startDelivery = async (parentJobId: string) => {
    try {
      const parent = (company.activeJobs || []).find((j: any) => j.id === parentJobId && !j.parentJobId);
      if (!parent) {
        // non-blocking in-UI feedback
        setNotice('Parent job not found');
        setTimeout(() => setNotice(null), 3000);
        return;
      }

      await safeSuppressNativeDialogs(async () => {
        const ts = Date.now();
        const cloneId = `job-clone-${parent.id}-${String(ts).slice(-6)}`;
        const remaining = Math.max(0, (parent.weight || 0) - (parent.deliveredTons || 0));
        const cloneJob: any = {
          id: cloneId,
          parentJobId: parent.id,
          title: parent.title,
          contractId: parent.contractId || `contract-${cloneId}`,
          assignedTruck: parent.assignedTruck ?? '',
          assignedTrailer: parent.assignedTrailer ?? '',
          assignedDriver: parent.assignedDriver ?? '',
          startTime: new Date(),
          estimatedCompletion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          progress: 0,
          currentLocation: parent.origin,
          status: 'picking-up',
          value: parent.value || 0,
          distance: parent.distance || 0,
          origin: parent.origin,
          destination: parent.destination,
          deadline: parent.deadline,
          cargoType: parent.cargoType,
          weight: remaining,
          deliveredTons: 0
        };

        const updatedCompany: any = JSON.parse(JSON.stringify(company));
        updatedCompany.activeJobs = Array.isArray(updatedCompany.activeJobs) ? updatedCompany.activeJobs : [];
        updatedCompany.activeJobs = updatedCompany.activeJobs.map((j: any) => (j.id === parent.id ? { ...j, status: 'picking-up' } : j));
        updatedCompany.activeJobs.push(cloneJob);

        createCompany(updatedCompany);

        // Non-blocking UX feedback (replaces native alert)
        setNotice('Delivery started.');
        setTimeout(() => setNotice(null), 3000);
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('startDelivery error', err);
      setNotice('Failed to start delivery');
      setTimeout(() => setNotice(null), 3000);
    }
  };

  /**
   * completeAnyJob
   * @description Mark a job completed using GameContext.completeJob (idempotent).
   */
  const completeAnyJob = (jobId: string) => {
    try {
      completeJob(jobId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('complete job error', err);
      setNotice('Failed to complete job');
      setTimeout(() => setNotice(null), 3000);
    }
  };

  /**
   * cancelAnyJob
   * @description Cancel a job using GameContext.cancelJob.
   */
  const cancelAnyJob = (jobId: string) => {
    try {
      cancelJob(jobId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('cancel job error', err);
      setNotice('Failed to cancel job');
      setTimeout(() => setNotice(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Jobs</h1>
          <p className="text-slate-400">Accepted Jobs (canonical) · Current Deliveries (in-flight)</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-slate-300">
            {acceptedJobs.length + currentDeliveries.length} visible job(s)
          </div>
          <div className="bg-slate-800 rounded p-2 flex items-center space-x-2 border border-slate-700">
            <Truck className="w-5 h-5 text-slate-300" />
            <div className="text-sm text-slate-300">User: {gameState.currentUser}</div>
          </div>
        </div>
      </div>

      {/* Transient notice (replaces native alert) */}
      {notice && (
        <div className="bg-amber-500/10 text-amber-200 border border-amber-500/20 rounded p-3 text-sm">
          {notice}
        </div>
      )}

      {/* Accepted Jobs (stacked above deliveries) */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Accepted Jobs</h2>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <JobList
            jobs={acceptedJobs}
            onStartDelivery={(id) => startDelivery(id)}
            onComplete={completeAnyJob}
            onCancel={cancelAnyJob}
          />
        </div>
      </section>

      {/* Visible separator line */}
      <div aria-hidden className="border-t-2 border-slate-600/60 my-6" />

      {/* Current Deliveries */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Current Deliveries</h2>
          <div className="text-sm text-slate-400">{currentDeliveries.length} active</div>
        </div>

        {currentDeliveries.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center text-slate-400">
            No active deliveries right now.
          </div>
        ) : (
          <div className="space-y-4">
            {currentDeliveries.map((job: any) => (
              <JobCard
                key={job.id}
                job={job}
                onComplete={completeAnyJob}
                onCancel={cancelAnyJob}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default JobsPage;
