import { cookies } from 'next/headers';
import { checkPassword, makeToken } from '../../../../lib/auth';

export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  if (!checkPassword(password)) return Response.json({ error: 'Mot de passe incorrect' }, { status: 401 });
  cookies().set('admin', makeToken(), { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 8 * 3600 });
  return Response.json({ ok: true });
}

export async function DELETE() {
  cookies().delete('admin');
  return Response.json({ ok: true });
}
