/**
 * incomingDeliveryUtils.test.ts
 *
 * Lightweight test harness for processIncomingDeliveries. This file uses plain assertions
 * and can be executed by a test runner if configured. It is intentionally runner-agnostic.
 *
 * NOTE: The environment may not include a test runner. These tests are provided as a developer aid.
 */

import { processIncomingDeliveries } from '../incomingDeliveryUtils';

/**
 * runBasicTests
 * @description Run simple tests and log results to console.
 */
export function runBasicTests() {
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60).toISOString(); // 1 minute ago
  const future = new Date(now.getTime() + 1000 * 60 * 60).toISOString(); // 1 hour later

  const company = {
    trucks: [],
    trailers: [],
    incomingDeliveries: [
      { id: 'in-1', type: 'truck', spec: { id: 't-1', name: 'Test Truck' }, purchaseTime: now.toISOString(), deliveryEta: past, price: 10000 },
      { id: 'in-2', type: 'trailer', spec: { id: 'tr-1', tonnage: 12 }, purchaseTime: now.toISOString(), deliveryEta: past, price: 5000 },
      { id: 'in-3', type: 'truck', spec: { id: 't-2' }, purchaseTime: now.toISOString(), deliveryEta: future, price: 12000 }
    ]
  };

  const { updatedCompany, moved } = processIncomingDeliveries(company);

  console.assert(Array.isArray(updatedCompany.trucks), 'trucks should be an array');
  console.assert(Array.isArray(updatedCompany.trailers), 'trailers should be an array');
  console.assert(updatedCompany.trucks.length === 1, `expected 1 truck, got ${updatedCompany.trucks.length}`);
  console.assert(updatedCompany.trailers.length === 1, `expected 1 trailer, got ${updatedCompany.trailers.length}`);
  console.assert(updatedCompany.incomingDeliveries.length === 1, 'one incoming should remain');
  console.assert(moved.length === 2, `expected 2 moved items, got ${moved.length}`);

  // Print human-friendly result for quick inspection
  // eslint-disable-next-line no-console
  console.log('incomingDeliveryUtils basic tests passed', { moved, remaining: updatedCompany.incomingDeliveries });
}

// If run directly by Node (if test runner wired), execute
if (require.main === module) {
  runBasicTests();
}