/**
 * Game type definitions for Truck Manager Simulator
 */

export type GamePage = 
  | 'dashboard' 
  | 'trucks' 
  | 'trailers' 
  | 'staff' 
  | 'market' 
  | 'jobs' 
  | 'finances' 
  | 'map';

export interface Company {
  id: string;
  name: string;
  level: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  capital: number;
  reputation: number;
  employees: number;
  founded: Date;
  hub: HubLocation;
  trucks: Truck[];
  trailers: Trailer[];
  staff: StaffMember[];
  contracts: Contract[];
  activeJobs: ActiveJob[];
  logo: string | null;
}

export interface HubLocation {
  id: string;
  name: string;
  country: string;
  region: string;
  capacity: number;
  level: number;
  cost: number;
}

export interface Truck {
  id: string;
  model: string;
  brand: string;
  year: number;
  condition: number; // 0-100
  fuel: number; // 0-100
  location: string;
  driver: string | null;
  purchasePrice: number;
  maintenanceCost: number;
  status: 'available' | 'on-job' | 'maintenance';
}

export interface Trailer {
  id: string;
  type: 'flatbed' | 'refrigerated' | 'tanker' | 'container' | 'lowboy';
  capacity: number; // tons
  condition: number; // 0-100
  location: string;
  assignedTruck: string | null;
  purchasePrice: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'driver' | 'mechanic' | 'manager' | 'dispatcher';
  salary: number;
  experience: number; // 0-100
  skills: string[];
  assignedTo: string | null;
  hiredDate: Date;
}

export interface Contract {
  id: string;
  title: string;
  client: string;
  value: number;
  distance: number; // km
  origin: string;
  destination: string;
  deadline: Date;
  requirements: {
    truckType: string;
    trailerType: string;
    experience: number;
  };
  status: 'available' | 'accepted' | 'completed';
}

export interface ActiveJob {
  id: string;
  title: string;
  contractId: string;
  assignedTruck: string;
  assignedTrailer: string;
  assignedDriver: string;
  startTime: Date;
  estimatedCompletion: Date;
  progress: number; // 0-100
  currentLocation: string;
  status: 'loading' | 'in-transit' | 'unloading' | 'completed' | 'cancelled';
  value: number;
  distance: number;
  origin: string;
  destination: string;
  deadline: string;
  cargoType: string;
  weight: number;
}

export interface FinancialRecord {
  id: string;
  date: Date;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
}

export interface GameState {
  isAuthenticated: boolean;
  currentPage: GamePage;
  company: Company | null;
  sidebarCollapsed: boolean;
}