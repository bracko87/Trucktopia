/**
 * TrailerCard.tsx
 *
 * Presentational card for a trailer used across fleet views.
 *
 * Responsibilities:
 * - Render trailer summary (brand, model, class, condition, location, ETA).
 * - Render cargo-type chips and actions (sell, show details).
 * - Gray out the entire card visually when the trailer is delivering (non-available),
 *   matching the truck behaviour: use grayscale + reduced opacity.
 *
 * Notes:
 * - Uses determineAvailability() from utils so status computation is shared with trucks.
 * - Hides the inline "Class" label when the class value is a placeholder (—, - or empty).
 */

import React from 'react';
import { Package, Trash2, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import SpecsModal from './SpecsModal';
import { determineAvailability, AvailabilityResult } from '../../utils/vehicleAvailability';

/**
 * TrailerCardData
 * @description Minimal data shape expected by TrailerCard. Allows extra fields.
 */
export interface TrailerCardData {
  id: string;
  brand?: string;
  model?: string;
  trailerClass?: string | null;
  capacity?: number | string | null;
  tonnage?: number | null;
  year?: number | null;
  condition?: number | null;
  status?: string | null;
  deliveryHub?: { id?: string; name?: string } | string | null;
  deliveryEta?: string | null;
  kilometers?: number | null;
  gcw?: string | number | null;
  nickname?: string | null;
  insured?: boolean | null;
  specifications?: Record<string, any> | null;
  marketEntry?: any;
  [key: string]: any;
}

/**
 * Props
 * @description Component props for TrailerCard.
 */
interface Props {
  trailer: TrailerCardData;
  isAssigned?: boolean;
  onSell: (trailerId: string) => void;
  cargoTypes?: string[];
}

/**
 * formatStatusText
 * @description Map raw availability status text into canonical labels used across UI.
 *              Ensures exact strings: Non-Available (When Delivering), Available, On-Job, Maintenance, Broken
 * @param raw raw status text
 */
function formatStatusText(raw: string | undefined | null): string {
  const s = String(raw ?? '').trim();
  if (!s) return 'Available';

  if (/broken/i.test(s) || /damaged/i.test(s) || /repair/i.test(s)) return 'Broken';
  if (/maintenance/i.test(s) || /servicing/i.test(s) || /service/i.test(s)) return 'Maintenance';
  if (/deliver|incoming|in-?transit|transit|delivering/i.test(s)) return 'Non-Available (When Delivering)';
  if (/on\s?job|on-job|on_job|assigned|onroute|on route/i.test(s)) return 'On-Job';
  if (/available/i.test(s)) return 'Available';

  return s;
}

/**
 * buildTrailerSpecs
 * @description Try to build a normalized specifications object for the provided trailer by
 *              inspecting common locations (specifications, marketEntry.specifications, direct fields).
 * @param t TrailerCardData
 */
function buildTrailerSpecs(t: TrailerCardData) {
  const specs: Record<string, any> = {
    ...(t.specifications ?? t.specs ?? t.marketEntry?.specifications ?? {}),
  };

  if (t.capacity !== undefined && t.capacity !== null) specs.capacity = specs.capacity ?? t.capacity;
  if (t.tonnage !== undefined && t.tonnage !== null) specs.tonnage = specs.tonnage ?? t.tonnage;
  if (t.gcw !== undefined && t.gcw !== null) specs.gcw = specs.gcw ?? t.gcw;
  if (t.kilometers !== undefined && t.kilometers !== null) specs.kilometers = specs.kilometers ?? t.kilometers;
  if (t.condition !== undefined && t.condition !== null) specs.condition = specs.condition ?? t.condition;
  if (t.trailerClass !== undefined && t.trailerClass !== null) specs.trailerClass = specs.trailerClass ?? t.trailerClass;

  if (t.deliveryEta) specs.deliveryEta = specs.deliveryEta ?? t.deliveryEta;
  if (t.deliveryHub) specs.deliveryHub = specs.deliveryHub ?? t.deliveryHub;

  if ((t as any).payload && !specs.capacity) specs.capacity = (t as any).payload;
  if ((t as any).maxPayload && !specs.capacity) specs.capacity = (t as any).maxPayload;

  specs._raw = { ...(specs._raw ?? {}), ...(t.marketEntry?.specifications ?? {}), ...t };

  return specs;
}

/**
 * pickFirstSpec
 * @description Utility to try multiple candidate keys inside a specs object and return first non-null.
 * @param specs normalized specs object
 * @param keys candidate keys
 */
function pickFirstSpec(specs: Record<string, any> | null, keys: string[]) {
  if (!specs) return null;
  for (const k of keys) {
    const parts = k.split('.');
    let v: any = specs;
    for (const p of parts) {
      if (v == null) break;
      v = v?.[p];
    }
    if (v !== undefined && v !== null && v !== '') return v;
  }

  const raw = specs._raw ?? {};
  for (const k of keys) {
    const parts = k.split('.');
    let v: any = raw;
    for (const p of parts) {
      if (v == null) break;
      v = v?.[p];
    }
    if (v !== undefined && v !== null && v !== '') return v;
  }

  return null;
}

/**
 * extractCargoTypes
 * @description Best-effort extraction of cargo types from normalized specs.
 * @param specs normalized specs
 */
function extractCargoTypes(specs: Record<string, any> | null): string[] {
  if (!specs) return [];
  const candidates = [
    specs.cargoTypes ?? specs.cargo_types ?? specs.specifications?.cargoTypes ?? specs._raw?.cargoTypes ?? specs._raw?.specifications?.cargoTypes,
    specs.allowedCargo ?? specs.allowed_cargo ?? specs._raw?.allowedCargo,
    specs.categories ?? specs._raw?.categories,
  ];

  const out = new Set<string>();
  for (const cand of candidates) {
    if (!cand) continue;
    if (Array.isArray(cand)) {
      for (const v of cand) {
        if (typeof v === 'string' && v.trim()) out.add(v.trim());
        else if (typeof v === 'object' && v?.label) out.add(String(v.label).trim());
      }
    } else if (typeof cand === 'string') {
      cand.split(/[,/|;]/).map(s => s.trim()).filter(Boolean).forEach(s => out.add(s));
    } else if (typeof cand === 'object') {
      for (const k of Object.keys(cand)) {
        if (cand[k]) out.add(k);
      }
    }
  }

  return Array.from(out).slice(0, 8);
}

/**
 * TrailerCard
 * @description Visual card for a trailer.
 */
const TrailerCard: React.FC<Props> = ({ trailer, isAssigned = false, onSell, cargoTypes: externalCargoTypes }) => {
  const [expanded, setExpanded] = React.useState<boolean>(false);
  const [showSpecs, setShowSpecs] = React.useState<boolean>(false);
  const [insured, setInsured] = React.useState<boolean>(Boolean(trailer?.insured ?? false));
  const [nickname, setNickname] = React.useState<string | null>(trailer?.nickname ?? null);

  const title = trailer.brand ?? trailer.model ?? trailer.trailerClass ?? 'Trailer';
  const subtitle = trailer.model ?? trailer.trailerClass ?? '';
  const capacityField = trailer.capacity ?? trailer.tonnage ?? null;
  const condition = typeof trailer.condition === 'number' ? `${trailer.condition}%` : '—';
  const kilometers = typeof trailer.kilometers === 'number' ? `${trailer.kilometers.toLocaleString()} km` : '-';

  const hub =
    typeof trailer.deliveryHub === 'string'
      ? trailer.deliveryHub
      : trailer.deliveryHub?.name ?? trailer.deliveryHub?.id ?? null;

  const normalizedSpecs = React.useMemo(() => buildTrailerSpecs(trailer), [trailer]);

  const technicalCapacity = pickFirstSpec(normalizedSpecs, ['capacity', 'maxPayload', 'max_payload', 'payload', 'tonnage', 'specs.capacity']) ?? capacityField ?? '—';

  const cargoTypes = React.useMemo(() => {
    if (Array.isArray(externalCargoTypes) && externalCargoTypes.length > 0) return externalCargoTypes;
    return extractCargoTypes(normalizedSpecs);
  }, [normalizedSpecs, externalCargoTypes]);

  /**
   * classValue & display logic
   * Compute a meaningful class value and decide whether to show it.
   */
  const rawClassValue = pickFirstSpec(normalizedSpecs, ['trailerClass', 'trailer_class', 'class']) ?? trailer.trailerClass ?? normalizedSpecs.trailerClass;
  const classValue = rawClassValue == null ? null : String(rawClassValue).trim();
  const shouldShowClass = Boolean(classValue) && classValue !== '—' && classValue !== '-' && classValue !== '— ';

  /**
   * availability - shared with trucks
   */
  const availability: AvailabilityResult = React.useMemo(() => determineAvailability(trailer, Boolean(isAssigned)), [trailer, isAssigned]);
  const displayStatus = formatStatusText(availability.statusText);

  /**
   * handleSell
   * @description Forward the sell event.
   */
  const handleSell = (id: string) => {
    onSell(id);
  };

  /**
   * handleEditNickname - update local and emit event
   */
  const handleEditNickname = () => {
    try {
      // eslint-disable-next-line no-alert
      const input = window.prompt('Edit trailer nickname', nickname ?? '');
      if (input === null) return;
      const trimmed = input.trim();
      setNickname(trimmed === '' ? null : trimmed);
      try {
        const ev = new CustomEvent('trailer-nickname-updated', {
          detail: { id: trailer.id, nickname: trimmed === '' ? null : trimmed },
        });
        window.dispatchEvent(ev);
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  };

  /**
   * handleServiceCheck - non-destructive UI placeholder
   */
  const handleServiceCheck = () => {
    // eslint-disable-next-line no-alert
    alert(`Service check requested for trailer ${trailer.id ?? ''}`);
  };

  /**
   * handleToggleInsured - toggle and emit event
   */
  const handleToggleInsured = () => {
    const next = !insured;
    setInsured(next);
    try {
      const ev = new CustomEvent('trailer-insurance-toggled', {
        detail: { id: trailer.id, insured: next },
      });
      window.dispatchEvent(ev);
    } catch {
      // ignore
    }
  };

  /**
   * root class: gray out when delivering (non-available when delivering)
   * This mirrors truck behaviour: apply a subtle grayscale + opacity reduction.
   */
  const rootClassName = `bg-slate-700 rounded-lg p-4 border border-slate-600 w-full ${availability.isDelivering ? 'filter grayscale opacity-60' : ''}`;

  return (
    <>
      <div className={rootClassName} data-vehicle-id={trailer.id}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="truncate">
                <div className="text-sm font-medium text-white truncate">
                  {title}
                  <span className="text-slate-400 font-normal">{subtitle ? ` ${subtitle}` : ''}</span>
                </div>

                {nickname ? (
                  <div className="text-xs text-slate-300 mt-1">
                    Nickname: <span className="text-slate-200 ml-1">{nickname}</span>
                  </div>
                ) : null}

                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  {shouldShowClass && (
                    <span>
                      Class: <span className="text-slate-200 ml-1">{classValue}</span>
                    </span>
                  )}

                  {cargoTypes.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                      {cargoTypes[0]}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">Year</div>
                <div className="text-sm text-white">{trailer.year ?? '-'}</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
              <div>
                Condition: <span className="text-slate-200 ml-1">{condition}</span>
              </div>
              <div>
                KM: <span className="text-slate-200 ml-1">{kilometers}</span>
              </div>
              <div>
                Location: <span className="text-slate-200 ml-1">{hub ?? '-'}</span>
              </div>
              <div>
                ETA: <span className="text-slate-200 ml-1">{trailer.deliveryEta ? new Date(trailer.deliveryEta).toLocaleString() : '—'}</span>
              </div>
            </div>

            {/* Inline cargo type chips (compact) */}
            {cargoTypes.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {cargoTypes.map((c) => (
                  <div key={c} className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-2">
              <button
                aria-expanded={expanded}
                onClick={() => setExpanded((s) => !s)}
                className="inline-flex items-center space-x-2 bg-slate-600 hover:bg-slate-500 text-slate-100 px-3 py-1 rounded-md text-xs transition-colors"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>{expanded ? 'Hide details' : 'Show details'}</span>
              </button>

              <button
                onClick={() => handleSell(trailer.id)}
                className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-md text-xs transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Sell</span>
              </button>
            </div>
          </div>
        </div>

        {/* Expanded details content */}
        {expanded && (
          <div className="mt-3">
            <div className="bg-slate-700/60 border border-slate-600 rounded-md p-3 text-sm text-slate-300 flex flex-col">
              <div className="grid grid-cols-2 gap-2">
                {shouldShowClass && (
                  <div>
                    <div className="text-xs text-slate-400">Class</div>
                    <div className="text-sm">{classValue ?? '—'}</div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-slate-400">Capacity</div>
                  <div className="text-sm">{technicalCapacity ?? '—'}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-400">Delivery ETA</div>
                  <div className="text-sm">{trailer.deliveryEta ?? '—'}</div>
                </div>

                <div>
                  <div className="text-xs text-slate-400">Status</div>
                  <div className="text-sm">{displayStatus ?? '—'}</div>
                </div>
              </div>

              {/* Action row */}
              <div className="mt-4 border-t border-slate-600 pt-3">
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <button
                    type="button"
                    onClick={handleEditNickname}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Edit nickname
                  </button>

                  <button
                    type="button"
                    onClick={handleServiceCheck}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Service check
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleInsured}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {insured ? 'Marked insured ✓' : 'Mark insured'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSpecs(true)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Trailer Specifications
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Specs Modal */}
      {showSpecs && (
        <SpecsModal
          title={`${trailer.brand ?? ''} ${trailer.model ?? ''}`.trim() || 'Trailer specifications'}
          vehicle={{ ...trailer, specifications: { ...(trailer.specifications ?? {}), ...normalizedSpecs } }}
          specs={normalizedSpecs}
          onClose={() => setShowSpecs(false)}
        />
      )}
    </>
  );
};

export default TrailerCard;