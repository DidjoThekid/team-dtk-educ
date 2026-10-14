import { getStaff, hashPassword } from '../../../../lib/auth';
import { readJSON, writeJSON, uid, DEFAULT_SETTINGS } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

const REPLACE = ['announcements', 'settings', 'timetable', 'news']; // remplacés en bloc (PUT)
const BYID = ['support', 'posts', 'users'];                          // modifiés par id
const MOD_OK = ['announcements', 'news', 'support', 'posts', 'settings']; // ce que le modérateur peut toucher
const FALLBACK = { announcements: [], settings: DEFAULT_SETTINGS, timetable: [], news: [], support: [], posts: [], users: [] };
const deny = () => Response.json({ error: 'Non autorisé' }, { status: 401 });
const bad = (m = 'Ressource inconnue', s = 404) => Response.json({ error: m }, { status: s });
const safeUser = ({ hash, ...u }) => u;

// Renvoie le membre de l'équipe s'il a le droit sur cette ressource
async function allow(resource) {
  const s = await getStaff();
  if (!s) return null;
  return s.staff === 'fondateur' || MOD_OK.includes(resource) ? s : null;
}

export async function GET(_req, { params }) {
  const r = params.resource;
  if (!(await allow(r))) return deny();
  if (!(r in FALLBACK)) return bad();
  const data = await readJSON(r, FALLBACK[r]);
  if (r === 'settings') return Response.json({ ...DEFAULT_SETTINGS, ...data });
  if (r === 'users') return Response.json(data.map(safeUser));
  return Response.json(data);
}

export async function PUT(req, { params }) {
  const s = await allow(params.resource);
  if (!s) return deny();
  if (!REPLACE.includes(params.resource)) return bad();
  let body = await req.json();
  if (params.resource === 'settings' && s.staff !== 'fondateur') {
    // un modérateur ne peut pas toucher à la maintenance
    const cur = { ...DEFAULT_SETTINGS, ...(await readJSON('settings', {})) };
    body = { ...body, maintenance: cur.maintenance, maintenanceMessage: cur.maintenanceMessage };
  }
  await writeJSON(params.resource, body);
  return Response.json({ ok: true });
}

export async function POST(req, { params }) {
  if (!(await allow(params.resource))) return deny();
  if (params.resource !== 'users') return bad();
  const b = await req.json();
  const login = String(b.login || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(login) || !b.name || String(b.password || '').length < 6) return bad('Identifiant (3-30 car.), nom et mot de passe (6+) requis', 400);
  if (!['eleve', 'prof'].includes(b.role)) return bad('Rôle invalide', 400);
  if (login === (process.env.FOUNDER_LOGIN || '').trim().toLowerCase()) return bad('Identifiant réservé', 409);
  const users = await readJSON('users', []);
  if (users.some((u) => u.login === login)) return bad('Identifiant déjà pris', 409);
  users.push({
    id: uid(), login, name: String(b.name).trim().slice(0, 60), role: b.role,
    classId: String(b.classId || '').trim().slice(0, 20),
    staff: ['moderateur', 'fondateur'].includes(b.staff) ? b.staff : '',
    hash: hashPassword(b.password),
  });
  await writeJSON('users', users);
  return Response.json({ ok: true });
}

export async function PATCH(req, { params }) {
  const s = await allow(params.resource);
  if (!s) return deny();
  if (!BYID.includes(params.resource)) return bad();
  const { id, ...changes } = await req.json();
  const list = await readJSON(params.resource, []);
  const item = list.find((x) => x.id === id);
  if (!item) return bad('Introuvable');
  if (params.resource === 'users') {
    if (changes.password) { if (String(changes.password).length < 6) return bad('Mot de passe trop court', 400); item.hash = hashPassword(changes.password); }
    for (const k of ['name', 'classId', 'role']) if (changes[k] !== undefined) item[k] = changes[k];
    if (changes.staff !== undefined) item.staff = ['moderateur', 'fondateur'].includes(changes.staff) ? changes.staff : '';
  } else {
    if (changes.reply) {
      item.replies = [...(item.replies || []), { text: String(changes.reply).slice(0, 2000), at: Date.now(), by: s.name }];
      delete changes.reply;
    }
    Object.assign(item, changes, { modBy: s.name, modAt: Date.now() }); // qui a modéré
  }
  await writeJSON(params.resource, list);
  return Response.json({ ok: true });
}

export async function DELETE(req, { params }) {
  if (!(await allow(params.resource))) return deny();
  if (!BYID.includes(params.resource)) return bad();
  const id = new URL(req.url).searchParams.get('id');
  const list = await readJSON(params.resource, []);
  await writeJSON(params.resource, list.filter((x) => x.id !== id));
  return Response.json({ ok: true });
}
