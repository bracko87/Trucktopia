/**
 * SectionHeader.tsx
 *
 * File-level description:
 * Reusable section header used across fleet pages. This implementation includes a
 * defensive suppression rule: when the title/subtitle match legacy trailer strings
 * ("Trailer Fleet" / "Manage your trailers") the component intentionally returns null
 * so the old compact "package" icon box and text are no longer rendered.
 *
 * Responsibilities:
 * - Render an icon + title + subtitle row with optional right-side content.
 * - Prevent rendering for legacy trailer header strings so the UI no longer shows the
 *   unwanted trailer header box across fleet pages.
 */

import React, { ReactNode } from 'react';

export interface SectionHeaderProps {
  /**
   * title - main header text
   */
  title: string;
  /**
   * subtitle - smaller description / subtitle
   */
  subtitle?: string | null;
  /**
   * icon - optional left icon node (small box expected)
   */
  icon?: ReactNode;
  /**
   * right - optional right-side controls (buttons, nav)
   */
  right?: ReactNode;
  /**
   * additional className for root wrapper
   */
  className?: string;
}

/**
 * SectionHeader
 *
 * @description Small reusable header used across fleet & other pages.
 *              Contains a defensive suppression: if the title contains "trailer fleet"
 *              or subtitle contains "manage your trailers" (case-insensitive) the
 *              component will not render. This removes the legacy box permanently
 *              at source rather than relying on runtime DOM hacks.
 *
 * @param props SectionHeaderProps
 * @returns React.ReactElement | null
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  right,
  className = ''
}) => {
  // Normalize helper for comparisons
  const normalize = (s?: string | null) => (s || '').toString().replace(/\s+/g, ' ').trim().toLowerCase();

  const titleNorm = normalize(title);
  const subtitleNorm = normalize(subtitle);

  // Suppression rules (legacy trailer strings)
  if (titleNorm.includes('trailer fleet') || subtitleNorm.includes('manage your trailers')) {
    // Return null to permanently avoid rendering the legacy trailer header box
    return null;
  }

  return (
    <div className={`flex items-center justify-between mb-4 ${className}`}>
      <div className="flex items-start space-x-4">
        {icon ? (
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800/50 ring-1 ring-white/5">
              {icon}
            </div>
          </div>
        ) : null}

        <div>
          <h2 className="text-lg md:text-xl font-semibold text-white leading-tight">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p> : null}
        </div>
      </div>

      {right ? <div className="ml-4">{right}</div> : null}
    </div>
  );
};

export default SectionHeader;