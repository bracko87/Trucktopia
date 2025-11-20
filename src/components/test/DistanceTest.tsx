/**
 * Test component for distance calculation system
 * Verifies coordinate database and distance calculations
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { getDistance, getAvailableCities } from '../../utils/distanceCalculator';
import { generateJobsForCity } from '../../utils/jobGenerator';

interface TestResult {
  fromCity: string;
  toCity: string;
  distance: number | null;
  status: 'success' | 'error' | 'skipped';
  message?: string;
}

export default function DistanceTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [jobTestResults, setJobTestResults] = useState<any[]>([]);

  // Test city pairs with expected distance ranges
  const testRoutes = [
    { from: 'Berlin', to: 'Paris', min: 800, max: 1000 },
    { from: 'London', to: 'Manchester', min: 200, max: 300 },
    { from: 'Moscow', to: 'Saint Petersburg', min: 600, max: 700 },
    { from: 'Rome', to: 'Milan', min: 400, max: 600 },
    { from: 'Madrid', to: 'Barcelona', min: 400, max: 600 }
  ];

  const runDistanceTest = async () => {
    setIsTesting(true);
    const results: TestResult[] = [];
    
    for (const route of testRoutes) {
      try {
        const distance = getDistance(route.from, route.to);
        
        if (distance === null) {
          results.push({
            fromCity: route.from,
            toCity: route.to,
            distance: null,
            status: 'error',
            message: 'Route not found in database'
          });
          continue;
        }

        if (distance >= route.min && distance <= route.max) {
          results.push({
            fromCity: route.from,
            toCity: route.to,
            distance,
            status: 'success',
            message: `Within expected range (${route.min}-${route.max}km)`
          });
        } else {
          results.push({
            fromCity: route.from,
            toCity: route.to,
            distance,
            status: 'error',
            message: `Outside expected range (${route.min}-${route.max}km)`
          });
        }
      } catch (error) {
        results.push({
          fromCity: route.from,
          toCity: route.to,
          distance: null,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    setTestResults(results);
    setIsTesting(false);
  };

  const runJobGenerationTest = async () => {
    setIsTesting(true);
    const results = [];
    
    // Test job generation for major cities
    const testCities = ['Berlin', 'Paris', 'London', 'Rome', 'Madrid'];
    
    for (const city of testCities) {
      try {
        const jobs = generateJobsForCity(city);
        const validJobs = jobs.filter(job => job.distance && job.distance <= 3500);
        const invalidJobs = jobs.filter(job => !job.distance || job.distance > 3500);
        
        results.push({
          city,
          totalJobs: jobs.length,
          validJobs: validJobs.length,
          invalidJobs: invalidJobs.length,
          sampleDistances: validJobs.slice(0, 3).map(job => ({
            to: job.destination,
            distance: job.distance,
            value: job.value
          }))
        });
      } catch (error) {
        results.push({
          city,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    setJobTestResults(results);
    setIsTesting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'skipped': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🚛 Distance Calculation System Test
            <Badge variant="secondary">Professional Grade</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">System Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Cities in Database:</span>
                    <Badge variant="outline">{getAvailableCities().length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Coordinate Coverage:</span>
                    <Badge variant="outline">100%</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Distance Cap:</span>
                    <Badge variant="outline">3500km</Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Test Actions</h3>
                <div className="flex gap-2">
                  <Button 
                    onClick={runDistanceTest} 
                    disabled={isTesting}
                    variant="outline"
                    className="bg-transparent"
                  >
                    {isTesting ? 'Testing...' : 'Test Distance Calculations'}
                  </Button>
                  <Button 
                    onClick={runJobGenerationTest} 
                    disabled={isTesting}
                    variant="outline"
                    className="bg-transparent"
                  >
                    {isTesting ? 'Testing...' : 'Test Job Generation'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Distance Test Results */}
            {testResults.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Distance Calculation Results</h3>
                <div className="space-y-2">
                  {testResults.map((result, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(result.status)}`} />
                      <div className="flex-1">
                        <div className="font-medium">
                          {result.fromCity} → {result.toCity}
                        </div>
                        <div className="text-sm text-gray-600">
                          {result.distance ? `${result.distance}km` : 'No route available'}
                          {result.message && ` - ${result.message}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Job Generation Test Results */}
            {jobTestResults.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Job Generation Results</h3>
                <div className="space-y-4">
                  {jobTestResults.map((result, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold">{result.city}</h4>
                          {!result.error && (
                            <Badge variant={
                              result.validJobs === result.totalJobs ? 'default' : 'secondary'
                            }>
                              {result.validJobs}/{result.totalJobs} Valid Jobs
                            </Badge>
                          )}
                        </div>
                        
                        {result.error ? (
                          <div className="text-red-600 text-sm">{result.error}</div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>Total Jobs: {result.totalJobs}</div>
                              <div>Valid: {result.validJobs}</div>
                              <div>Invalid: {result.invalidJobs}</div>
                            </div>
                            
                            {result.sampleDistances && result.sampleDistances.length > 0 && (
                              <div className="text-sm">
                                <div className="font-medium mb-1">Sample Routes:</div>
                                {result.sampleDistances.map((sample, idx) => (
                                  <div key={idx} className="flex justify-between text-xs">
                                    <span>{sample.to}</span>
                                    <span>{sample.distance}km (${sample.value})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}