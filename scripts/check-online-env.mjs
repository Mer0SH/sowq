import fs from 'node:fs';
import { loadEnv } from 'vite';

const apiUrl = loadEnv('production', process.cwd(), 'VITE_').VITE_API_URL?.trim();
const config = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
const apiRewrite = config.hosting?.rewrites?.find(item => item.source === '/api/**');
if (apiUrl && apiUrl !== '/api') {
  console.error('Online build stopped: VITE_API_URL must be /api for the Firebase Hosting rewrite.');
  process.exit(1);
}
if (apiRewrite?.function?.functionId !== 'api' || !config.functions || !config.firestore || !config.storage) {
  console.error('Online build stopped: Firebase API, Firestore, or Storage configuration is missing.');
  process.exit(1);
}
