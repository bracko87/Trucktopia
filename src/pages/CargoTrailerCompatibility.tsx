/**
 * Cargo Trailer Compatibility Page
 * Comprehensive guide for cargo and trailer compatibility
 */

import React from 'react';
import Layout from '../components/layout/Layout';
import CargoTrailerMatrix from '../components/cargo/CargoTrailerMatrix';

const CargoTrailerCompatibility: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <CargoTrailerMatrix />
      </div>
    </Layout>
  );
};

export default CargoTrailerCompatibility;
