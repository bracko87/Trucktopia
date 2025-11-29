/**
 * JobList.tsx
 *
 * Small list component to render an array of jobs using JobCard.
 *
 * Responsibilities:
 * - Map jobs -> JobCard
 * - Provide a minimal empty state
 */

import React from 'react';
import JobCard from './JobCard';
import type { ActiveJob } from '../../types/game';

export interface JobListProps {
  /**
   * jobs - array of jobs to display
   */
  jobs: Array<ActiveJob | any>;
  onAssignTruck?: (jobId: string, truckId: string) => void;
  onStartDelivery?: (jobId: string) => void;
  onComplete?: (jobId: string) => void;
  onCancel?: (jobId: string) => void;
}

/**
 * JobList
 * @description Render a vertical list of JobCard components.
 */
const JobList: React.FC<JobListProps> = ({ jobs, onAssignTruck, onStartDelivery, onComplete, onCancel }) => {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center text-slate-400">
        No jobs to display.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((j: any) => (
        <JobCard
          key={j.id}
          job={j}
          onAssignTruck={onAssignTruck}
          onStartDelivery={onStartDelivery}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
};

export default JobList;