/**
 * StaffImageReplacer.tsx
 *
 * Lightweight, safe side-effect module that replaces or normalizes staff images
 * when the app is running in the browser. This is intentionally minimal so it
 * can be imported as a side-effect without causing runtime errors during SSR
 * or during build-time.
 *
 * Responsibilities:
 * - Run only in browser contexts (guarded by typeof window).
 * - Perform DOM-safe no-op / lightweight replacements if specific placeholders
 *   are found. Avoid heavy computation and avoid assuming specific images.
 *
 * NOTE: This module is a small compatibility shim so missing file imports do not
 * break builds. It intentionally avoids any image analysis (not supported in
 * free model) and only performs trivial, safe DOM patches.
 */

/**
 * runSafeImagePatches
 * @description Perform safe DOM patches to staff images (best-effort). This
 *     function is synchronous and guarded so it never runs outside browser.
 */
function runSafeImagePatches(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    // Defer to the next frame so DOM is more likely to be available.
    requestAnimationFrame(() => {
      try {
        // Example safe patch: replace any broken staff avatar img[src=""] with a CSS placeholder.
        const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('img'));
        imgs.forEach((img) => {
          // Only act on images that look like staff avatars (heuristic: class contains 'staff' or 'avatar')
          const cls = img.className || '';
          if ((cls && /(staff|avatar|profile)/i.test(cls)) || /staff|avatar|profile/i.test(img.alt || '')) {
            if (!img.src || img.src.trim() === '') {
              // Apply a visual placeholder using CSS background color and remove src to avoid console noise
              img.style.background = '#0f172a';
              img.style.borderRadius = '6px';
              img.style.objectFit = 'cover';
              img.alt = img.alt || 'Staff avatar';
            }
          }
        });
      } catch (err) {
        // Ignore patch errors - side-effect must be best-effort and silent.
        // eslint-disable-next-line no-console
        console.debug('StaffImageReplacer: patch error', err);
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.debug('StaffImageReplacer: scheduling error', err);
  }
}

// Run immediately in browser contexts.
runSafeImagePatches();

// Intentionally no exports. This file is imported for side-effects only.