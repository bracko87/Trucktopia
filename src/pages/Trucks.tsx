/**
 * Trucks.tsx
 *
 * Ensure the Trucks page uses the exact same Truck/Trailer section components as Garage
 * so any route that renders trucks will show the updated identical design.
 */

import React from 'react';
import Garage from './Garage';

/**
 * Trucks
 * @description Simple wrapper to preserve existing route /trucks while reusing Garage.
 *              This ensures both pages reflect identical UI changes.
 */
const Trucks: React.FC = () => {
  return <Garage />;
};

export default Trucks;
