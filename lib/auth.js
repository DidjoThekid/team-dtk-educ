import crypto from 'crypto';
import { cookies } from 'next/headers';
import { readJSON } from './db';

const secret = () => process.env.ADMIN_SECRET || 'dev-secret-a-changer';
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('hex');
const safeEq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/* ---------- Admin (mot de passe unique, /admin) ---------- */
export function makeToken() {
  const exp = String(Date.now() + 8 * 3600 * 1000);
  return `${exp}.${sign(exp)}`;
}
export function isAdmin() {
  const t = cookies().get('admin')?.value;
  if (!t) return false;
  const [exp, sig] = t.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEq(sig, sign(exp));
}
export function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD || '';
  if (!real || !input) return false;
  const a = crypto.createHash('sha256').update(String(input)).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

/* ---------- Comptes élèves / profs ---------- */
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
  const u = (await readJSON('users', [])).find((x) => x.id === id);
  return u ? { id: u.id, login: u.login, name: u.name, role: u.role, classId: u.classId || '' } : null;
}
