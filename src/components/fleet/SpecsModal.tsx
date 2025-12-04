/**
 * SpecsModal.tsx
 *
 * Reusable modal used by fleet cards to show a market-style vehicle specification popup.
 *
 * Purpose:
 * - Render an accessible dialog showing vehicle image + technical specifications.
 * - Attempt to fetch a vehicle image from multiple reliable sources when an image is not provided.
 *
 * Notes:
 * - Non-blocking: network errors do not break modal rendering.
 * - Cleans up created object URLs on unmount.
 * - Keeps existing layout and behavior unchanged; only image resolution / rendering changed so the
 *   image fills the available fixed box and is cropped when necessary.
 */

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import VehicleSpecsSelector from '../market/VehicleSpecsSelector';
import { TRUCKS } from '../../data/trucks';
import TrailerTechnicalSpecs from '../trailer/TrailerTechnicalSpecs';

interface SpecsModalProps {
  /**
   * Title to show in modal header (usually "Brand Model" or similar).
   */
  title?: string;
  /**
   * Full vehicle object (preferred). The VehicleSpecsSelector expects a `vehicle` prop.
   */
  vehicle?: any | null;
  /**
   * Minimal specs object, kept for compatibility with older callers.
   */
  specs?: { [key: string]: any } | null;
  /**
   * Close callback
   */
  onClose: () => void;
}

/**
 * extractImageFromJson
 * @description Inspect a JSON-like payload to find common image fields.
 * @param obj any
 * @returns string | null
 */
function extractImageFromJson(obj: any): string | null {
  if (!obj) return null;

  // Candidate paths commonly used in the project and backends
  const candidates = [
    'image',
    'img',
    'thumbnail',
    'thumbnailUrl',
    'media[0].url',
    'media.0.url',
    'media.image',
    'marketEntry.specifications.image',
    'marketEntry.image',
    'specifications.image',
    'images[0].url',
    'images.0.url',
    'photos[0].url',
    'photo',
    'media[0].src'
  ];

  for (const key of candidates) {
    const parts = key.split('.');
    let v: any = obj;
    for (const p of parts) {
      if (p.endsWith(']')) {
        // handle array access like media[0]
        const [arrKey, idxRaw] = p.split('[');
        const idx = parseInt(idxRaw.replace(']', ''), 10);
        v = v?.[arrKey];
        if (!Array.isArray(v)) {
          v = undefined;
          break;
        }
        v = v?.[idx];
      } else {
        v = v?.[p];
      }
      if (v === undefined || v === null) break;
    }
    if (v) {
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && (v.url || v.src)) return v.url ?? v.src;
    }
  }

  return null;
}

/**
 * findLocalVehicleImage
 * @description Search local TRUCKS dataset (small/medium/big) for an entry matching the given id.
 *              This allows the modal to re-use images defined in src/data/trucks when the runtime
 *              vehicle object lacks an image.
 * @param id string | null | undefined
 * @returns string | null
 */
function findLocalVehicleImage(id?: string | null): string | null {
  if (!id) return null;
  try {
    const categories = Object.keys(TRUCKS) as Array<keyof typeof TRUCKS>;
    for (const cat of categories) {
      const arr = (TRUCKS as any)[cat] as any[];
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        if (!entry) continue;
        const entryId = String(entry.id ?? entry?.marketEntry?.id ?? '').trim();
        if (!entryId) continue;
        if (entryId === String(id)) {
          if (entry.image && typeof entry.image === 'string') return entry.image;
        }
      }
    }
  } catch {
    // silence errors - local lookup is best-effort
  }
  return null;
}

/**
 * SpecsModal
 * @description Accessible modal presenting vehicle image and technical specifications.
 */
const SpecsModal: React.FC<SpecsModalProps> = ({ title, vehicle = null, specs = null, onClose }) => {
  const backdropRef = useRef<HTMLDivElement | null>(null);

  // fetchedImage is either a remote URL or an object URL created from a blob
  const [fetchedImage, setFetchedImage] = useState<string | null>(null);
  const createdObjectUrlRef = useRef<string | null>(null);

  // Preference order: explicit vehicle image -> marketEntry.specifications.image -> local dataset -> fetchedImage via APIs
  const localImage = findLocalVehicleImage(vehicle?.id ?? vehicle?.vehicleId ?? specs?.id ?? null);

  const imageUrlPrior =
    vehicle?.image ??
    vehicle?.marketEntry?.specifications?.image ??
    vehicle?.media?.[0]?.url ??
    vehicle?.thumbnail ??
    specs?.image ??
    specs?.thumbnail ??
    localImage ??
    null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /**
   * handleBackdropClick
   * @description Close the modal when clicking on the backdrop (but not when clicking inside the panel).
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // defensive timeout

    // Cleanup any previous created object URL
    if (createdObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(createdObjectUrlRef.current);
      } catch {
        // ignore revoke errors
      }
      createdObjectUrlRef.current = null;
    }

    // If a direct image already present, do not fetch
    if (imageUrlPrior) {
      setFetchedImage(null); // ensure we prefer imageUrlPrior later
      clearTimeout(timeout);
      controller.abort();
      return () => {
        // nothing to clean
      };
    }

    const id = vehicle?.id ?? vehicle?.vehicleId ?? specs?.id ?? null;
    if (!id) {
      clearTimeout(timeout);
      controller.abort();
      return () => {};
    }

    (async () => {
      try {
        // Try JSON metadata endpoint first
        const metaResp = await fetch(`/api/vehicles/${encodeURIComponent(String(id))}`, {
          credentials: 'same-origin',
          signal: controller.signal
        });

        if (aborted) return;

        if (metaResp.ok) {
          try {
            const json = await metaResp.json();
            const found = extractImageFromJson(json) ?? extractImageFromJson(json?.data) ?? null;
            if (found) {
              setFetchedImage(found);
              clearTimeout(timeout);
              return;
            }
          } catch {
            // json parse failed - continue to next attempt
          }
        }

        // Try image endpoint - could return image blob, JSON with image URL, or plain text URL
        const imgResp = await fetch(`/api/vehicle-image/${encodeURIComponent(String(id))}`, {
          credentials: 'same-origin',
          signal: controller.signal
        });

        if (aborted) return;

        if (imgResp.ok) {
          const ct = imgResp.headers.get('content-type') ?? '';

          if (ct.startsWith('image/')) {
            // create object URL
            const blob = await imgResp.blob();
            const url = URL.createObjectURL(blob);
            createdObjectUrlRef.current = url;
            setFetchedImage(url);
            clearTimeout(timeout);
            return;
          }

          // Try to parse JSON that might contain image URL
          try {
            const json = await imgResp.json();
            const found = extractImageFromJson(json) ?? null;
            if (found) {
              setFetchedImage(found);
              clearTimeout(timeout);
              return;
            }
          } catch {
            // not JSON, try text
          }

          // Plain text response - treat it as URL if looks like one
          try {
            const text = (await imgResp.text()).trim();
            if (text && (text.startsWith('http') || text.startsWith('/'))) {
              setFetchedImage(text);
              clearTimeout(timeout);
              return;
            }
          } catch {
            // ignore
          }
        }

        // As a last-resort attempt, check local dataset again (this is redundant but safe)
        const localAgain = findLocalVehicleImage(id);
        if (localAgain) {
          setFetchedImage(localAgain);
          clearTimeout(timeout);
          return;
        }
      } catch (err) {
        // network error, ignore and leave modal functional without image
      } finally {
        // final cleanup for this effect will be in the return handler
      }
    })();

    return () => {
      aborted = true;
      controller.abort();
      clearTimeout(timeout);
      if (createdObjectUrlRef.current) {
        try {
          URL.revokeObjectURL(createdObjectUrlRef.current);
        } catch {
          // ignore revoke errors
        }
        createdObjectUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle?.id, imageUrlPrior]);

  // Final image url preference: passed image -> fetchedImage -> null
  const finalImageUrl = imageUrlPrior ?? fetchedImage ?? null;

  // If we created an object URL we must revoke it on unmount handled above via ref
  const vehicleForSelector = vehicle ?? (specs ? { specifications: specs } : null);

  return (
    <div
      ref={backdropRef}
      onMouseDown={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Vehicle specifications'}
        className="w-full max-w-4xl bg-slate-900 rounded-lg border border-slate-700 shadow-lg overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-white">{title ?? (vehicleForSelector?.model ?? 'Vehicle')}</h3>
            {vehicleForSelector?.manufacturer && (
              <div className="text-xs text-slate-400">{vehicleForSelector.manufacturer}</div>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close specifications"
              className="inline-flex items-center justify-center p-2 rounded hover:bg-slate-800"
            >
              <X className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Top: image (if present) - KEEP BOX SIZE fixed (h-56) and crop photo to fill it */}
          {finalImageUrl ? (
            <div className="w-full mb-6 flex items-center justify-center bg-slate-900/30 rounded h-56 overflow-hidden">
              <img
                src={finalImageUrl}
                alt={vehicleForSelector?.model ?? 'vehicle image'}
                className="w-full h-full object-cover object-center"
              />
            </div>
          ) : null}

          {/* Render trailer-specific technical specs inside the modal when specs are provided.
              This moves the compact technical block into the popup so the card stays clean.
              TrailerTechnicalSpecs is defensive and will render dashes for missing fields. */}
          {specs && (
            <div className="mb-6">
              <TrailerTechnicalSpecs specs={vehicleForSelector?.specifications ?? specs} />
            </div>
          )}

          {/* Main specs area: reuse VehicleSpecsSelector so the modal content matches vehicle market page */}
          {vehicleForSelector ? (
            <VehicleSpecsSelector vehicle={vehicleForSelector} />
          ) : (
            <div className="bg-slate-800 rounded p-4 border border-slate-700">
              <div className="text-sm text-slate-400 mb-2">Technical specifications</div>
              <pre className="text-sm text-slate-300 whitespace-pre-wrap">{JSON.stringify(specs ?? {}, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecsModal;