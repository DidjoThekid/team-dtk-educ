import { put, list } from '@vercel/blob';
import crypto from 'crypto';

// Chaque "table" = un fichier JSON dans Vercel Blob.
// Le chemin est dérivé d'un HMAC (ADMIN_SECRET) => l'URL du blob n'est pas devinable.
const key = (name) =>
  `d/${crypto.createHmac('sha256', process.env.ADMIN_SECRET || 'dev-secret-a-changer').update(name).digest('hex').slice(0, 32)}.json`;

export async function readJSON(name, fallback) {
  try {
    const { blobs } = await list({ prefix: key(name), limit: 1 });
    if (!blobs.length) return fallback;
    const res = await fetch(`${blobs[0].url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

export async function writeJSON(name, data) {
  await put(key(name), JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
  });
}

export const DEFAULT_SETTINGS = {
  maintenance: false,
  maintenanceMessage: 'Le site est en maintenance. Revenez bientôt !',
  boardOpen: true,
  bannedWords: [],
  bannedPseudos: [],
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
