/**
 * Storage migration utilities for multi-device development
 */

interface StorageVersion {
  version: string;
  deviceId: string;
  timestamp: number;
}

export const getCurrentDeviceId = (): string => {
  let deviceId = localStorage.getItem('tm_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('tm_device_id', deviceId);
  }
  return deviceId;
};

export const checkAndCleanStorage = (): boolean => {
  const deviceId = getCurrentDeviceId();
  const lastDeviceId = sessionStorage.getItem('tm_last_device_id');
  
  // Clear session data if switching devices
  if (lastDeviceId && lastDeviceId !== deviceId) {
    console.log('🔄 Device change detected, clearing session storage');
    sessionStorage.clear();
    // Optionally clear localStorage items that might cause conflicts
    const itemsToClear = [
      'tm_current_user',
      'tm_job_market',
      'tm_user_state_*',
      'tm_admin_state'
    ];
    
    itemsToClear.forEach(pattern => {
      if (pattern.includes('*')) {
        // Handle wildcards
        const prefix = pattern.replace('*', '');
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            localStorage.removeItem(key);
          }
        }
      } else {
        localStorage.removeItem(pattern);
      }
    });
    
    sessionStorage.setItem('tm_last_device_id', deviceId);
    return true; // Storage was cleaned
  }
  
  sessionStorage.setItem('tm_last_device_id', deviceId);
  return false; // No cleaning needed
};

export const exportGameData = (): string => {
  const exportData: any = {
    timestamp: Date.now(),
    deviceId: getCurrentDeviceId(),
    data: {}
  };
  
  // Export all relevant storage items
  const keysToExport = [
    'tm_users',
    'tm_admin_state',
    'tm_job_market',
    'tm_device_id'
  ];
  
  keysToExport.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      exportData.data[key] = value;
    }
  });
  
  // Export user-specific states
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('tm_user_state_') || key.startsWith('tm_admin_state'))) {
      exportData.data[key] = localStorage.getItem(key);
    }
  }
  
  return JSON.stringify(exportData, null, 2);
};

export const importGameData = (jsonData: string): { success: boolean; message: string } => {
  try {
    const importData = JSON.parse(jsonData);
    
    if (!importData.data) {
      return { success: false, message: 'Invalid save data format' };
    }
    
    // Clear existing data before import
    const keysToClear = [
      'tm_users',
      'tm_admin_state',
      'tm_job_market'
    ];
    
    keysToClear.forEach(key => localStorage.removeItem(key));
    
    // Clear user-specific states
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('tm_user_state_') || key.startsWith('tm_admin_state'))) {
        localStorage.removeItem(key);
      }
    }
    
    // Import new data
    Object.entries(importData.data).forEach(([key, value]) => {
      if (value) {
        localStorage.setItem(key, String(value));
      }
    });
    
    // Update device ID to current device
    localStorage.setItem('tm_device_id', getCurrentDeviceId());
    
    return { success: true, message: 'Game data imported successfully!' };
    
  } catch (error) {
    return { success: false, message: 'Failed to import game data' };
  }
};
