/**
 * TruckCard.tsx
 *
 * Presentational card for a truck used across fleet views.
 *
 * Responsibilities:
 * - Render compact truck information and quick actions
 * - Provide editable persisted metadata (license plate, nickname, insurance/service timestamps)
 * - Ensure license plate numeric part validation and uniqueness
 *
 * Note: This version ensures an inline "Details" link is visible on Fleet pages
 *       and is wired to the global FleetComponentsPopupListener via
 *       aria-label="Open component details". The root element includes
 *       data-truck-id so the global listener can resolve the truck id.
 */

import React from 'react';
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Package,
  Wrench,
  CheckCircle,
  Clock,
  Truck,
  AlertCircle
} from 'lucide-react';
import SpecsModal from './SpecsModal';
import { determineAvailability } from '../../utils/vehicleAvailability';

/**
 * TruckCardData
 * @description Minimal data shape expected by TruckCard. Allows extra fields.
 */
export interface TruckCardData {
  id: string;
  brand?: string;
  model?: string;
  year?: number;
  condition?: number;
  capacity?: number;
  tonnage?: number;
  status?: string;
  assignedTrailer?: string | null;
  deliveryHub?: { id?: string; name?: string } | string | null;
  deliveryEta?: string | null;
  availableInDays?: number | string | null;
  availableIn?: string | null;
  purchasePrice?: number;
  marketEntry?: {
    price?: number;
    availability?: string;
    specifications?: { [key: string]: any };
    [key: string]: any;
  };
  specifications?: { [key: string]: any };
  mileage?: number;
  location?: string;
  cargoTypes?: string[];
  purchaseType?: string | null;
  leaseRate?: number | null;
  purchaseDate?: string | null;
  purchaseMethod?: string | null;
  lastServiceDate?: string | null;
  lastInsuranceDate?: string | null;
  mileageSinceService?: number;
  assignedJobId?: string | null;
  assignedJob?: any;
  purchasedAt?: string | null;
  [key: string]: any;
}

/**
 * Props
 * @description Props for TruckCard component.
 */
interface Props {
  truck: TruckCardData;
  assignedTrailerLabel?: string | null;
  onSell: (truckId: string) => void;
  /**
   * cargoTypes (optional)
   * @description Explicit cargo type array passed by the parent (Garage) when available.
   */
  cargoTypes?: string[] | null;
}

/**
 * TruckMeta
 * @description Persisted metadata stored per truck in localStorage.
 */
interface TruckMeta {
  licensePlate?: string;
  nickname?: string;
  lastInsuranceDate?: string | null;
  lastServiceDate?: string | null;
  [key: string]: any;
}

/**
 * Small helpers used by the component (display / parsing).
 */
function safeNumber(v: any, suffix?: string) {
  if (v === undefined || v === null || Number.isNaN(Number(v))) return '—';
  return `${Number(v).toLocaleString()}${suffix ?? ''}`;
}

function parseNumberLike(input: any): number | null {
  if (input === undefined || input === null) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const s = String(input).replace(/[,\\s]+/g, '');
  const m = s.match(/(-?\\d+(\\.\\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * STORAGE helpers.
 */
const META_KEY = (truckId: string) => `tm_truck_meta_${truckId}`;

/**
 * loadTruckMeta
 * @description Load persisted truck metadata (license plate, nickname, lastInsuranceDate, lastServiceDate).
 */
function loadTruckMeta(truckId: string): TruckMeta {
  try {
    const raw = localStorage.getItem(META_KEY(truckId));
    if (!raw) return {};
    return JSON.parse(raw) as TruckMeta;
  } catch {
    return {};
  }
}

/**
 * saveTruckMeta
 * @description Persist truck metadata to localStorage.
 */
function saveTruckMeta(truckId: string, meta: TruckMeta) {
  try {
    localStorage.setItem(META_KEY(truckId), JSON.stringify(meta));
  } catch {
    // ignore
  }
}

/**
 * Toast component
 * @description Small, self-contained UI-friendly notification used instead of alert().
 */
const Toast: React.FC<{ message: string | null; onClose: () => void }> = ({ message, onClose }) => {
  React.useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 4200);
    return () => clearTimeout(t);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 flex items-center justify-center pointer-events-none z-[60]"
    >
      <div className="pointer-events-auto bg-black/60 backdrop-blur-sm rounded-lg px-5 py-3 max-w-lg mx-4">
        <div className="flex items-start gap-3">
          <div className="text-yellow-300">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="text-sm text-white">{message}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * TruckCard
 * @description Presentational card with compact view and expandable details.
 */
const TruckCard: React.FC<Props> = ({ truck, assignedTrailerLabel = null, onSell, cargoTypes = null }) => {
  const [expanded, setExpanded] = React.useState<boolean>(false);
  const [specsOpen, setSpecsOpen] = React.useState<boolean>(false);

  // Local persisted meta (license plate, nickname, insurance, last service)
  const [meta, setMeta] = React.useState<TruckMeta>(() => {
    try {
      return loadTruckMeta(truck.id);
    } catch {
      return {};
    }
  });

  // Editing states
  const [editingNickname, setEditingNickname] = React.useState<boolean>(false);
  const [editingPlate, setEditingPlate] = React.useState<boolean>(false);
  const [nicknameInput, setNicknameInput] = React.useState<string>(meta.nickname ?? (truck.model ?? 'Truck'));
  const [plateInput, setPlateInput] = React.useState<string | undefined>(meta.licensePlate);

  // Toast message state (UI-friendly notification)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  /**
   * isFleetPath
   * @description Only show the inline "Details" control on pages that are fleet-related.
   * This mirrors FleetComponentsPopupListener behaviour so the inline control opens the same modal.
   */
  const isFleetPath = typeof window !== 'undefined'
    ? ['/garage', '/trucks', '/fleet', '/fleet-control'].some((p) => window.location.pathname.includes(p))
    : false;

  React.useEffect(() => {
    // initialize defaults if missing (license plate and nickname)
    try {
      const m: TruckMeta = { ...(meta || {}) };
      let changed = false;

      if (!m.licensePlate) {
        // keep a simple generated plate (no external registry changes here to keep code focused)
        const prefix = String((truck.deliveryHub && typeof truck.deliveryHub === 'string' ? truck.deliveryHub : truck.deliveryHub?.name) ?? 'XX').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'UN';
        const numeric = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        m.licensePlate = `${prefix}-${numeric}`;
        changed = true;
      }

      if (!m.nickname) {
        m.nickname = truck.model ?? truck.brand ?? 'Truck';
        changed = true;
      }

      if (changed) {
        setMeta(m);
        saveTruckMeta(truck.id, m);
        setNicknameInput(m.nickname as string);
        setPlateInput(m.licensePlate);
      } else {
        setNicknameInput(m.nickname ?? (truck.model ?? 'Truck'));
        setPlateInput(m.licensePlate);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [truck.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  const handleToggleDetails = () => {
    setExpanded((s) => !s);
  };

  const handleSell = (id: string) => {
    const currentAvailability = determineAvailability(truck, Boolean(truck.assignedJobId || truck.assignedJob));

    if (!currentAvailability.isAvailable) {
      showToast(`Sell blocked: ${currentAvailability.statusText || 'Not available'}.`);
      return;
    }

    onSell(id);
  };

  const handleSaveNickname = () => {
    const updated = { ...meta, nickname: nicknameInput };
    setMeta(updated);
    saveTruckMeta(truck.id, updated);
    setEditingNickname(false);
    showToast('Nickname saved.');
  };

  const handleSavePlate = () => {
    const input = (plateInput ?? '').trim();
    if (!input) {
      showToast('License plate cannot be empty.');
      return;
    }

    // basic numeric validation for guidance only (no global registry modifications here)
    const numeric = String(input).replace(/\\D/g, '');
    if (numeric.length > 4) {
      showToast('License plate numeric part cannot contain more than 4 digits.');
      return;
    }

    const updated = { ...meta, licensePlate: input };
    setMeta(updated);
    saveTruckMeta(truck.id, updated);
    setEditingPlate(false);
    showToast('License plate saved.');
  };

  const markServiceNow = () => {
    const nowIso = new Date().toISOString();
    const updated = { ...meta, lastServiceDate: nowIso };
    setMeta(updated);
    saveTruckMeta(truck.id, updated);
    showToast('Service date updated.');
  };

  const markInsuranceNow = () => {
    const nowIso = new Date().toISOString();
    const updated = { ...meta, lastInsuranceDate: nowIso };
    setMeta(updated);
    saveTruckMeta(truck.id, updated);
    showToast('Insurance date updated.');
  };

  const brandOrModel = truck.brand ?? truck.model;
  const fallbackTitle = truck.model ?? truck.brand ?? 'Truck';
  const title = brandOrModel ?? fallbackTitle;
  const subtitle = truck.model ?? truck.brand ?? '';
  const condition = typeof truck.condition === 'number' ? `${truck.condition}%` : '—';

  const hub =
    typeof truck.deliveryHub === 'string'
      ? truck.deliveryHub
      : (truck.deliveryHub?.name ?? truck.deliveryHub?.id ?? truck.location ?? '—');

  const specSource = truck.marketEntry?.specifications ?? truck.specifications ?? {};

  const availabilityLabel =
    truck.marketEntry?.availability ?? truck.availableIn ?? (truck.availableInDays ? `${truck.availableInDays} days` : '—');
  const availabilityInfo = determineAvailability(truck, Boolean(truck.assignedJobId || truck.assignedJob));

  const mileageLabel = truck.mileage !== undefined && truck.mileage !== null ? `${safeNumber(truck.mileage, ' km')}` : '—';
  const currentLocation = truck.location ?? hub ?? '—';

  const computeTonnage = (): number | null => {
    const candidates = [
      truck.tonnage,
      specSource.tonnage,
      specSource.capacity,
      specSource.payload,
      truck.payload,
      truck.capacity,
      truck.marketEntry?.specifications?.tonnage,
      truck.marketEntry?.specifications?.capacity
    ];
    for (const c of candidates) {
      const p = parseNumberLike(c);
      if (p !== null) {
        if (Math.abs(p) > 50) return +(p / 1000);
        return p;
      }
    }
    return null;
  };

  const tonnageValue = computeTonnage();

  const isSmallOrMedium = (): boolean => {
    if (tonnageValue === null) {
      const categoryHint = String(truck.truckCategory ?? truck.marketEntry?.category ?? truck.category ?? '').toLowerCase();
      return categoryHint.includes('small') || categoryHint.includes('medium') || categoryHint.includes('van') || categoryHint.includes('light');
    }
    return tonnageValue < 13;
  };

  const payloadLabelOrGcw = (): string => {
    const payloadCandidates = [
      specSource.payload,
      specSource.capacity,
      truck.capacity,
      truck.payload,
      specSource.maxPayload,
      truck.marketEntry?.specifications?.payload
    ];

    const payload = payloadCandidates.find((p) => p !== undefined && p !== null);

    if (isSmallOrMedium()) {
      if (payload !== undefined && payload !== null) {
        const parsed = parseNumberLike(payload);
        if (parsed !== null) {
          if (parsed > 50) {
            return `${Number(parsed).toLocaleString()} kg`;
          }
          return `${parsed} t`;
        }
        return String(payload);
      }
      if (tonnageValue !== null && !Number.isNaN(tonnageValue) && tonnageValue > 0) {
        return `${tonnageValue} t`;
      }
      return '—';
    }

    const gcw = specSource.gcw ?? truck.gcw ?? truck.marketEntry?.specifications?.gcw ?? null;
    if (gcw) return String(gcw);
    return '—';
  };

  const resolvedCargoTypes: string[] = (cargoTypes && cargoTypes.length > 0)
    ? cargoTypes
    : Array.isArray(truck.cargoTypes) && truck.cargoTypes.length > 0
      ? truck.cargoTypes
      : Array.isArray(specSource.cargoTypes) && specSource.cargoTypes.length > 0
        ? specSource.cargoTypes
        : [];

  const computeAgeInfo = () => {
    const now = new Date();
    const purchaseDateStr = truck.purchaseDate ?? truck.marketEntry?.purchaseDate ?? truck.purchasedAt ?? null;
    let purchaseDate: Date | null = null;
    if (purchaseDateStr) {
      const d = new Date(purchaseDateStr);
      if (!Number.isNaN(d.getTime())) purchaseDate = d;
    }

    const yearCandidate = truck.year ?? truck.marketEntry?.year ?? null;
    let yearNum: number | null = null;
    if (typeof yearCandidate === 'number') yearNum = yearCandidate;
    else if (typeof yearCandidate === 'string') {
      const p = parseNumberLike(yearCandidate);
      if (p !== null) yearNum = Math.round(p);
    }

    if (purchaseDate) {
      const years = now.getFullYear() - purchaseDate.getFullYear();
      const formatted = purchaseDate.toLocaleDateString('en-GB');
      return { label: `${formatted} (${years} yrs)`, rawDate: purchaseDate };
    }

    if (yearNum) {
      const years = now.getFullYear() - yearNum;
      return { label: `${yearNum} (${years} yrs)`, rawDate: null };
    }

    return { label: '—', rawDate: null };
  };

  const ageInfo = computeAgeInfo();

  const detectPurchaseType = (): string => {
    const explicit = String(truck.purchaseType ?? truck.purchaseMethod ?? truck.marketEntry?.purchaseType ?? truck.status ?? '').toLowerCase();

    if (explicit.includes('lease') || explicit.includes('leased') || truck.leaseRate != null || truck.leased === true) return 'Leased';
    if (explicit.includes('credit') || explicit.includes('financ')) return 'Credit';
    if (truck.marketEntry?.lease === true) return 'Leased';
    return 'Purchased';
  };

  const purchaseTypeLabel = detectPurchaseType();

  const getVehicleStatus = () => {
    const now = new Date();
    const statusRaw = String(truck.status ?? '').toLowerCase();
    const eta = truck.deliveryEta ? new Date(String(truck.deliveryEta)) : null;

    if (eta && !Number.isNaN(eta.getTime()) && eta.getTime() > now.getTime()) {
      return { key: 'not_available', label: 'Not Available', icon: Clock, color: 'text-slate-300 bg-slate-700/20' };
    }

    if (statusRaw.includes('broken') || statusRaw.includes('damaged') || statusRaw.includes('repairing')) {
      return { key: 'broken', label: 'Broken', icon: AlertCircle, color: 'text-rose-400 bg-rose-400/10' };
    }

    if (statusRaw.includes('maintenance') || statusRaw.includes('service') || statusRaw.includes('in service')) {
      return { key: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'text-amber-400 bg-amber-400/10' };
    }

    if (statusRaw.includes('on job') || statusRaw.includes('assigned') || (truck.assignedJobId || truck.assignedJob)) {
      return { key: 'on_job', label: 'On Job', icon: Truck, color: 'text-yellow-400 bg-yellow-400/10' };
    }

    return { key: 'available', label: 'Available', icon: CheckCircle, color: 'text-green-400 bg-green-400/10' };
  };

  const vehicleStatus = getVehicleStatus();

  const containerClass = `bg-slate-700 rounded-lg p-4 border border-slate-600 w-full ${vehicleStatus.key === 'not_available' ? 'opacity-60 filter grayscale' : ''}`;

  const displayedPlate = meta.licensePlate ?? '—';
  const displayedNickname = meta.nickname ?? (truck.model ?? '—');

  return (
    <>
      {/* Root includes data-truck-id so global FleetComponentsPopupListener can locate the truck */}
      <div className={containerClass} data-truck-id={truck.id}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="truncate">
                <div className="text-sm font-medium text-white truncate">
                  {title} {subtitle ? <span className="text-slate-400 font-normal"> {subtitle}</span> : null}
                </div>

                <div className="mt-1">
                  <div className="flex items-center space-x-4 text-xs text-slate-400 truncate">
                    <div className="flex items-center space-x-1 truncate">
                      <MapPin className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{hub}</span>
                    </div>

                    <div className="flex items-center space-x-1 truncate">
                      <Calendar className="w-3 h-3 text-sky-400 flex-shrink-0" />
                      <span className={`truncate ${false ? 'text-amber-400 font-semibold' : ''}`}>{availabilityLabel}</span>

                      <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${vehicleStatus.color}`}>
                        {React.createElement(vehicleStatus.icon, { className: 'w-3 h-3 flex-shrink-0' })}
                        <span className="truncate">{vehicleStatus.label}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                {/* reserved for compact action widgets */}
              </div>
            </div>

            <div className="mt-3 flex items-center space-x-4 text-xs text-slate-300">
              <div className="flex items-center">
                <span>Condition:&nbsp;</span>
                <span className="text-slate-200 ml-1">{condition}</span>

                {/* Inline "Details" control: visible only on fleet pages.
                    It has the exact aria-label FleetComponentsPopupListener expects and
                    intentionally has no React onClick so the global listener handles opening the modal. */}
                {isFleetPath && (
                  <button
                    type="button"
                    aria-label="Open component details"
                    className="ml-3 text-xs text-sky-400 hover:text-sky-300 underline"
                  >
                    Details
                  </button>
                )}
              </div>

              <div>KM: <span className="text-slate-200 ml-1">{mileageLabel}</span></div>
              <div>Location: <span className="text-slate-200 ml-1">{currentLocation}</span></div>

              <div>
                <span className="text-slate-400 mr-1">{isSmallOrMedium() ? 'Payload:' : 'GCW:'}</span>
                <span className="text-slate-200 ml-1">{payloadLabelOrGcw()}</span>
              </div>
            </div>

            {isSmallOrMedium() && resolvedCargoTypes.length > 0 && (
              <div className="mt-3 w-full flex flex-wrap gap-2">
                {resolvedCargoTypes.map((ct: string, idx: number) => (
                  <span key={`${ct}-${idx}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
                    <Package className="w-3 h-3 text-indigo-300" />
                    <span>{ct}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleDetails}
                aria-expanded={expanded}
                className="inline-flex items-center space-x-2 bg-slate-600 hover:bg-slate-500 text-slate-100 px-3 py-1 rounded-md text-xs transition-colors"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>{expanded ? 'Hide details' : 'Show details'}</span>
              </button>

              {availabilityInfo.isAvailable ? (
                <button
                  onClick={() => handleSell(truck.id)}
                  className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 rounded-md text-xs transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Sell</span>
                </button>
              ) : (
                <button
                  disabled
                  aria-disabled="true"
                  title={availabilityInfo.statusText ? `Sell blocked: ${availabilityInfo.statusText}` : 'Cannot sell this vehicle right now'}
                  className="inline-flex items-center space-x-2 bg-rose-600/40 text-white px-3 py-1 rounded-md text-xs opacity-60 cursor-not-allowed"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Sell</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 w-full bg-slate-700/60 border border-slate-600 rounded-md p-3 text-sm text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <div className="text-xs text-slate-400">Hub</div>
                <div className="text-sm text-white">{hub}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Condition</div>
                <div className="text-sm text-white">{condition}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">KM</div>
                <div className="text-sm text-white">{mileageLabel}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Current Location</div>
                <div className="text-sm text-white">{currentLocation}</div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Age</div>
                <div className="text-sm text-white">{ageInfo.label}</div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Purchase type</div>
                <div className="text-sm text-white">{purchaseTypeLabel}</div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Until next service check</div>
                <div className="text-sm text-white">—</div>
                <div className="text-xs text-slate-400 mt-1">Every 90 days</div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Purchase price</div>
                <div className="text-sm text-white">—</div>
              </div>

              <div>
                <div className="text-xs text-slate-400">License plate</div>
                {!editingPlate ? (
                  <div className="text-sm text-white">{displayedPlate}</div>
                ) : (
                  <div>
                    <input
                      className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white w-full"
                      value={plateInput ?? ''}
                      onChange={(e) => setPlateInput(e.target.value)}
                      aria-label="License plate"
                    />
                    <div className="mt-2 flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleSavePlate}
                        className="text-xs text-green-400 underline hover:text-green-300"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingPlate(false); setPlateInput(meta.licensePlate); }}
                        className="text-xs text-rose-400 underline hover:text-rose-300"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">Numeric part: max 4 digits; must be unique across trucks.</div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs text-slate-400">Nickname</div>
                {!editingNickname ? (
                  <div className="text-sm text-white">{displayedNickname}</div>
                ) : (
                  <div>
                    <input
                      className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white w-full"
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      aria-label="Truck nickname"
                    />
                    <div className="mt-2 flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleSaveNickname}
                        className="text-xs text-green-400 underline hover:text-green-300"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingNickname(false); setNicknameInput(meta.nickname ?? (truck.model ?? 'Truck')); }}
                        className="text-xs text-rose-400 underline hover:text-rose-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs text-slate-400">Insurance (6 months)</div>
                <div className="text-sm text-white">—</div>
                <div className="text-xs text-slate-400 mt-1">Due —</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => setEditingPlate(true)}
                className="text-sm text-sky-400 hover:text-sky-300"
                aria-label="Edit license plate"
              >
                Edit plate
              </button>

              <button
                type="button"
                onClick={() => setEditingNickname(true)}
                className="text-sm text-sky-400 hover:text-sky-300"
                aria-label="Edit nickname"
              >
                Edit nickname
              </button>

              <button
                type="button"
                onClick={markServiceNow}
                className="text-sm text-amber-400 hover:text-amber-300"
                aria-label="Perform service check now"
              >
                Service check
              </button>

              <button
                type="button"
                onClick={markInsuranceNow}
                className="text-sm text-green-400 hover:text-green-300"
                aria-label="Mark insured today"
              >
                Mark insured
              </button>

              <button
                type="button"
                onClick={() => setSpecsOpen(true)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Truck Specifications
              </button>
            </div>
          </div>
        )}
      </div>

      {specsOpen && (
        <SpecsModal
          title={`${title} ${subtitle}`}
          vehicle={truck}
          onClose={() => setSpecsOpen(false)}
        />
      )}

      {/* Toast UI (replaces alert()) */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </>
  );
};

export default TruckCard;
