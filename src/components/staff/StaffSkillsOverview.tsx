/**
 * StaffSkillsOverview.tsx
 *
 * File-level:
 * Compact, accessible toggle that reveals the full skills grid for all roles.
 *
 * Responsibilities:
 * - Provide a clear, moderately-sized Show / Hide control to toggle the AllSkillsGrid.
 * - Keep the control visually prominent but not oversized.
 * - Render the AllSkillsGrid when expanded.
 */

import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import AllSkillsGrid from './AllSkillsGrid';

/**
 * StaffSkillsOverview
 * @description Small presentational component that toggles visibility of the full skills grid.
 *
 * Visual choices:
 * - Use a compact button (smaller padding and font-size than previous version).
 * - Keep a clear visual emphasis on the Show/Hide word using amber color.
 * - Provide an icon that flips depending on state.
 *
 * Accessibility:
 * - Button uses aria-expanded and is keyboard-focusable with visible focus ring.
 */
const StaffSkillsOverview: React.FC = () => {
  const [expanded, setExpanded] = useState<boolean>(false);

  /**
   * toggleExpanded
   * @description Toggle the expanded/collapsed state for showing all skills.
   */
  const toggleExpanded = () => {
    setExpanded((s) => !s);
  };

  return (
    <div>
      <div className="mt-2">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={toggleExpanded}
          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 hover:bg-slate-700"
        >
          <span className="text-sm font-semibold text-white select-none">
            <span className="mr-2 text-amber-300">{expanded ? 'Hide' : 'Show'}</span>
            <span className="opacity-95">full skills &amp; impacts</span>
          </span>

          <span className="text-slate-400">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-4">
          <AllSkillsGrid />
        </div>
      )}
    </div>
  );
};

export default StaffSkillsOverview;