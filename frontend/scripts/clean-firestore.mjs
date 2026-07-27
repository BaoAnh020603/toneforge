import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'node:fs/promises';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!serviceAccountPath) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_PATH. Point it to your Firebase service account JSON.');
}

const rawServiceAccount = await readFile(serviceAccountPath, 'utf8');
const serviceAccount = JSON.parse(rawServiceAccount);
const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id;
if (!projectId) {
  throw new Error('Missing FIREBASE_PROJECT_ID and project_id in serviceAccount JSON.');
}

initializeApp({
  credential: cert(serviceAccount),
  projectId,
});

const db = getFirestore();

const collectionsToClean = ['songs', 'users'];

async function deleteCollection(name) {
  const snapshot = await db.collection(name).get();
  if (snapshot.empty) {
    console.log(`Skipped ${name} (empty)`);
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Deleted ${snapshot.size} documents from ${name}`);
}

for (const name of collectionsToClean) {
  await deleteCollection(name);
}

console.log('Firestore cleanup complete.');
