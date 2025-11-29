/**
 * AcceptedJobCompact.tsx
 *
 * Compact row for an accepted job with Details toggle.
 *
 * Responsibilities:
 * - Render a compact summary for an active job (title, route, load, status).
 * - Provide a "Details" button to expand into the full job card (shows LoadInfo, assigned truck & driver, actions).
 * - Keep the compact row minimal: no inline truck text, no "Select" button, and no small id/domain text.
 */

import React, { useState } from 'react';
import LoadInfo from '../../components/jobs/LoadInfo';
import { CheckCircle, X } from 'lucide-react';

/**
 * JobAny
 * @description Minimal job shape used by this component.
 */
interface JobAny {
  id: string;
  title?: string;
  status?: string;
  progress?: number;
  origin?: string;
  destination?: string;
  weight?: number;
  tons?: number;
  cargoWeight?: number;
  deliveredTons?: number;
  assignedTruck?: string;
  assignedDriver?: string;
  assignedTrailer?: string;
  deadline?: string;
}

/**
 * AcceptedJobCompactProps
 * @description Props for the AcceptedJobCompact component.
 */
interface AcceptedJobCompactProps {
  job: JobAny;
  company: any;
  onAssignTruck: (jobId: string, truckId: string) => void;
  onCancel: (jobId: string) => void;
}

/**
 * getStatusColor
 * @description Return background/text classes for a job status badge.
 */
function getStatusColor(status?: string) {
  switch (status) {
    case 'preparing':
      return 'text-gray-300 bg-gray-700/40';
    case 'picking-up':
      return 'text-purple-400 bg-purple-400/10';
    case 'loading':
      return 'text-yellow-400 bg-yellow-400/10';
    case 'delivering':
      return 'text-blue-400 bg-blue-400/10';
    case 'unloading':
      return 'text-orange-400 bg-orange-400/10';
    case 'completed':
      return 'text-green-400 bg-green-400/10';
    case 'cancelled':
      return 'text-red-400 bg-red-400/10';
    default:
      return 'text-slate-400 bg-slate-400/10';
  }
}

/**
 * getStatusIcon
 * @description Small icon for a job status badge.
 */
function getStatusIcon(status?: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'cancelled':
      return <X className="w-4 h-4 text-red-400" />;
    default:
      return <div className="w-2 h-2 rounded-full bg-slate-400/70" />;
  }
}

/**
 * AcceptedJobCompact
 * @description Compact one-line representation of an active job with expandable details.
 */
const AcceptedJobCompact: React.FC<AcceptedJobCompactProps> = ({
  job,
  company,
  onAssignTruck,
  onCancel,
}) => {
  const [expanded, setExpanded] = useState(false);

  const totalTons = Number(job.weight || job.tons || job.cargoWeight || 0);
  const assignedTruckObj = Array.isArray(company?.trucks)
    ? company!.trucks.find((t: any) => t.id === job.assignedTruck)
    : null;
  const driverObj = Array.isArray(company?.staff)
    ? company!.staff.find((s: any) => s.id === job.assignedDriver)
    : null;

  /**
   * toggleExpanded
   * @description Toggle the details expansion for this row.
   */
  const toggleExpanded = () => setExpanded((v) => !v);

  return (
    <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
      {/* Compact row */}
      <div className="flex items-center justify-between space-x-4">
        <div className="min-w-0 flex items-center space-x-3">
          {/* Removed small id/domain text here to keep compact row minimal per request. */}
          <div className="min-w-0">
            <div className="text-white font-medium truncate">{job.title || 'Transport Contract'}</div>
            <div className="text-xs text-slate-400 truncate">{job.origin || 'Unknown'} → {job.destination || 'Unknown'}</div>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-4">
          <div className="text-xs text-slate-400">Load</div>
          <div className="text-white font-semibold">{totalTons.toFixed(1)} t</div>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
            {getStatusIcon(job.status)}
            <span className="ml-1">{job.status}</span>
          </div>

          {/* Details control (kept). No inline truck text and no "Select" button in compact row. */}
          <button
            onClick={toggleExpanded}
            className="bg-slate-700 text-white px-2 py-1 rounded text-xs"
            aria-expanded={expanded}
            aria-label={expanded ? 'Hide details' : 'Show details'}
          >
            {expanded ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>

      {/* Expanded details (revealed when Details clicked) */}
      {expanded && (
        <div className="mt-4 border-t border-slate-700 pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <LoadInfo
              totalTons={totalTons}
              truckTons={assignedTruckObj && typeof assignedTruckObj.capacity === 'number' ? Math.min(assignedTruckObj.capacity, totalTons) : 0}
              remainingTons={Math.max(0, totalTons - (job.deliveredTons || 0))}
            />
          </div>

          <div>
            <div className="mb-2 text-slate-400 text-sm">Assigned Truck</div>
            <div className="flex items-center justify-between">
              <div className="text-white font-medium">{assignedTruckObj ? `${assignedTruckObj.brand} ${assignedTruckObj.model}` : 'Unassigned'}</div>
            </div>

            <div className="mt-3">
              <div className="text-slate-400 text-sm">Driver</div>
              <div className="text-white font-medium mt-1">{driverObj?.name || 'Unassigned'}</div>
            </div>

            <div className="mt-4 flex space-x-2">
              <button onClick={() => onCancel(job.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcceptedJobCompact;