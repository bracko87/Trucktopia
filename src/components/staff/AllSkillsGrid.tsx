/**
 * AllSkillsGrid.tsx
 *
 * File-level:
 * Presents a grouped grid of all skills across the four roles (driver, mechanic, manager, dispatcher).
 * This variant removes the small rarity / salary-multiplier line from each skill card (requested).
 *
 * Design goals:
 * - Equal treatment for the four roles (Driver, Mechanic, Manager, Dispatcher)
 * - Show full effects for every skill
 * - Keep cards compact and readable
 *
 * Note: This component relies on utils/skillsDatabase for the Skill type and data helpers.
 */

import React from 'react';
import { Info, Euro, Sparkles, GitMerge, Wrench, ShieldCheck } from 'lucide-react';
import { getSkillsByCategory, Skill, getRarityColor } from '../../utils/skillsDatabase';

/**
 * RoleKey
 * @description Limited union type for the supported roles
 */
type RoleKey = 'driver' | 'mechanic' | 'manager' | 'dispatcher';

const ROLE_TITLES: Record<RoleKey, string> = {
  driver: 'Driver Skills',
  mechanic: 'Mechanic Skills',
  manager: 'Manager Skills',
  dispatcher: 'Dispatcher Skills',
};

/**
 * formatEffectValue
 * @description Human-friendly formatting for effect values. If value <= 1 treat as percentage, else show raw.
 *
 * @param val numeric effect value
 */
function formatEffectValue(val: number): string {
  if (Math.abs(val) <= 1) {
    // percentage-like
    return `${Math.round(val * 100)}%`;
  }
  return String(val);
}

/**
 * effectIcon
 * @description Map effect type to a small lucide icon component for visual context
 *
 * @param type effect type string from database
 */
function effectIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes('fuel') || t.includes('eco') || t.includes('efficiency')) return Sparkles;
  if (t.includes('repair') || t.includes('diagnostic') || t.includes('welding') || t.includes('maintenance')) return Wrench;
  if (t.includes('safety') || t.includes('compliance') || t.includes('insurance') || t.includes('risk')) return ShieldCheck;
  if (t.includes('time') || t.includes('speed') || t.includes('efficiency')) return GitMerge;
  return Sparkles;
}

/**
 * SkillCard
 * @description Presentational card rendering one Skill object with full effects.
 * The small line that previously showed rarity + salary multiplier has been removed as requested.
 *
 * @param props.skill - skill to render
 */
const SkillCard: React.FC<{ skill: Skill }> = ({ skill }) => {
  const rarityCls = getRarityColor(skill.rarity);
  return (
    <article className="bg-slate-700 rounded-lg p-4 border border-slate-600 shadow-sm hover:shadow-md transition-shadow">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-semibold text-white text-sm truncate">{skill.name}</h4>
          <p className="text-xs text-slate-300 mt-1 line-clamp-3">{skill.description}</p>
        </div>
      </header>

      {/* Removed: the small rarity + salary multiplier line from here (user request) */}

      <div className="mt-3 border-t border-slate-600 pt-3">
        <ul className="space-y-2">
          {skill.effects.map((eff, idx) => {
            const Icon = effectIcon(eff.type);
            return (
              <li key={eff.type + idx} className="flex items-start gap-2">
                <Icon className="w-4 h-4 text-slate-300 mt-0.5" />
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-slate-200">{eff.description}</span>
                    <span className="text-[11px] text-slate-400">•</span>
                    <span className="text-[11px] text-green-300">{formatEffectValue(eff.value)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
};

/**
 * AllSkillsGrid
 * @description Renders all skills grouped by role. Each role is shown with a heading and a responsive grid.
 *
 * Notes:
 * - This component is read-only and uses the canonical data source (utils/skillsDatabase).
 * - The small rarity/salary line was intentionally removed from cards to satisfy the requester.
 */
const AllSkillsGrid: React.FC = () => {
  const roles: RoleKey[] = ['driver', 'mechanic', 'manager', 'dispatcher'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Info className="w-5 h-5 text-blue-400" />
        <div>
          <h3 className="text-lg font-semibold text-white">Skills &amp; Game Impact — All Roles</h3>
          <p className="text-sm text-slate-400 mt-1">
            Full list of skills grouped by role. Each card shows all game-impacting effects.
          </p>
        </div>
      </div>

      {roles.map((role) => {
        const list: Skill[] = getSkillsByCategory(role);
        return (
          <section key={role} aria-labelledby={`skills-${role}`} className="space-y-3">
            <h4 id={`skills-${role}`} className="text-sm font-semibold text-white">
              {ROLE_TITLES[role]}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((s) => (
                <SkillCard key={s.id} skill={s} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default AllSkillsGrid;
