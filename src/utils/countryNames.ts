/**
 * Comprehensive country name mapping for all cities
 * Uses the complete city-to-country mapping from the uploaded files
 */

/**
 * Get country name by city name using the comprehensive mapping
 */
export function getCountryName(cityName: string): string {
  const country = cityMapping[cityName]?.countryName;
  return country || 'United Kingdom';
}

// Import the comprehensive city mapping
import { cityMapping } from './countryMapping';