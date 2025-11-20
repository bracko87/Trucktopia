/**
 * StaffPanel.tsx
 *
 * File-level:
 * Top-level staff panel that selects and renders a role-specific panel.
 * Keeps a single responsibility: choose the right role component.
 */

import React from 'react';
import type { StaffData } from './types';
import ManagerPanel from './RolePanels/ManagerPanel';
import DriverPanel from './RolePanels/DriverPanel';
import MechanicPanel from './RolePanels/MechanicPanel';
import DispatcherPanel from './RolePanels/DispatcherPanel';

/**
 * StaffPanelProps
 * @description Props for StaffPanel
 */
export interface StaffPanelProps {
  /** Staff entry data */
  data: StaffData;
  /** Optional action callback used by role panels */
  onAction?: (action: string, staffId: string) => void;
}

/**
 * StaffPanel
 * @description Selects and renders the appropriate role panel for a staff member.
 */
const StaffPanel: React.FC<StaffPanelProps> = ({ data, onAction }) => {
  const handleAction = (action: string) => {
    onAction?.(action, data.id);
  };

  switch (data.role) {
    case 'manager':
      return <ManagerPanel data={data} onAction={(a) => handleAction(a)} />;
    case 'driver':
      return <DriverPanel data={data} onAction={(a) => handleAction(a)} />;
    case 'mechanic':
      return <MechanicPanel data={data} onAction={(a) => handleAction(a)} />;
    case 'dispatcher':
      return <DispatcherPanel data={data} onAction={(a) => handleAction(a)} />;
    default:
      return null;
  }
};

export default StaffPanel;