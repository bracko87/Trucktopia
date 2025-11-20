
/**
 * functions/src/index.ts
 *
 * Example Firebase Cloud Function that runs on schedule and performs a single "game tick".
 *
 * Notes:
 * - This file is intended for the functions/ directory managed by Firebase CLI.
 * - Requires firebase-admin and firebase-functions packages in the functions package.json.
 * - Deploy with: firebase deploy --only functions
 *
 * Scheduling:
 * - Using pubsub.schedule('every 5 minutes').onRun(...) is supported by firebase-functions.
 * - You can also set up Cloud Scheduler to hit an HTTPS function if you prefer.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * tickGameEngine
 * @description Example scheduled function that iterates company documents and applies a
 *              simple tick update (this is a stub — replace with your real engine).
 */
export const tickGameEngine = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  console.log('[tickGameEngine] tick start', new Date().toISOString());
  try {
    const companiesSnap = await db.collection('companies').get();
    const batch = db.batch();
    companiesSnap.forEach((docSnap) => {
      const comp = docSnap.data() || {};
      // Example: ensure reputation does not go negative and increment a tick counter
      const rep = typeof comp.reputation === 'number' ? comp.reputation : 0;
      const nextRep = Math.max(0, rep); // adapt your rules here
      const tickCounter = (comp._tickCount || 0) + 1;
      batch.update(docSnap.ref, { reputation: nextRep, _tickCount: tickCounter, lastTick: admin.firestore.FieldValue.serverTimestamp() });
    });
    await batch.commit();
    console.log('[tickGameEngine] tick completed for', companiesSnap.size, 'companies');
  } catch (err) {
    console.error('[tickGameEngine] error', err);
  }
  return null;
});
