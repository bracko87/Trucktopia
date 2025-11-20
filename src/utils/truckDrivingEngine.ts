/**
 * Truck Driving Engine - Complete truck movement and logistics simulation
 * Handles truck movement, fuel consumption, driver hours, condition, mileage
 *
 * Extended to:
 * - Accept per-truck specs including speed/durability/reliability/maintenanceGroup
 * - Store truck specs locally when initializeTruck is called
 * - Call incident engine on live updates to evaluate breakdown risk
 */

/**
 * NOTE:
 * - This file replaces/extends the previous engine implementation to integrate
 *   basic incident checks and support truck-level speed overrides.
 */

/**
 * TruckDrivingState
 * @description Runtime driving state for a truck
 */
interface TruckDrivingState {
  isDriving: boolean;
  currentDriverId: string | null;
  brakeDriverId: string | null;
  drivingSince: number | null; // timestamp
  lastUpdate: number; // timestamp
  driver1Hours: number; // hours driven today
  driver2Hours: number; // hours driven today
  lastBrakeTime: number; // timestamp when brake was taken
  currentSpeed: number; // km/h
  totalDistance: number; // km driven in current session
  route: {
    from: string;
    to: string;
    distance: number;
    startTime: number;
  } | null;
}

/**
 * TruckSpecs
 * @description Per-truck specifications stored by the engine to be used by updates.
 */
interface TruckSpecs {
  id: string;
  type?: 'small' | 'medium' | 'heavy';
  fuelConsumption?: number; // litres per 100 km
  maxFuel?: number; // litres
  currentFuel?: number; // litres
  condition?: number; // 0-100
  mileage?: number; // total km
  location?: string;
  /** reliability: A | B | C */
  reliability?: 'A' | 'B' | 'C';
  /** durability 1-10 */
  durability?: number;
  /** preferred cruising speed in km/h */
  speed?: number;
  maintenanceGroup?: 1 | 2 | 3;
}

/**
 * DriverState
 * @description Basic driver runtime info used by the engine
 */
interface DriverState {
  id: string;
  name: string;
  hoursDrivenToday: number;
  lastBrakeTime: number;
  isOnBrake: boolean;
  currentTruckId: string | null;
}

/* -------------------------------------------------------------------------- */
/* Imports (incident engine)                                                   */
/* -------------------------------------------------------------------------- */
import { incidentEngine } from './incidentEngine';

/* -------------------------------------------------------------------------- */
/* TruckDrivingEngine Implementation                                           */
/* -------------------------------------------------------------------------- */
class TruckDrivingEngine {
  private static instance: TruckDrivingEngine;
  private truckStates: Map<string, TruckDrivingState> = new Map();
  private truckSpecs: Map<string, TruckSpecs> = new Map();
  private driverStates: Map<string, DriverState> = new Map();
  private updateInterval: number | null = null;
  private lastSaveTime: number = 0;

  // Configuration constants
  private readonly AVERAGE_SPEEDS = {
    small: 75,
    medium: 70,
    heavy: 65
  };
  private readonly CONDITION_DEGRADATION_PER_KM = 0.01; // 0.01% per km
  private readonly MAX_DRIVING_HOURS = 6; // hours before mandatory brake
  private readonly MIN_BRAKE_DURATION = 3600000; // 1 hour in milliseconds
  private readonly SAVE_INTERVAL = 60000; // Save every minute
  private readonly UPDATE_INTERVAL = 2000; // Update every 2 seconds

  private constructor() {
    this.loadStates();
    this.startEngine();
  }

  static getInstance(): TruckDrivingEngine {
    if (!TruckDrivingEngine.instance) {
      TruckDrivingEngine.instance = new TruckDrivingEngine();
    }
    return TruckDrivingEngine.instance;
  }

  /**
   * Initialize truck driving state and store specs
   * @param truckId - truck identifier
   * @param specs - optional truck specs (capacity, brand, speed, reliability etc.)
   */
  initializeTruck(truckId: string, specs: Partial<TruckSpecs> = {}): void {
    const truckType = this.determineTruckType(specs.capacity || 15, specs.brand || '');
    const fuelConsumption = specs.fuelConsumption || this.getFuelConsumptionRate(truckType);

    const state: TruckDrivingState = {
      isDriving: false,
      currentDriverId: null,
      brakeDriverId: null,
      drivingSince: null,
      lastUpdate: Date.now(),
      driver1Hours: 0,
      driver2Hours: 0,
      lastBrakeTime: 0,
      currentSpeed: specs.speed || this.AVERAGE_SPEEDS[truckType],
      totalDistance: 0,
      route: null
    };

    const fullSpecs: TruckSpecs = {
      id: truckId,
      type: truckType,
      fuelConsumption,
      maxFuel: specs.maxFuel || 100,
      currentFuel: typeof specs.currentFuel === 'number' ? specs.currentFuel : 75,
      condition: typeof specs.condition === 'number' ? specs.condition : 100,
      mileage: typeof specs.mileage === 'number' ? specs.mileage : 0,
      location: specs.location || 'Hub',
      reliability: specs.reliability,
      durability: specs.durability,
      speed: specs.speed,
      maintenanceGroup: specs.maintenanceGroup
    };

    this.truckStates.set(truckId, state);
    this.truckSpecs.set(truckId, fullSpecs);
  }

  /**
   * Start driving with specified route
   * @param truckId - truck identifier
   * @param driver1Id - primary driver id
   * @param driver2Id - optional second driver id (for breaks)
   * @param from - origin
   * @param to - destination
   * @param distance - route distance (km)
   */
  startDriving(truckId: string, driver1Id: string, driver2Id: string | null = null, from: string, to: string, distance: number): void {
    let state = this.truckStates.get(truckId);
    if (!state) {
      // initialize with defaults when not present
      this.initializeTruck(truckId, { capacity: 15 });
      state = this.truckStates.get(truckId) as TruckDrivingState;
    }

    // Ensure drivers exist in state map
    const driver1State = this.driverStates.get(driver1Id) || { id: driver1Id, name: 'Driver', hoursDrivenToday: 0, lastBrakeTime: 0, isOnBrake: false, currentTruckId: null };
    const driver2State = driver2Id ? (this.driverStates.get(driver2Id) || { id: driver2Id, name: 'Driver2', hoursDrivenToday: 0, lastBrakeTime: 0, isOnBrake: false, currentTruckId: null }) : null;

    // Check driver availability
    if (driver1State.isOnBrake || (driver2State && driver2State.isOnBrake)) {
      console.log('Cannot start driving - driver on break');
      return;
    }

    if (driver1State.hoursDrivenToday >= this.MAX_DRIVING_HOURS || (driver2State && driver2State.hoursDrivenToday >= this.MAX_DRIVING_HOURS)) {
      console.log('Cannot start driving - driver exceeded max daily hours');
      return;
    }

    const now = Date.now();

    state.isDriving = true;
    state.currentDriverId = driver1Id;
    state.brakeDriverId = driver2Id;
    state.drivingSince = now;
    state.lastUpdate = now;
    state.driver1Hours = driver1State.hoursDrivenToday || 0;
    state.driver2Hours = driver2State?.hoursDrivenToday || 0;
    state.lastBrakeTime = 0;
    // Use truck-specific speed if available (set earlier in initializeTruck), otherwise average
    state.currentSpeed = state.currentSpeed || this.AVERAGE_SPEEDS[this.determineTruckType(15, '')] || this.AVERAGE_SPEEDS.medium;
    state.totalDistance = 0;
    state.route = {
      from,
      to,
      distance,
      startTime: now
    };

    // Update driver states
    driver1State.currentTruckId = truckId;
    driver1State.isOnBrake = false;
    this.driverStates.set(driver1Id, driver1State);

    if (driver2State && driver2Id) {
      driver2State.currentTruckId = truckId;
      driver2State.isOnBrake = false;
      this.driverStates.set(driver2Id, driver2State);
    }

    this.truckStates.set(truckId, state);
  }

  /**
   * Stop driving and clear route
   * @param truckId - truck identifier
   */
  stopDriving(truckId: string): void {
    const state = this.truckStates.get(truckId);
    if (!state) return;

    state.isDriving = false;
    state.currentSpeed = 0;
    state.route = null;

    // Clear driver assignments
    if (state.currentDriverId) {
      const d1 = this.driverStates.get(state.currentDriverId);
      if (d1) {
        d1.currentTruckId = null;
        this.driverStates.set(state.currentDriverId, d1);
      }
    }
    if (state.brakeDriverId) {
      const d2 = this.driverStates.get(state.brakeDriverId);
      if (d2) {
        d2.currentTruckId = null;
        this.driverStates.set(state.brakeDriverId, d2);
      }
    }

    this.truckStates.set(truckId, state);
  }

  /**
   * Take brake for a driver (update driver & truck state)
   * @param driverId - driver identifier
   */
  takeBrake(driverId: string): void {
    const driverState = this.driverStates.get(driverId);
    if (!driverState) return;

    const now = Date.now();
    const timeSinceLastBrake = now - (driverState.lastBrakeTime || 0);
    if (timeSinceLastBrake < this.MIN_BRAKE_DURATION) {
      console.log(`Driver ${driverId} must wait before next brake`);
      return;
    }
    driverState.isOnBrake = true;
    driverState.lastBrakeTime = now;
    this.driverStates.set(driverId, driverState);

    // Swap drivers if needed on truck
    const truckId = driverState.currentTruckId;
    if (truckId) {
      const truckState = this.truckStates.get(truckId);
      if (truckState && truckState.isDriving) {
        if (truckState.currentDriverId === driverId && truckState.brakeDriverId) {
          truckState.currentDriverId = truckState.brakeDriverId;
          truckState.brakeDriverId = driverId;
        } else if (truckState.brakeDriverId === driverId && truckState.currentDriverId) {
          truckState.brakeDriverId = null;
        } else {
          this.stopDriving(truckId);
        }
        this.truckStates.set(truckId, truckState);
      }
    }
  }

  /**
   * End brake for driver
   * @param driverId - driver id
   */
  endBreak(driverId: string): void {
    const driverState = this.driverStates.get(driverId);
    if (!driverState) return;

    const brakeDuration = Date.now() - (driverState.lastBrakeTime || 0);
    if (brakeDuration < this.MIN_BRAKE_DURATION) {
      console.log(`Driver ${driverId} must take minimum 1 hour break`);
      return;
    }

    driverState.isOnBrake = false;
    driverState.hoursDrivenToday = 0; // reset daily hours after full break
    this.driverStates.set(driverId, driverState);
    console.log(`Driver ${driverId} completed break`);
  }

  /**
   * Update all trucks in real time
   * - Handles condition degradation, fuel consumption, mileage
   * - Emits 'truckLiveUpdate' event for game integration
   * - Calls incident engine with per-update distances
   */
  private updateAllTrucks(): void {
    const now = Date.now();

    this.checkDailyReset(now);

    for (const [truckId, state] of this.truckStates) {
      if (!state.isDriving || !state.drivingSince) continue;

      const timeDiff = (now - state.lastUpdate) / 1000; // seconds
      const distanceCovered = (state.currentSpeed * timeDiff) / 3600; // km

      // Update runtime values
      state.totalDistance += distanceCovered;
      state.lastUpdate = now;

      // Emit live updates for game state
      this.processLiveUpdates(truckId, distanceCovered, state);

      // Update driver hours
      const hoursDriven = timeDiff / 3600;
      if (state.currentDriverId) {
        const d1 = this.driverStates.get(state.currentDriverId);
        if (d1 && !d1.isOnBrake) {
          d1.hoursDrivenToday += hoursDriven;
          this.driverStates.set(state.currentDriverId, d1);
        }
      }

      // Check route completion
      if (state.route && state.totalDistance >= state.route.distance) {
        this.completeRoute(truckId);
        continue;
      }

      // Check mandatory brakes
      if (state.currentDriverId) {
        const d1 = this.driverStates.get(state.currentDriverId);
        if (d1 && d1.hoursDrivenToday >= this.MAX_DRIVING_HOURS) {
          console.log(`Driver ${state.currentDriverId} reached max hours, taking brake`);
          this.takeBrake(state.currentDriverId);
        }
      }

      this.truckStates.set(truckId, state);
    }
  }

  /**
   * Internal: process live updates - emits event + run incident checks
   */
  private processLiveUpdates(truckId: string, distanceCovered: number, state?: TruckDrivingState): void {
    const s = state || this.truckStates.get(truckId);
    if (!s || distanceCovered <= 0) return;

    // Condition degradation
    const conditionDegradation = distanceCovered * this.CONDITION_DEGRADATION_PER_KM;
    const mileageIncrement = distanceCovered;
    const fuelConsumption = this.getLiveFuelConsumption(truckId);

    // Dispatch generic live update event
    try {
      window.dispatchEvent(new CustomEvent('truckLiveUpdate', {
        detail: {
          truckId,
          distanceCovered,
          updates: {
            condition: {
              truck: conditionDegradation,
              trailer: conditionDegradation
            },
            mileage: mileageIncrement,
            fuel: fuelConsumption * (this.UPDATE_INTERVAL / 1000 / 3600), // approximate per update
            currentSpeed: s.currentSpeed,
            totalDistance: s.totalDistance,
            route: s.route
          }
        }
      }));
    } catch (e) {
      // ignore
    }

    // Call incident engine using available truck specs & driver state
    const specs = this.truckSpecs.get(truckId) || null;
    const driver = s.currentDriverId ? this.driverStates.get(s.currentDriverId) || null : null;

    try {
      if (specs) {
        // Create minimal shapes expected by incidentEngine
        const truckMin = {
          id: truckId,
          reliability: specs.reliability,
          durability: specs.durability,
          condition: specs.condition
        };
        const driverMin = driver ? {
          id: driver.id,
          hoursDrivenToday: driver.hoursDrivenToday,
          isOnBrake: driver.isOnBrake,
          isFit: driver.hoursDrivenToday < 6 // heuristic
        } : null;

        const res = incidentEngine.evaluateAndMaybeTrigger(truckMin, driverMin, distanceCovered);
        if (res && res.triggered) {
          // when incident occurs, we can also update specs.condition to reflect damage
          if (specs.condition) {
            specs.condition = Math.max(0, specs.condition - (res.detail?.severity ? Math.round(res.detail.severity / 6) : 5));
            this.truckSpecs.set(truckId, specs);
          }
        }
      }
    } catch (err) {
      // ignore errors from incident subsystem
      console.error('Incident engine error', err);
    }
  }

  /**
   * Complete a route and handle arrival
   * @param truckId - truck identifier
   */
  private completeRoute(truckId: string): void {
    const state = this.truckStates.get(truckId);
    if (!state || !state.route) return;

    // Update location to destination
    this.updateTruckLocation(truckId, state.route.to);

    // Stop driving
    this.stopDriving(truckId);

    // Notify game system
    this.notifyRouteCompleted(truckId, state.route);
  }

  /**
   * Update truck location (to be integrated with game state)
   * @param truckId - truck id
   * @param location - new location name
   */
  private updateTruckLocation(truckId: string, location: string): void {
    try {
      window.dispatchEvent(new CustomEvent('truckLocationUpdate', {
        detail: { truckId, location, distance: this.truckStates.get(truckId)?.totalDistance || 0 }
      }));
    } catch (e) { /* ignore */ }
  }

  /**
   * Notify game system of route completion
   * @param truckId - truck id
   * @param route - route info
   */
  private notifyRouteCompleted(truckId: string, route: any): void {
    try {
      window.dispatchEvent(new CustomEvent('routeCompleted', { detail: { truckId, route } }));
    } catch (e) { /* ignore */ }
  }

  /**
   * Check and reset daily hours at midnight (simplified)
   * @param now - timestamp
   */
  private checkDailyReset(now: number): void {
    const lastReset = localStorage.getItem('truck_engine_last_reset') || '0';
    const lastResetTime = parseInt(lastReset);

    // Reset once per 24h window
    if (now - lastResetTime > 24 * 60 * 60 * 1000) {
      for (const [driverId, driverState] of this.driverStates) {
        driverState.hoursDrivenToday = 0;
        driverState.isOnBrake = false;
        this.driverStates.set(driverId, driverState);
      }
      localStorage.setItem('truck_engine_last_reset', now.toString());
      console.log('Daily driver hours reset');
    }
  }

  /**
   * Get truck current state
   */
  getTruckState(truckId: string): TruckDrivingState | null {
    return this.truckStates.get(truckId) || null;
  }

  /**
   * Get driver current state
   */
  getDriverState(driverId: string): DriverState | null {
    return this.driverStates.get(driverId) || null;
  }

  /**
   * Calculate fuel consumption used for live updates (litres per hour at current speed)
   */
  getLiveFuelConsumption(truckId: string): number {
    const state = this.truckStates.get(truckId);
    if (!state || !state.isDriving) return 0;

    const specs = this.truckSpecs.get(truckId);
    const truckType = (specs && specs.type) ? specs.type : 'medium';
    const consumptionRate = specs && specs.fuelConsumption ? specs.fuelConsumption : this.getFuelConsumptionRate(truckType);
    const currentSpeed = state.currentSpeed;
    const litersPerKm = consumptionRate / 100;
    return currentSpeed * litersPerKm; // litres per hour (approx)
  }

  /**
   * Get current fuel status (fallback)
   */
  getCurrentFuelStatus(truckId: string) {
    const specs = this.truckSpecs.get(truckId);
    if (!specs) return { currentFuel: 0, maxFuel: 100, consumptionRate: 25, estimatedRange: 0 };

    const consumptionRate = specs.fuelConsumption || this.getFuelConsumptionRate(specs.type || 'medium');
    const currentFuel = specs.currentFuel || 75;
    const maxFuel = specs.maxFuel || 100;
    const estimatedRange = currentFuel > 0 ? (currentFuel / consumptionRate) * 100 : 0;

    return {
      currentFuel,
      maxFuel,
      consumptionRate: consumptionRate,
      estimatedRange
    };
  }

  /**
   * Fuel consumption by truck type
   * @param truckType - small|medium|heavy
   */
  private getFuelConsumptionRate(truckType: string): number {
    switch (truckType.toLowerCase()) {
      case 'small':
        return 7 + Math.random() * 5; // 7-12 L/100km
      case 'medium':
        return 25 + Math.random() * 5; // 25-30
      case 'heavy':
        return 30 + Math.random() * 3; // 30-33
      default:
        return 25;
    }
  }

  /**
   * Determine truck type based on capacity
   */
  private determineTruckType(capacity: number, brand: string): 'small' | 'medium' | 'heavy' {
    if (capacity <= 10) return 'small';
    if (capacity <= 20) return 'medium';
    return 'heavy';
  }

  /**
   * Calculate fuel based on distance
   */
  calculateFuelConsumption(truckId: string, distance: number): number {
    const specs = this.truckSpecs.get(truckId);
    const truckType = specs?.type || 'medium';
    const consumptionRate = specs?.fuelConsumption || this.getFuelConsumptionRate(truckType);
    const modifier = 1.0;
    return (distance * consumptionRate / 100) * modifier;
  }

  /**
   * Calculate condition degradation
   */
  calculateConditionDegradation(truckId: string, distance: number): number {
    return distance * this.CONDITION_DEGRADATION_PER_KM;
  }

  /**
   * Save states to localStorage
   */
  private saveStates(): void {
    const now = Date.now();
    if (now - this.lastSaveTime < this.SAVE_INTERVAL) return;

    try {
      const truckStatesData = Object.fromEntries(this.truckStates);
      const driverStatesData = Object.fromEntries(this.driverStates);
      localStorage.setItem('truck_driving_states', JSON.stringify(truckStatesData));
      localStorage.setItem('truck_driver_states', JSON.stringify(driverStatesData));
      this.lastSaveTime = now;
    } catch (error) {
      console.error('Failed to save truck driving states:', error);
    }
  }

  /**
   * Load states from localStorage
   */
  private loadStates(): void {
    try {
      const truckStatesData = localStorage.getItem('truck_driving_states');
      const driverStatesData = localStorage.getItem('truck_driver_states');

      if (truckStatesData) {
        const parsed = JSON.parse(truckStatesData);
        // convert back to Map - note: values were serialized, may need retyping
        this.truckStates = new Map(Object.entries(parsed) as any);
      }

      if (driverStatesData) {
        const parsed = JSON.parse(driverStatesData);
        this.driverStates = new Map(Object.entries(parsed) as any);
      }
    } catch (error) {
      console.error('Failed to load truck driving states:', error);
    }
  }

  /**
   * Start the engine timer
   */
  private startEngine(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.updateInterval = window.setInterval(() => {
      this.updateAllTrucks();
      this.saveStates();
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Get engine stats
   */
  getEngineStats(): any {
    const stats = {
      totalTrucks: this.truckStates.size,
      drivingTrucks: 0,
      totalDrivers: this.driverStates.size,
      driversOnBrake: 0,
      averageSpeed: this.AVERAGE_SPEEDS.medium,
      engineUptime: Date.now() - (parseInt(localStorage.getItem('truck_engine_start_time') || Date.now().toString()))
    };

    for (const state of this.truckStates.values()) {
      if (state.isDriving) stats.drivingTrucks++;
    }
    for (const state of this.driverStates.values()) {
      if (state.isOnBrake) stats.driversOnBrake++;
    }
    return stats;
  }

  /**
   * Destroy engine
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

/* Export singleton */
const truckDrivingEngine = TruckDrivingEngine.getInstance();
export { truckDrivingEngine };
export type { TruckDrivingState, DriverState, TruckSpecs };