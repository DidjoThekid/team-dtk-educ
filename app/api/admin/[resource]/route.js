import { isAdmin, hashPassword } from '../../../../lib/auth';
import { readJSON, writeJSON, uid, DEFAULT_SETTINGS } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

const REPLACE = ['announcements', 'settings', 'timetable', 'news']; // remplacés en bloc (PUT)
const BYID = ['support', 'posts', 'users'];                          // modifiés par id
const FALLBACK = { announcements: [], settings: DEFAULT_SETTINGS, timetable: [], news: [], support: [], posts: [], users: [] };
const deny = () => Response.json({ error: 'Non autorisé' }, { status: 401 });
const bad = (m = 'Ressource inconnue', s = 404) => Response.json({ error: m }, { status: s });
const safeUser = ({ hash, ...u }) => u;

export async function GET(_req, { params }) {
  if (!isAdmin()) return deny();
  const r = params.resource;
  if (!(r in FALLBACK)) return bad();
  const data = await readJSON(r, FALLBACK[r]);
  if (r === 'settings') return Response.json({ ...DEFAULT_SETTINGS, ...data });
  if (r === 'users') return Response.json(data.map(safeUser));
  return Response.json(data);
}

export async function PUT(req, { params }) {
  if (!isAdmin()) return deny();
  if (!REPLACE.includes(params.resource)) return bad();
  await writeJSON(params.resource, await req.json());
  return Response.json({ ok: true });
}

export async function POST(req, { params }) {
  if (!isAdmin()) return deny();
  if (params.resource !== 'users') return bad();
  const b = await req.json();
  const login = String(b.login || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(login) || !b.name || String(b.password || '').length < 6) return bad('Identifiant (3-30 car.), nom et mot de passe (6+) requis', 400);
  if (!['eleve', 'prof'].includes(b.role)) return bad('Rôle invalide', 400);
  const users = await readJSON('users', []);
  if (users.some((u) => u.login === login)) return bad('Identifiant déjà pris', 409);
  users.push({ id: uid(), login, name: String(b.name).trim().slice(0, 60), role: b.role, classId: String(b.classId || '').trim().slice(0, 20), hash: hashPassword(b.password) });
  await writeJSON('users', users);
  return Response.json({ ok: true });
}

export async function PATCH(req, { params }) {
  if (!isAdmin()) return deny();
  if (!BYID.includes(params.resource)) return bad();
  const { id, ...changes } = await req.json();
  const list = await readJSON(params.resource, []);
  const item = list.find((x) => x.id === id);
  if (!item) return bad('Introuvable');
  if (params.resource === 'users') {
    if (changes.password) { if (String(changes.password).length < 6) return bad('Mot de passe trop court', 400); item.hash = hashPassword(changes.password); }
    for (const k of ['name', 'classId', 'role']) if (changes[k] !== undefined) item[k] = changes[k];
  } else {
    if (changes.reply) {
      item.replies = [...(item.replies || []), { text: String(changes.reply).slice(0, 2000), at: Date.now() }];
      delete changes.reply;
    }
    Object.assign(item, changes);
  }
  await writeJSON(params.resource, list);
  return Response.json({ ok: true });
}

export async function DELETE(req, { params }) {
  if (!isAdmin()) return deny();
  if (!BYID.includes(params.resource)) return bad();
  const id = new URL(req.url).searchParams.get('id');
  const list = await readJSON(params.resource, []);
  await writeJSON(params.resource, list.filter((x) => x.id !== id));
  return Response.json({ ok: true });
}
