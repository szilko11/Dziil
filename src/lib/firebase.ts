import { initializeApp } from 'firebase/app';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import config from '../../firebase-applet-config.json';

// Silence Firestore background connection error logging in Node environment
try {
  setLogLevel('silent');
} catch (e) {}

const app = initializeApp(config);
export const db = getFirestore(app);
export const auth = getAuth(app);
