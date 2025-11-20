/**
 * SmallSkillCard.tsx
 *
 * File-level:
 * Small presentational chip used across staff UIs.
 * Also exports SkillChipsList: a tiny helper to render a list of chips (max N) WITHOUT any "+N" aggregator.
 *
 * This file is intentionally minimal and purely presentational.
 */

import React from 'react';

export interface SmallSkillCardProps {
  title: string;
  className?: string;
  titleAttr?: string;
}

/**
 * SmallSkillCard
 * Presentational chip used for skills.
 *
 * @param props SmallSkillCardProps
 */
export const SmallSkillCard: React.FC<SmallSkillCardProps> = ({ title, className = '', titleAttr }) => {
  return (
    <span
      title={titleAttr ?? title}
      className={`px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs truncate inline-block ${className}`}
      style={{ maxWidth: 160, display: 'inline-block' }}
    >
      {title}
    </span>
  );
};

export default SmallSkillCard;

/**
 * SkillChipsListProps
 * @description Props for SkillChipsList helper
 */
export interface SkillChipsListProps {
  skills?: string[] | undefined;
  limit?: number;
  className?: string;
}

/**
 * SkillChipsList
 * Render up to `limit` skill chips with SmallSkillCard.
 *
 * Important: This helper intentionally does NOT render an aggregated "+N" badge.
 *
 * @param props SkillChipsListProps
 */
export const SkillChipsList: React.FC<SkillChipsListProps> = ({ skills = [], limit = 3, className = '' }) => {
  if (!Array.isArray(skills) || skills.length === 0) return null;
  const visible = skills.slice(0, limit);
  return (
    <div className={`flex items-center gap-2 min-w-0 ${className}`}>
      {visible.map((s, i) => (
        <SmallSkillCard key={i} title={s} />
      ))}
    </div>
  );
};