
/**
 * CompanyPersistenceSync.tsx
 * Background helper to sync local game state with Supabase DB.
 */
import React, { useEffect } from 'react';
import { useGame } from '../../contexts/GameContext';

const CompanyPersistenceSync: React.FC = () => {
  const { gameState, createCompany } = useGame();

  useEffect(() => {
    const syncFromDb = async () => {
      if (!gameState.isAuthenticated || !gameState.currentUser) return;

      try {
        // Fetch latest company data from database
        const response = await fetch(`/.netlify/functions/supabase-config`); // We'll use a new helper to get data
        // For now, we'll create a simple relay to get the specific company
        const getRes = await fetch(`/.netlify/functions/get-company?email=${gameState.currentUser}`);
        
        if (getRes.ok) {
          const dbData = await getRes.json();
          if (dbData && dbData.id) {
            // Update local state with DB values (Balance, Level, Name)
            // We preserve local arrays (trucks, staff) for now to avoid wipes
            const updatedCompany = {
              ...gameState.company,
              name: dbData.name,
              balance: dbData.balance,
              capital: dbData.capital,
              level: dbData.level || 'seed',
              reputation: dbData.reputation || 0,
              hub: {
                ...gameState.company?.hub,
                name: dbData.hub_name,
                country: dbData.hub_country
              }
            };
            
            // Only update if there's a difference to avoid infinite loops
            if (JSON.stringify(gameState.company?.balance) !== JSON.stringify(dbData.balance)) {
                console.log('Syncing balance from DB:', dbData.balance);
                createCompany(updatedCompany as any);
            }
          }
        }
      } catch (err) {
        console.warn('Sync from DB failed', err);
      }
    };

    // Initial sync
    syncFromDb();
    
    // Poll every 30 seconds
    const interval = setInterval(syncFromDb, 30000);
    return () => clearInterval(interval);
  }, [gameState.isAuthenticated, gameState.currentUser]);

  return null;
};

export default CompanyPersistenceSync;
