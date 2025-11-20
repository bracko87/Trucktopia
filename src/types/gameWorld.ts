/**
 * Game World Configuration Interface
 * Defines the structure for different game worlds
 */

export interface GameWorldConfig {
  id: string;
  name: string;
  description: string;
  region: string;
  currency: string;
  enabled: boolean;
  features: {
    hasCustomTrucks: boolean;
    hasCustomTrailers: boolean;
    hasCustomCargo: boolean;
    hasCustomCities: boolean;
  };
  dataSources: {
    cities: string;
    distances: string;
    cargo: string;
    jobs: string;
    vehicles: string;
  };
}

/**
 * Available game worlds
 */
export const GAME_WORLDS: Record<string, GameWorldConfig> = {
  'euro-asia': {
    id: 'euro-asia',
    name: 'Euro-Asia Transport',
    description: 'Transport across Europe and Asia continents',
    region: 'Europe & Asia',
    currency: 'EUR',
    enabled: true,
    features: {
      hasCustomTrucks: true,
      hasCustomTrailers: true,
      hasCustomCargo: true,
      hasCustomCities: true
    },
    dataSources: {
      cities: '/data/euro-asia/cities.json',
      distances: '/data/euro-asia/distances.json',
      cargo: '/data/euro-asia/cargo.json',
      jobs: '/data/euro-asia/jobs.json',
      vehicles: '/data/euro-asia/vehicles.json'
    }
  },
  'america': {
    id: 'america',
    name: 'American Trucking',
    description: 'Cross-country transport across North and South America',
    region: 'Americas',
    currency: 'USD',
    enabled: false, // Not enabled yet
    features: {
      hasCustomTrucks: true,
      hasCustomTrailers: true,
      hasCustomCargo: true,
      hasCustomCities: true
    },
    dataSources: {
      cities: '/data/america/cities.json',
      distances: '/data/america/distances.json',
      cargo: '/data/america/cargo.json',
      jobs: '/data/america/jobs.json',
      vehicles: '/data/america/vehicles.json'
    }
  }
};

/**
 * Get current active game world
 */
export function getCurrentWorld(): string {
  return localStorage.getItem('tm_current_world') || 'euro-asia';
}

/**
 * Set current active game world
 */
export function setCurrentWorld(worldId: string): void {
  if (GAME_WORLDS[worldId] && GAME_WORLDS[worldId].enabled) {
    localStorage.setItem('tm_current_world', worldId);
  }
}

/**
 * Get current world configuration
 */
export function getWorldConfig(): GameWorldConfig {
  const currentWorld = getCurrentWorld();
  return GAME_WORLDS[currentWorld];
}