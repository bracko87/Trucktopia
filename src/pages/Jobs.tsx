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

import React, { useMemo } from 'react';
import { useGame } from '../contexts/GameContext';
import JobList from '../components/jobs/JobList';
import JobCard from '../components/jobs/JobCard';
import { Truck } from 'lucide-react';

/**
 * JobsPage
 * @description Main page component for jobs: accepted jobs appear first, deliveries follow.
 */
const JobsPage: React.FC = () => {
  const { gameState, createCompany, completeJob, cancelJob } = useGame();
  const company = gameState?.company;

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
   */
  const startDelivery = (parentJobId: string) => {
    try {
      const parent = (company.activeJobs || []).find((j: any) => j.id === parentJobId && !j.parentJobId);
      if (!parent) {
        alert('Parent job not found');
        return;
      }

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
      alert('Delivery started.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('startDelivery error', err);
      alert('Failed to start delivery');
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
      alert('Failed to complete job');
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
      alert('Failed to cancel job');
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
