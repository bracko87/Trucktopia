
import React, { useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';

/**
 * HubsSynchronizer
 * 
 * Periodically syncs the local game state with the Supabase hubs table
 * via the hub-manager Netlify function.
 */
const HubsSynchronizer: React.FC = () => {
  const { gameState, createCompany } = useGame() as any;

  useEffect(() => {
    if (!gameState.isAuthenticated || !gameState.currentUser) return;

    const syncHubs = async () => {
      try {
        // 1. Run the finalizer to process any completed construction timers
        await fetch('/.netlify/functions/hub-manager', {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'FINALIZE_TASKS', 
            email: gameState.currentUser 
          })
        });

        // 2. Fetch the updated hub list
        const res = await fetch('/.netlify/functions/hub-manager', {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'GET_HUBS', 
            email: gameState.currentUser 
          })
        });

        if (res.ok) {
          const { hubs } = await res.json();
          
          // Only update context if we have a valid company object
          if (gameState.company) {
            createCompany({
              ...gameState.company,
              hubs: hubs || []
            });
          }
        }
      } catch (err) {
        console.error('[HubsSynchronizer] Sync failed:', err);
      }
    };

    // Initial sync
    syncHubs();

    // Poll every 60 seconds to check for construction completions
    const interval = setInterval(syncHubs, 60000);
    return () => clearInterval(interval);
  }, [gameState.currentUser, gameState.isAuthenticated]);

  return null;
};

export default HubsSynchronizer;
