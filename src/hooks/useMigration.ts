/**
 * useMigration.ts
 *
 * Hook to scan localStorage for tm_* keys and produce a normalized payload for migration.
 *
 * Responsibilities:
 * - Discover keys that likely belong to the game (tm_* / tm_admin_ / tm_user_state_)
 * - Parse values (including stringified JSON values) and produce statistics and normalized objects
 */

import { useCallback, useEffect, useState } from 'react';
import { normalizeExport } from '../utils/normalizeExport';

interface CollectionSummary {
  key: string;
  sizeBytes: number;
  count: number;
  sample?: any;
}

/**
 * useMigration
 * @description Returns found local collections and normalized payload.
 */
export const useMigration = () => {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [normalizedPayload, setNormalizedPayload] = useState<Record<string, any>>({});

  const scan = useCallback(() => {
    const raw: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // Discover typical game keys; allow customization later
      if (key.startsWith('tm_') || key.startsWith('tm_admin_') || key.startsWith('tm_user_state_')) {
        const value = localStorage.getItem(key) || '';
        raw[key] = value;
      }
    }

    const normalized = normalizeExport(raw);
    setNormalizedPayload(normalized);

    const summaries: CollectionSummary[] = Object.entries(normalized).map(([k, v]) => {
      const jsonStr = JSON.stringify(v);
      const sizeBytes = new Blob([jsonStr]).size;
      const count = Array.isArray(v) ? v.length : (typeof v === 'object' ? Object.keys(v).length : 1);
      return { key: k, sizeBytes, count, sample: Array.isArray(v) ? v[0] : v };
    });

    setCollections(summaries);
  }, []);

  useEffect(() => {
    scan();
  }, [scan]);

  return {
    collections,
    normalizedPayload,
    refreshCollections: scan
  };
};