import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import config from './firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
    console.log("Testing client SDK connection with:", config.firestoreDatabaseId);
    try {
        const d = await getDoc(doc(db, '_healthcheck', 'ping'));
        console.log("Success! exists:", d.exists());
    } catch (e) {
        console.error("Error with client sdk:", e);
    }
}
test();
