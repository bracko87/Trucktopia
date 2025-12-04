/**
 * TruckCard.tsx
 *
 * Presentational card for a truck used across fleet views.
 *
 * Responsibilities:
 * - Render compact truck information and quick actions
 * - Provide editable persisted metadata (license plate, nickname, insurance/service timestamps)
 * - Ensure license plate numeric part validation:
 *    * Numeric part must be <= 4 digits
 *    * Numeric part must be unique across trucks (no two trucks share the same numeric part)
 *
 * This file also provides a small, self-contained UI-friendly toast/modal system
 * used to display validation messages instead of browser-native alert() windows.
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
 * STORAGE keys and registry helpers.
 */
const META_KEY = (truckId: string) => `tm_truck_meta_${truckId}`;
const PLATE_REGISTRY_KEY = `tm_plate_registry`;

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
 * loadPlateRegistry
 * @description Load registry from localStorage. Maps numericPart -> truckId.
 */
function loadPlateRegistry(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PLATE_REGISTRY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * savePlateRegistry
 * @description Persist registry back to localStorage.
 */
function savePlateRegistry(reg: Record<string, string>) {
  try {
    localStorage.setItem(PLATE_REGISTRY_KEY, JSON.stringify(reg));
  } catch {
    // ignore
  }
}

/**
 * registerPlateNumericPart
 * @description Attempt to register numericPart for truckId. Returns true on success.
 */
function registerPlateNumericPart(numericPart: string, truckId: string): boolean {
  if (!numericPart) return false;
  const reg = loadPlateRegistry();
  const existing = reg[numericPart];
  if (existing && existing !== truckId) return false;
  reg[numericPart] = truckId;
  savePlateRegistry(reg);
  return true;
}

/**
 * unregisterPlateNumericPart
 * @description Remove numericPart mapping if it points to truckId.
 */
function unregisterPlateNumericPart(numericPart: string, truckId: string) {
  if (!numericPart) return;
  const reg = loadPlateRegistry();
  if (reg[numericPart] === truckId) {
    delete reg[numericPart];
    savePlateRegistry(reg);
  }
}

/**
 * getNumericPart
 * @description Extract numeric characters from a plate string.
 */
function getNumericPart(plate?: string | null): string {
  if (!plate) return '';
  return String(plate).replace(/\D/g, '');
}

/**
 * generateRandomNumericPart
 * @description Generate a zero-padded numeric part up to 4 digits (0000 - 9999)
 */
function generateRandomNumericPart(): string {
  const n = Math.floor(Math.random() * 10000); // 0..9999
  return String(n).padStart(4, '0');
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
  const [meta, setMeta] = React.useState<TruckMeta>(() => loadTruckMeta(truck.id));

  // Editing states
  const [editingNickname, setEditingNickname] = React.useState<boolean>(false);
  const [editingPlate, setEditingPlate] = React.useState<boolean>(false);
  const [nicknameInput, setNicknameInput] = React.useState<string>(meta.nickname ?? (truck.model ?? 'Truck'));
  const [plateInput, setPlateInput] = React.useState<string | undefined>(meta.licensePlate);

  // Toast message state (UI-friendly notification)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    // initialize defaults if missing (license plate and nickname)
    let changed = false;
    const m: TruckMeta = { ...(meta || {}) };

    const hub =
      typeof truck.deliveryHub === 'string'
        ? truck.deliveryHub
        : (truck.deliveryHub?.name ?? truck.deliveryHub?.id ?? truck.location ?? '');

    if (!m.licensePlate) {
      // generate unique numeric part and register it
      let attempts = 0;
      let numeric = '';
      let prefix = String(hub || '').replace(/[^A-Za-z]/g, '');
      prefix = (prefix.slice(0, 2) || String(hub || 'UN').slice(0, 2)).toUpperCase();

      while (attempts < 50) {
        numeric = generateRandomNumericPart();
        const registered = registerPlateNumericPart(numeric, truck.id);
        if (registered) break;
        attempts += 1;
      }

      if (!numeric) {
        // fallback: try to find any unused numeric by scanning 0000..9999 (unlikely)
        for (let i = 0; i < 10000; i++) {
          const candidate = String(i).padStart(4, '0');
          if (registerPlateNumericPart(candidate, truck.id)) {
            numeric = candidate;
            break;
          }
        }
      }

      m.licensePlate = `${prefix}-${numeric || generateRandomNumericPart()}`;
      changed = true;
    } else {
      // existing plate found - ensure registry holds it
      const numericPart = getNumericPart(m.licensePlate);
      if (numericPart) {
        registerPlateNumericPart(numericPart, truck.id);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [truck.id]);

  /**
   * showToast
   * @description Show UI-friendly toast message for validation / info messages.
   */
  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  /**
   * handleToggleDetails
   * @description Toggle the expanded details panel.
   */
  const handleToggleDetails = () => {
    setExpanded((s) => !s);
  };

  /**
   * handleSell
   * @description Forward sell action to parent but block when not available.
   *
   * Uses determineAvailability as the single source of truth so UI and actions
   * remain consistent. Recomputes availability at action time to ensure up-to-date behaviour.
   */
  const handleSell = (id: string) => {
    // Re-evaluate availability right before performing the action to ensure
    // the most recent state is respected.
    const currentAvailability = determineAvailability(truck, Boolean(truck.assignedJobId || truck.assignedJob));

    if (!currentAvailability.isAvailable) {
      // Use the canonical statusText from determineAvailability for user-facing reason.
      showToast(`Sell blocked: ${currentAvailability.statusText || 'Not available'}.`);
      return;
    }

    onSell(id);
  };

  /**
   * handleSaveNickname
   * @description Persist nickname change to meta.
   */
  const handleSaveNickname = () => {
    const updated = { ...meta, nickname: nicknameInput };
    setMeta(updated);
    saveTruckMeta(truck.id, updated);
    setEditingNickname(false);
    showToast('Nickname saved.');
  };

  /**
   * handleSavePlate
   * @description Persist license plate change to meta while enforcing numeric part rules:
   *  - numeric part must be <= 4 digits
   *  - numeric part must be unique across trucks
   *
   * Uses UI-friendly toast notifications instead of alert().
   */
  const handleSavePlate = () => {
    const input = (plateInput ?? '').trim();
    if (!input) {
      showToast('License plate cannot be empty.');
      return;
    }

    const numeric = getNumericPart(input);
    // Validate numeric length
    if (numeric.length > 4) {
      showToast('License plate numeric part cannot contain more than 4 digits.');
      return;
    }

    // Validate uniqueness
    const currentNumeric = getNumericPart(meta.licensePlate);
    if (numeric === currentNumeric) {
      // numeric unchanged -> simply save full plate
      const updatedSame = { ...meta, licensePlate: input };
      setMeta(updatedSame);
      saveTruckMeta(truck.id, updatedSame);
      setEditingPlate(false);
      showToast('License plate saved.');
      return;
    }

    // Try to register new numeric part
    const registered = registerPlateNumericPart(numeric, truck.id);
    if (!registered) {
      showToast('This numeric part is already used by another truck. Please choose a different numeric part (up to 4 digits).');
      return;
    }

    // Unregister old numeric part (if any)
    if (currentNumeric) {
      unregisterPlateNumericPart(currentNumeric, truck.id);
    }

    const updated = { ...meta, licensePlate: input };
    setMeta(updated);
    saveTruckMeta(truck.id, updated);
    setEditingPlate(false);
    showToast('License plate saved.');
  };

  /**
   * markServiceNow
   * @description Mark service check as done today (persist lastServiceDate = today).
   */
  const markServiceNow = () => {
    const nowIso = new Date().toISOString();
    const updated = { ...meta, lastServiceDate: nowIso };
    setMeta(updated);
    saveTruckMeta(truck.id, updated);
    showToast('Service date updated.');
  };

  /**
   * markInsuranceNow
   * @description Mark insurance as done today (persist lastInsuranceDate = today).
   */
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

  const { deliveryDateLabel, deliveryEtaDate, isDeliveryFuture } = (() => {
    const now = new Date();
    const candidates: any[] = [
      truck.deliveryEta,
      truck.marketEntry?.deliveryEta,
      truck.marketEntry?.availability,
      truck.availableIn
    ];

    if (truck.availableInDays != null && !Number.isNaN(Number(truck.availableInDays))) {
      const days = Number(truck.availableInDays);
      candidates.push(new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString());
    }

    let parsedDate: Date | null = null;

    for (const c of candidates) {
      if (!c) continue;
      if (typeof c === 'number' && Number.isFinite(c)) {
        parsedDate = new Date(Date.now() + Number(c) * 24 * 60 * 60 * 1000);
        break;
      }
      const p = Date.parse(String(c));
      if (!Number.isNaN(p)) {
        parsedDate = new Date(p);
        break;
      }
    }

    if (!parsedDate) {
      return { deliveryDateLabel: null, deliveryEtaDate: null, isDeliveryFuture: false };
    }

    const label = parsedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    return { deliveryDateLabel: label, deliveryEtaDate: parsedDate, isDeliveryFuture: parsedDate.getTime() > now.getTime() };
  })();

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
      <div className={containerClass}>
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
                      {deliveryDateLabel ? (
                        <>
                          <Calendar className="w-3 h-3 text-sky-400 flex-shrink-0" />
                          <span className={`truncate ${isDeliveryFuture ? 'text-amber-400 font-semibold' : ''}`}>Delivery date: {deliveryDateLabel}</span>

                          <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${vehicleStatus.color}`}>
                            {React.createElement(vehicleStatus.icon, { className: 'w-3 h-3 flex-shrink-0' })}
                            <span className="truncate">{vehicleStatus.label}</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3 h-3 text-sky-400 flex-shrink-0" />
                          <span className="truncate">{availability}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                {/* reserved for compact action widgets */}
              </div>
            </div>

            <div className="mt-3 flex items-center space-x-4 text-xs text-slate-300">
              <div>Condition: <span className="text-slate-200 ml-1">{condition}</span></div>
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
                <div className="text-sm text-white">{'—'}</div>
                <div className="text-xs text-slate-400 mt-1">{'Every 90 days'}</div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Purchase price</div>
                <div className="text-sm text-white">{'—'}</div>
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
                <div className="text-sm text-white">{'—'}</div>
                <div className="text-xs text-slate-400 mt-1">{'Due —'}</div>
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
