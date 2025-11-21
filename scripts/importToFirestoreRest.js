/**
 * scripts/importToFirestoreRest.js
 *
 * Firestore REST importer.
 *
 * Purpose:
 * - Read an exported JSON file (exported-docs.json)
 * - Build and sign a JWT using a Google service account key (serviceAccountKey.json)
 * - Exchange the JWT for an OAuth2 access token
 * - Discover top-level collections in the exported JSON (arrays or object-of-objects)
 * - Create Firestore documents via the Firestore REST API under each discovered collection
 *
 * Usage:
 *  node scripts/importToFirestoreRest.js --file exported-docs.json --serviceAccount ./serviceAccountKey.json [--projectId your-gcp-project-id] [--dry]
 *
 * Notes:
 * - Requires Node 18+ (global fetch). If Node <18, upgrade or ask me for a fallback.
 * - Ensure the service account has Firestore permissions (Firestore Owner or Editor).
 * - By default each Firestore document will contain:
 *    fields.id (stringValue)   -> if input object has id/_id
 *    fields.name (stringValue) -> if input object has name
 *    fields.data (stringValue) -> full original object as JSON string
 *
 * Safety:
 * - The script logs successes and failures.
 * - Use --dry to perform a dry-run (no network requests).
 */

/**
 * @description Base64url encode a buffer/string according to JWT rules.
 * @param {string|Buffer} input
 * @returns {string}
 */
function base64Url(input) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const process = require('process');

/**
 * @description Parse command-line args into a simple object.
 * @returns {{file?:string, serviceAccount?:string, projectId?:string, dry?:boolean}}
 */
function parseArgs() {
  const argv = process.argv.slice(2);
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry') {
      args.dry = true;
      continue;
    }
    if (a.startsWith('--')) {
      const key = a.replace(/^--/, '');
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[key] = val;
    }
  }
  return args;
}

/**
 * @description Create a signed JWT (RS256) from a Google service account private key.
 * @param {Object} sa - Parsed service account JSON
 * @param {string} scope - OAuth scopes space-separated
 * @param {number} expiresInSeconds
 * @returns {string} Signed JWT
 */
function createSignedJwt(sa, scope, expiresInSeconds = 3600) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + expiresInSeconds,
    iat: now
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(sa.private_key);
  return `${signingInput}.${base64Url(signature)}`;
}

/**
 * @description Exchange a signed JWT for an OAuth2 access token.
 * @param {string} jwt
 * @returns {Promise<{access_token:string,expires_in:number}>}
 */
async function fetchAccessToken(jwt) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch not found. Please run this script with Node 18+.');
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', jwt);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  return await res.json();
}

/**
 * @description Convert any object to Firestore "fields" minimal mapping:
 * - preserve id/name as stringValue
 * - put full object JSON into data.stringValue
 * @param {object} obj
 * @returns {object} Firestore document body
 */
function buildFirestoreDocumentBody(obj) {
  const body = { fields: {} };
  if (obj.id !== undefined && obj.id !== null) {
    body.fields.id = { stringValue: String(obj.id) };
  } else if (obj._id !== undefined && obj._id !== null) {
    body.fields.id = { stringValue: String(obj._id) };
  }
  if (obj.name !== undefined && obj.name !== null) {
    body.fields.name = { stringValue: String(obj.name) };
  }
  body.fields.data = { stringValue: JSON.stringify(obj) };
  return body;
}

/**
 * @description Detect top-level arrays or object-of-objects collections in exported JSON.
 * @param {object} exported
 * @returns {Array<{key:string,target:string,items:Array}>}
 */
function discoverCollections(exported) {
  const keys = Object.keys(exported || {});
  const mapping = {
    companies: 'companies',
    company: 'companies',
    users: 'users',
    user: 'users',
    staff: 'users',
    skill_progress: 'skill_progress',
    skillProgress: 'skill_progress',
    skill_progresses: 'skill_progress'
  };
  const collections = [];

  for (const k of keys) {
    const v = exported[k];
    if (Array.isArray(v)) {
      const target = mapping[k] || k;
      collections.push({ key: k, target, items: v });
    } else if (v && typeof v === 'object') {
      const vals = Object.values(v);
      if (vals.length > 0 && vals.every(x => typeof x === 'object')) {
        const target = mapping[k] || k;
        collections.push({ key: k, target, items: vals });
      }
    }
  }

  // Fallback: look for common keys inside
  if (collections.length === 0) {
    ['companies', 'users', 'skill_progress', 'staff', 'data'].forEach((k) => {
      if (exported[k]) {
        const items = Array.isArray(exported[k]) ? exported[k] : Object.values(exported[k]);
        collections.push({ key: k, target: k, items });
      }
    });
  }

  return collections;
}

/**
 * @description Create a Firestore document using the REST API.
 * @param {string} projectId
 * @param {string} collection
 * @param {string} docId
 * @param {object} obj
 * @param {string} token
 * @returns {Promise<Response>}
 */
async function createFirestoreDocument(projectId, collection, docId, obj, token) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodeURIComponent(collection)}?documentId=${encodeURIComponent(docId)}`;
  const body = buildFirestoreDocumentBody(obj);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return res;
}

/**
 * @description Main entrypoint: parse args and run import.
 */
async function main() {
  try {
    const argv = parseArgs();
    const filePath = argv.file || 'exported-docs.json';
    const serviceAccountPath = argv.serviceAccount || 'serviceAccountKey.json';
    const dryRun = !!argv.dry;
    let projectId = argv.projectId;

    console.log('Options:', { filePath, serviceAccountPath, projectId, dryRun });

    if (!fs.existsSync(filePath)) {
      console.error(`Export file not found: ${filePath}`);
      process.exit(1);
    }
    if (!fs.existsSync(serviceAccountPath)) {
      console.error(`Service account file not found: ${serviceAccountPath}`);
      process.exit(1);
    }

    const sa = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    projectId = projectId || sa.project_id;
    if (!projectId) {
      console.error('Project ID not found. Pass --projectId or ensure serviceAccount JSON includes project_id.');
      process.exit(1);
    }

    console.log('Reading export file:', filePath);
    const exported = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const collections = discoverCollections(exported);
    if (collections.length === 0) {
      console.error('No collections discovered in the exported JSON. Please check the file.');
      process.exit(1);
    }

    console.log('Discovered collections:', collections.map(c => `${c.key} -> ${c.target} (${c.items.length})`).join(', '));

    if (dryRun) {
      console.log('Dry-run mode: no network requests will be made. The script will print actions only.');
      for (const col of collections) {
        console.log(`Would import collection ${col.key} -> documents/${col.target} (${col.items.length} items)`);
        for (const item of col.items.slice(0, 5)) {
          const docId = item.id || item._id || item.uid || `import_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
          console.log(`  - Would create ${col.target}/${docId}`);
        }
        if (col.items.length > 5) {
          console.log(`  ... (${col.items.length - 5} more items)`);
        }
      }
      console.log('Dry-run complete.');
      process.exit(0);
    }

    console.log('Creating signed JWT...');
    const scope = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform';
    const signedJwt = createSignedJwt(sa, scope);

    console.log('Exchanging JWT for access token...');
    let tokenResp;
    try {
      tokenResp = await fetchAccessToken(signedJwt);
    } catch (err) {
      console.error('Failed to get access token:', err.message || err);
      process.exit(1);
    }
    const accessToken = tokenResp.access_token;
    if (!accessToken) {
      console.error('No access token received:', tokenResp);
      process.exit(1);
    }
    console.log('Got access token. Proceeding to import...');

    let total = 0;
    let success = 0;
    let failed = 0;

    for (const col of collections) {
      console.log(`\nImporting collection ${col.key} -> documents/${col.target} (${col.items.length} items)`);
      for (const item of col.items) {
        total++;
        let docId = item.id || item._id || item.uid || item.userId || item.companyId || `import_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        docId = String(docId).replace(/\//g, '_'); // sanitize
        try {
          const res = await createFirestoreDocument(projectId, col.target, docId, item, accessToken);
          if (res.ok) {
            success++;
            console.log(` + OK ${col.target}/${docId}`);
          } else {
            failed++;
            const txt = await res.text();
            console.error(` - FAILED ${col.target}/${docId} status=${res.status} response=${txt}`);
          }
        } catch (err) {
          failed++;
          console.error(` - ERROR ${col.target}/${docId}`, err.message || err);
        }
      }
    }

    console.log(`\nDone. total=${total} success=${success} failed=${failed}`);
    process.exit(failed === 0 ? 0 : 2);
  } catch (err) {
    console.error('Unhandled error:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

main();