/**
 * skillPersistence.ts
 *
 * Canonical helper for reading/writing per-staff skill progress into localStorage.
 *
 * Responsibilities:
 * - Provide readSkillProgress(id, skill) -> number | null
 * - Provide writeSkillProgress(id, skill, pct) -> void
 *
 * Storage format (per key): tm_skill_progress_{id}_{encodedSkill}
 * - JSON object: { pct: number, updatedAt: string }
 *
 * This centralizes storage access so all assigners and hiring logic use the same format.
 */

/**
 * buildKey
 * @description Build localStorage key for staff id + skill
 * @param id staff id or hireUid
 * @param skill skill name
 */
export function buildKey(id: string, skill: string): string {
  return `tm_skill_progress_${String(id)}_${encodeURIComponent(String(skill))}`;
}

/**
 * writeSkillProgress
 * @description Persist per-skill progress to localStorage under canonical JSON format.
 * @param id staff id (or hireUid)
 * @param skill skill name
 * @param pct percent 0..100
 */
export function writeSkillProgress(id: string, skill: string, pct: number): void {
  try {
    const key = buildKey(id, skill);
    const obj = { pct: Math.max(0, Math.min(100, Math.round(Number(pct) || 0))), updatedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(obj));
  } catch {
    // ignore storage failures
  }
}

/**
 * readSkillProgress
 * @description Read persisted per-skill progress. Returns integer percent or null when missing.
 * @param id staff id (or hireUid)
 * @param skill skill name
 */
export function readSkillProgress(id: string, skill: string): number | null {
  try {
    const key = buildKey(id, skill);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.pct === 'number') {
        return Math.max(0, Math.min(100, Math.round(parsed.pct)));
      }
      if (typeof parsed === 'number') return Math.max(0, Math.min(100, Math.round(parsed)));
    } catch {
      // Not JSON, try numeric parse
      const n = Number(raw);
      if (!Number.isNaN(n)) return Math.max(0, Math.min(100, Math.round(n)));
    }
    return null;
  } catch {
    return null;
  }
}