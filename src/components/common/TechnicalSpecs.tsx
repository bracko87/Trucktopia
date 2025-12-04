/**
 * TechnicalSpecs.tsx
 *
 * Reusable component that renders a vehicle/trailer technical specifications block.
 *
 * Responsibilities:
 * - Fetch specs from data files using fetchVehicleSpecs when modelId is provided.
 * - Accept inline 'overrideData' to display data already loaded by parent.
 * - Render a grid with the same structure and classes as the UI snippet provided.
 *
 * Usage:
 * <TechnicalSpecs modelId={truck.modelId} />
 * or
 * <TechnicalSpecs overrideData={{ capacity: '3.5 t', engine: '2.0 l', ... }} />
 */

import React, { useEffect, useState } from 'react';
import { Package, Cpu, ShieldCheck, Star, Zap, ArrowRight, Wrench } from 'lucide-react';
import type { VehicleSpecs } from '../../utils/specsFetcher';
import { fetchVehicleSpecs } from '../../utils/specsFetcher';

interface Props {
  /**
   * modelId
   * @description Optional model identifier used to lookup specs in data files.
   */
  modelId?: string;
  /**
   * overrideData
   * @description If provided, used directly without lookup. Partial specs are allowed.
   */
  overrideData?: Partial<VehicleSpecs>;
  /**
   * className
   * @description Optional extra className for the wrapper.
   */
  className?: string;
}

/**
 * TechnicalSpecs
 * @description Component that renders technical specification rows. Values are read
 * from overrideData first, then attempted from the data files via modelId.
 */
const TechnicalSpecs: React.FC<Props> = ({ modelId, overrideData = {}, className = '' }) => {
  const [specs, setSpecs] = useState<VehicleSpecs | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!modelId) {
      setSpecs({ ...(overrideData as VehicleSpecs) });
      return;
    }

    // If overrides provide all fields, don't attempt fetch
    const hasAll = overrideData && Object.keys(overrideData).length > 0;
    if (hasAll) {
      setSpecs({ ...(overrideData as VehicleSpecs) });
      return;
    }

    setLoading(true);
    fetchVehicleSpecs(modelId)
      .then((res) => {
        if (!mounted) return;
        const merged = { ...(overrideData as VehicleSpecs), ...res };
        setSpecs(merged);
      })
      .catch(() => {
        if (!mounted) return;
        setSpecs(overrideData as VehicleSpecs || {});
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [modelId, JSON.stringify(overrideData)]);

  /**
   * display
   * @description Small helper to choose visible value with fallback
   */
  const display = (key: keyof VehicleSpecs) => {
    if (overrideData && overrideData[key] !== undefined && overrideData[key] !== null) return String(overrideData[key]);
    if (!specs) return loading ? 'Loading…' : '—';
    const v = specs[key];
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
  };

  return (
    <div className={`bg-slate-700 border border-slate-600 rounded-lg p-4 ${className}`}>
      <div className="text-sm text-slate-300 mb-2">Technical Specifications</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Capacity (Max payload)</div>
            <div className="text-sm text-white font-medium">{display('capacity')}</div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Engine</div>
            <div className="text-sm text-white font-medium">{display('engine')}</div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Reliability</div>
            <div className="text-sm text-white font-medium">{display('reliability')}</div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Star className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Durability</div>
            <div className="text-sm text-white font-medium">{display('durability')}</div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Fuel Consumption (avg)</div>
            <div className="text-sm text-white font-medium">{display('fuelConsumption')}</div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <ArrowRight className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Max speed</div>
            <div className="text-sm text-white font-medium">{display('maxSpeed')}</div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Maintenance Group</div>
            <div className="text-sm text-white font-medium">{display('maintenanceGroup')}</div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="p-2 rounded bg-slate-800 text-slate-300">
            <Star className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Production Year</div>
            <div className="text-sm text-white font-medium">{display('year')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicalSpecs;