import crypto from 'crypto';
import { cookies } from 'next/headers';
import { readJSON } from './db';

const secret = () => process.env.ADMIN_SECRET || 'dev-secret-a-changer';
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const FOUNDER_ID = 'founder';

// Mot de passe du fondateur (ADMIN_PASSWORD)
export function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real || !input) return false;
  const a = crypto.createHash('sha256').update(String(input)).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(String(pw), salt, 32).toString('hex')}`;
}
export function verifyPassword(pw, stored) {
  const [salt, h] = String(stored || '').split(':');
  if (!salt || !h) return false;
  const c = crypto.scryptSync(String(pw), salt, 32);
  const hb = Buffer.from(h, 'hex');
  return hb.length === c.length && crypto.timingSafeEqual(c, hb);
}
export function makeSession(userId) {
  const p = `${userId}.${Date.now() + 7 * 86400000}`;
  return `${p}.${sign(p)}`;
}

export async function getUser() {
  const t = cookies().get('sid')?.value;
  if (!t) return null;
  const parts = t.split('.');
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  if (Number(exp) < Date.now() || !safeEq(sig, sign(`${id}.${exp}`))) return null;
  if (id === FOUNDER_ID) {
    return { id, login: process.env.FOUNDER_LOGIN || 'fondateur', name: 'Fondateur', role: 'prof', classId: '', staff: 'fondateur' };
  }
  const u = (await readJSON('users', [])).find((x) => x.id === id);
  return u ? { id: u.id, login: u.login, name: u.name, role: u.role, classId: u.classId || '', staff: u.staff || '' } : null;
}

// Membre de la Team DTK avec accès admin ('fondateur' ou 'moderateur'), sinon null
export async function getStaff() {
  const u = await getUser();
  return u && u.staff ? u : null;
}
