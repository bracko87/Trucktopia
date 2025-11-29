/**
 * SectionHeader.tsx
 *
 * Reusable header used by Truck and Trailer sections to ensure identical
 * visual design, spacing and optional actions.
 *
 * Responsibilities:
 * - Render icon + title + optional subtitle on the left.
 * - Render an optional primary action on the right (hidden when not provided).
 *
 * This file focuses on presentational styling only.
 */

import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /**
   * When provided, renders a primary action button on the right.
   * If omitted, the right side is not rendered (useful for pages with a global CTA).
   */
  primaryLabel?: string;
  onPrimaryClick?: () => void;
}

/**
 * SectionHeader
 *
 * @description Presentational header used by Fleet sections to keep identical look.
 * @param {SectionHeaderProps} props Component props
 * @returns React.ReactElement
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, icon, primaryLabel, onPrimaryClick }) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800/50 ring-1 ring-white/5">
            {icon}
          </div>
        </div>

        <div>
          <h2 className="text-lg md:text-xl font-semibold text-white leading-tight">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p> : null}
        </div>
      </div>

      {/* Right-side primary button: only rendered when label + handler provided */}
      {primaryLabel && onPrimaryClick ? (
        <div className="flex items-center space-x-2">
          <button
            onClick={onPrimaryClick}
            type="button"
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            aria-label={primaryLabel}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
            <span>{primaryLabel}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default SectionHeader;