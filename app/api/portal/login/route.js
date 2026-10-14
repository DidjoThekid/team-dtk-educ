import { cookies } from 'next/headers';
import { readJSON } from '../../../../lib/db';
import { verifyPassword, makeSession, checkPassword, FOUNDER_ID } from '../../../../lib/auth';

const setSid = (id) =>
  cookies().set('sid', makeSession(id), { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 7 * 86400 });

export async function POST(req) {
  const { login, password } = await req.json().catch(() => ({}));
  const lg = String(login || '').trim().toLowerCase();
  const founder = (process.env.FOUNDER_LOGIN || '').trim().toLowerCase();

  if (founder && lg === founder && checkPassword(password)) {
    setSid(FOUNDER_ID);
    return Response.json({ ok: true });
  }
  const u = (await readJSON('users', [])).find((x) => x.login === lg);
  if (!u || lg === founder || !verifyPassword(password, u.hash))
    return Response.json({ error: 'Identifiant ou mot de passe incorrect' }, { status: 401 });
  setSid(u.id);
  return Response.json({ ok: true });
}

export async function DELETE() {
  cookies().delete('sid');
  return Response.json({ ok: true });
}
