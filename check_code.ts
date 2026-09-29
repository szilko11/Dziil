import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore/lite';
import config from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  try {
    const normalized = 'X6VH9B';
    const snap = await getDoc(doc(db, 'link_codes_by_code', normalized));
    console.log('by_code exists:', snap.exists(), snap.data());
  } catch (e) {
    console.error('Error:', e);
  }
  process.exit(0);
}
check();
