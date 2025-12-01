/**
 * ManifestSynchronizer.tsx
 *
 * Non-visual runtime helper that synchronizes the static manifest with a
 * runtime representation persisted to localStorage. This ensures the admin
 * "Game Rules & Engines" UI can reflect which engines are actually mounted
 * at runtime without editing source files.
 *
 * Responsibilities:
 * - Merge static manifest and mark all entries active/mounted by default.
 * - Persist the runtime manifest to localStorage under key: 'gameRulesManifest.runtime'.
 * - Emit a 'manifestSynced' CustomEvent so UI components can pick up the runtime state.
 * - Listen for 'engineMounted' events to update runtime mount state dynamically.
 */

import React, { useEffect } from 'react';
import { manifest as staticManifest } from '../data/game-rules-engines';

/**
 * Props
 * @param mountedEngineIds - optional list of engine ids that should be considered mounted
 */
interface Props {
  mountedEngineIds?: string[];
}

/**
 * mergeAndPersistManifest
 * @description Merge static manifest with runtime overrides and persist to localStorage.
 * Marks gameRules, engines and cronJobs as active and engines as mounted where applicable.
 * Emits a global CustomEvent 'manifestSynced' with the persisted payload.
 */
function mergeAndPersistManifest(mountedEngineIds: string[] = []) {
  // Build a runtime manifest that prefers 'active' and 'mounted' statuses.
  const runtime = {
    generatedAt: new Date().toISOString(),
    runtime: {
      gameRules: staticManifest.gameRules.map((g) => ({
        ...g,
        status: 'active' as const,
        lastModified: g.lastModified ?? new Date().toISOString()
      })),
      engines: staticManifest.engines.map((e) => {
        const shouldMount = mountedEngineIds.length === 0 || mountedEngineIds.includes(e.id);
        return {
          ...e,
          status: 'active' as const,
          mountStatus: shouldMount ? ('mounted' as const) : (e.mountStatus ?? ('mounted' as const)),
          lastModified: e.lastModified ?? new Date().toISOString()
        };
      }),
      cronJobs: staticManifest.cronJobs.map((c) => ({
        ...c,
        status: 'active' as const,
        lastModified: c.lastModified ?? new Date().toISOString()
      }))
    }
  };

  try {
    localStorage.setItem('gameRulesManifest.runtime', JSON.stringify(runtime));
    // Emit event so UIs can react immediately
    window.dispatchEvent(new CustomEvent('manifestSynced', { detail: runtime }));
    // Helpful debug to confirm synchronizer ran
    // eslint-disable-next-line no-console
    console.debug('ManifestSynchronizer: persisted runtime manifest', runtime);
  } catch (err) {
    // localStorage may be unavailable in some environments - fail gracefully
    // eslint-disable-next-line no-console
    console.warn('ManifestSynchronizer: failed to persist runtime manifest', err);
  }

  return runtime;
}

/**
 * ManifestSynchronizer
 * @description React component that runs on App mount to ensure a runtime manifest exists.
 * It renders null (non-visual).
 */
const ManifestSynchronizer: React.FC<Props> = ({ mountedEngineIds = [] }) => {
  useEffect(() => {
    // Persist initial runtime manifest (mark everything active/mounted by default or use provided list)
    mergeAndPersistManifest(mountedEngineIds);

    // Handler for dynamic registrations: components can dispatch:
    // window.dispatchEvent(new CustomEvent('engineMounted', { detail: { id: 'E-018' } }))
    // and the synchronizer will update persisted manifest accordingly.
    const handler = (ev: Event) => {
      try {
        // @ts-ignore - event.detail shape is dynamic
        const d = (ev as CustomEvent).detail;
        if (d?.id && typeof d.id === 'string') {
          const raw = localStorage.getItem('gameRulesManifest.runtime');
          const parsed = raw ? JSON.parse(raw) : null;
          const ids = new Set<string>(
            parsed?.runtime?.engines?.map((en: any) => en.id) || staticManifest.engines.map((en) => en.id)
          );
          ids.add(d.id);
          // Re-merge using expanded mountedEngineIds set
          mergeAndPersistManifest(Array.from(ids));
          // eslint-disable-next-line no-console
          console.debug('ManifestSynchronizer: engineMounted event processed for', d.id);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('ManifestSynchronizer handler error', err);
      }
    };

    window.addEventListener('engineMounted', handler as EventListener);

    return () => {
      window.removeEventListener('engineMounted', handler as EventListener);
    };
    // mountedEngineIds intentionally stable in App usage; effect re-runs if it changes
  }, [mountedEngineIds]);

  return null;
};

export default ManifestSynchronizer;