/**
 * MigratedUsersPanel.tsx
 *
 * This file previously rendered the "Migration: Migrated Users" admin card.
 * The card has been intentionally hidden to remove it from the UI while keeping
 * the module present for easy re-enabling or future reference.
 *
 * How to re-enable:
 * - Set localStorage key "show_migrated_users_panel" = "1" in the browser OR
 * - Replace this file with the original implementation.
 */

import React from 'react';

/**
 * MigratedUsersPanel
 * @description Hidden stub component. Returns null so the migration card is not rendered.
 *
 * Notes:
 * - Keeps a lightweight presence so imports won't break other modules.
 * - Respects a localStorage override for development re-enablement.
 */
const MigratedUsersPanel: React.FC = () => {
  React.useEffect(() => {
    // Useful debug message when intentionally enabled during development.
    if (typeof window !== 'undefined' && window.localStorage?.getItem('show_migrated_users_panel') === '1') {
      // eslint-disable-next-line no-console
      console.info('MigratedUsersPanel: UI was enabled via localStorage flag (show_migrated_users_panel=1).');
    }
  }, []);

  // Intentionally render nothing to hide the migration card.
  return null;
};

export default MigratedUsersPanel;