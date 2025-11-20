/**
 * Test page for distance calculation and job generation system
 */

import React from 'react';
import DistanceTest from '../components/test/DistanceTest';

export default function TestDistance() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">System Testing</h1>
        <p className="text-gray-600 mt-2">
          Professional testing suite for distance calculation and job generation systems
        </p>
      </div>
      
      <DistanceTest />
    </div>
  );
}
