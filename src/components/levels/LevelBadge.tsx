/**
 * LevelBadge.tsx
 *
 * This file used to render a small inline "Level: <tier>" badge with a compact progress bar.
 * To ensure the badge is fully removed from the UI (deterministically) we replace the visual
 * output with a no-op component that returns null. This preserves the component signature so
 * imports remain valid while preventing any DOM output.
 *
 * Note:
 * - This is intentionally minimal and reversible. To restore the badge, revert this file to the
 *   original implementation.
 */

import React from 'react';

/**
 * LevelBadgeProps
 * @description Props for the LevelBadge component. Kept to preserve the component contract.
 */
export interface LevelBadgeProps {
  company?: any;
  className?: string;
}

/**
 * LevelBadge
 * @description No-op replacement that prevents the inline level badge from rendering.
 *              Returns null to guarantee no DOM output. This is safer and deterministic
 *              compared to runtime DOM patchers that may miss late React mounts.
 *
 * @param {LevelBadgeProps} _props Props (unused)
 * @returns {null} no visual output
 */
const LevelBadge: React.FC<LevelBadgeProps> = (_props) => {
  return null;
};

export default LevelBadge;