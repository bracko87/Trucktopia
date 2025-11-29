/**
 * incomingDelivery.ts
 *
 * Strongly-typed data shapes for IncomingDelivery lifecycle.
 *
 * Responsibilities:
 * - Provide TypeScript interfaces used across UI and utils for IncomingDeliveries.
 */

/**
 * IncomingDelivery
 * @description Represents a purchased item waiting for delivery (truck or trailer)
 */
export interface IncomingDelivery {
  /** stable id of the incoming record */
  id: string;
  /** explicit type to avoid heuristics: 'truck' | 'trailer' | 'unknown' */
  type?: 'truck' | 'trailer' | 'unknown';
  /** sku or item spec describing the purchased object */
  sku?: string | Record<string, any>;
  /** optional detailed spec payload (engine, axles, tonnage, etc.) */
  spec?: Record<string, any>;
  /** ISO timestamp when purchase happened */
  purchaseTime: string;
  /** ISO timestamp when the delivery is expected to arrive */
  deliveryEta: string;
  /** seller/source */
  source?: string;
  /** purchase price */
  price?: number;
  /** quantity (usually 1) */
  quantity?: number;
  /** arbitrary metadata */
  metadata?: Record<string, any>;
}

/**
 * ProcessResult
 * @description Result shape returned by processIncomingDeliveries utility
 */
export interface ProcessResult {
  /** The updated company/state object (mutated or new) */
  updatedCompany: any;
  /** Array of moved items with minimal shape */
  moved: Array<{ incomingId: string; target: 'trucks' | 'trailers' | 'unknown'; item?: any }>;
}