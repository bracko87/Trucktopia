/**
 * scripts/send-migration.ts
 *
 * Small Node helper to upload a large export file to the Vercel /api/migrate endpoint in safe chunks.
 *
 * Usage:
 *   node scripts/send-migration.ts <export.json> <endpoint> [batchSize]
 *
 * Example:
 *   ADMIN_TOKEN=secret node scripts/send-migration.ts ./export.json https://my-app.vercel.app/api/migrate 200
 *
 * Notes:
 * - Script reads export.json, expects shape { metadata?: object, collections: Record&lt;string, any[]&gt; }
 * - Uploads each collection in batches of `batchSize` items to avoid serverless body/time limits.
 * - Requires an ADMIN_TOKEN environment variable for authentication.
 */

import fs from 'fs';
import path from 'path';

type ExportFile = {
  metadata?: Record<string, any>;
  collections: Record<string, any[]>;
};

/**
 * Chunk an array into smaller arrays of size n.
 * @param arr - source array
 * @param n - chunk size
 */
function chunkArray<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) {
    out.push(arr.slice(i, i + n));
  }
  return out;
}

/**
 * Post a single migration batch to the endpoint.
 * @param endpoint - URL to POST to
 * @param adminToken - admin token for Authorization
 * @param metadata - optional metadata object
 * @param collectionName - name of collection
 * @param batch - items to upload in this batch
 */
async function postBatch(
  endpoint: string,
  adminToken: string,
  metadata: Record<string, any>,
  collectionName: string,
  batch: any[]
) {
  const payload = {
    metadata,
    collections: {
      [collectionName]: batch
    }
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${JSON.stringify(parsed)}`);
  }

  return parsed;
}

/**
 * Main runner
 */
async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.error('Usage: ADMIN_TOKEN=<token> node scripts/send-migration.ts <export.json> <endpoint> [batchSize]');
    process.exit(2);
  }

  const filePath = path.resolve(argv[0]);
  const endpoint = argv[1];
  const batchSize = Number(argv[2] || 200);

  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    console.error('ADMIN_TOKEN environment variable required');
    process.exit(2);
  }

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(2);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const data: ExportFile = JSON.parse(raw);

  if (!data.collections || typeof data.collections !== 'object') {
    console.error('Invalid export file. Missing collections object.');
    process.exit(2);
  }

  console.log(`Starting upload to ${endpoint} with batchSize=${batchSize}`);

  for (const [collectionName, items] of Object.entries(data.collections)) {
    console.log(`Uploading collection "${collectionName}" with ${items.length} items`);
    const chunks = chunkArray(items, batchSize);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`  Sending batch ${i + 1}/${chunks.length} (${chunk.length} items)...`);
      try {
        const result = await postBatch(endpoint, adminToken, data.metadata || {}, collectionName, chunk);
        console.log('    OK:', result.inserted ?? 'OK');
      } catch (err: any) {
        console.error('    ERROR:', err.message || err);
        console.error('    Aborting further uploads for this collection.');
        break;
      }
      // Small delay to avoid hitting rate limits
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  console.log('Upload finished.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
