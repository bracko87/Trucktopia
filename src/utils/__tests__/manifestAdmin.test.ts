/**
 * manifestAdmin.test.ts
 *
 * Simple manifest presence assertions for CI / developer checks.
 *
 * This test is runner-agnostic: run with ts-node or adapt to your test runner.
 *
 * Usage:
 *  - npx ts-node src/utils/__tests__/manifestAdmin.test.ts
 *  - or add to CI to ensure required entries are present.
 */

import assert from 'assert';
import manifestDefault from '../../data/game-rules-engines';

const manifest = manifestDefault as { gameRules?: any[]; engines?: any[]; cronJobs?: any[] };

function findById<T extends { id?: string }>(items: T[] | undefined, id: string): T | undefined {
  if (!Array.isArray(items)) return undefined;
  return items.find(i => i.id === id);
}

function runChecks() {
  assert(manifest, 'Manifest default export missing');

  // Required ids introduced by recent change
  const requiredRuleIds = ['GR-010', 'GR-011'];
  const requiredEngineIds = ['E-018'];
  const requiredCronIds = ['C-013'];

  for (const id of requiredRuleIds) {
    const r = findById(manifest.gameRules, id);
    assert(r, `Manifest missing required game rule: ${id}`);
  }

  for (const id of requiredEngineIds) {
    const e = findById(manifest.engines, id);
    assert(e, `Manifest missing required engine: ${id}`);
  }

  for (const id of requiredCronIds) {
    const c = findById(manifest.cronJobs, id);
    assert(c, `Manifest missing required cron job: ${id}`);
  }

  // If all assertions pass:
  // eslint-disable-next-line no-console
  console.log('Manifest admin checks passed — required entries found:', [
    ...requiredRuleIds,
    ...requiredEngineIds,
    ...requiredCronIds
  ]);
}

if (require.main === module) {
  try {
    runChecks();
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Manifest admin check failed:', err instanceof Error ? err.message : err);
    process.exit(2);
  }
}

export { runChecks };