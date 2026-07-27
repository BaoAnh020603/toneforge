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
  throw new Error('Missing FIREBASE_PROJECT_ID and project_id in service account JSON.');
}

initializeApp({
  credential: cert(serviceAccount),
  projectId,
});

const db = getFirestore();
const now = new Date();

const users = [
  { id: 'seed-admin', displayName: 'ToneForge Seed', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ToneForgeSeed', role: 'admin', createdAt: now, updatedAt: now },
];

const songs = [];

async function writeCollection(collectionName, docs) {
  const batch = db.batch();
  for (const entry of docs) {
    const { id, ...data } = entry;
    batch.set(db.collection(collectionName).doc(id), data, { merge: true });
  }
  await batch.commit();
}

await writeCollection('users', users);
await writeCollection('songs', songs);
console.log(`Seeded ${songs.length} songs and ${users.length} user(s).`);
