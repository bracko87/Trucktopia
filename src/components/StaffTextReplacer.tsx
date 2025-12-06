/**
 * StaffTextReplacer.tsx
 *
 * Lightweight side-effect module that performs safe, non-destructive textual
 * replacements for common staff-related UI strings. This avoids build/runtime
 * failures when App.tsx imports the module for DOM/text tweaks.
 *
 * Responsibilities:
 * - Run only in browser contexts (guarded by typeof window).
 * - Perform best-effort, low-risk text replacements that do not change layout.
 * - Be silent and resilient to failures.
 *
 * NOTE: This module is a shim to satisfy the side-effect import in App.tsx and
 * intentionally avoids heavy logic.
 */

/**
 * runSafeTextPatches
 * @description Find common text nodes in the DOM and perform small, safe
 *   replacements (e.g. remove debug labels). Execution is guarded for browser only.
 */
function runSafeTextPatches(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    // Delay so the initial app render completes
    requestAnimationFrame(() => {
      try {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null as any, false);
        const toReplace: Array<{ node: Text; original: string; replaced: string }> = [];
        let node: Text | null = walker.nextNode() as Text | null;
        while (node) {
          const text = node.nodeValue || '';
          // Heuristic: remove tiny debug labels often injected by dev helpers (best-effort)
          if (text.includes('DEBUG_BUTTON') || text.includes('INLINE_FIRE_TEST_BUTTON')) {
            toReplace.push({ node, original: text, replaced: text.replace(/DEBUG_BUTTON|INLINE_FIRE_TEST_BUTTON/g, '') });
          }
          node = walker.nextNode() as Text | null;
        }
        toReplace.forEach(({ node, replaced }) => {
          node.nodeValue = replaced;
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.debug('StaffTextReplacer: patch error', err);
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.debug('StaffTextReplacer: scheduling error', err);
  }
}

// Run immediately in browser contexts.
runSafeTextPatches();

// Intentionally no exports. Side-effect module only.