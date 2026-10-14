import { cookies } from 'next/headers';
import { readJSON } from '../../../../lib/db';
import { verifyPassword, makeSession } from '../../../../lib/auth';

export async function POST(req) {
  const { login, password } = await req.json().catch(() => ({}));
  const users = await readJSON('users', []);
  const u = users.find((x) => x.login === String(login || '').trim().toLowerCase());
  if (!u || !verifyPassword(password, u.hash)) return Response.json({ error: 'Identifiant ou mot de passe incorrect' }, { status: 401 });
  cookies().set('sid', makeSession(u.id), { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 7 * 86400 });
  return Response.json({ ok: true });
}

export async function DELETE() {
  cookies().delete('sid');
  return Response.json({ ok: true });
}
