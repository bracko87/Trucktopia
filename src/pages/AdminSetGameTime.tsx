/**
 * AdminSetGameTime.tsx
 *
 * Simple page wrapper that renders the SetGameTimePanel inside the app layout.
 * This file provides a route target that can be mounted under /admin/set-game-time.
 */

import React from 'react';
import SetGameTimePanel from '../components/admin/SetGameTimePanel';

/**
 * AdminSetGameTime
 * @description Route page for admins to update server game time.
 */
const AdminSetGameTime: React.FC = () => {
  return (
    <div className="p-6">
      <SetGameTimePanel />
    </div>
  );
};

export default AdminSetGameTime;