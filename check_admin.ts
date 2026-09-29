import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import config from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp({
  projectId: config.projectId,
});

const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  try {
    const snap = await db.collection('link_codes_by_code').doc('X6VH9B').get();
    console.log('Exists:', snap.exists, snap.data());
  } catch (e) {
    console.error('Admin Error:', e);
  }
  process.exit(0);
}
check();
