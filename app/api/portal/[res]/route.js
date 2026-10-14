import { getUser } from '../../../../lib/auth';
import { readJSON, writeJSON, uid, DEFAULT_SETTINGS } from '../../../../lib/db';

export const dynamic = 'force-dynamic';
const J = (d, s = 200) => Response.json(d, { status: s });
const str = (v, n) => String(v ?? '').trim().slice(0, n);

export async function GET(_req, { params }) {
  const me = await getUser();
  if (!me) return J({ error: 'Non connecté' }, 401);
  const prof = me.role === 'prof';
  const users = await readJSON('users', []);
  const nameOf = (id) => users.find((u) => u.id === id)?.name || '?';

  switch (params.res) {
    case 'me': return J(me);
    case 'students':
      if (!prof) return J({ error: 'Interdit' }, 403);
      return J(users.filter((u) => u.role === 'eleve').map((u) => ({ id: u.id, name: u.name, classId: u.classId })));
    case 'contacts':
      return J(users.filter((u) => u.id !== me.id && (prof || u.role === 'prof')).map((u) => ({ id: u.id, name: u.name, role: u.role })));
    case 'edt': {
      const t = await readJSON('timetable', []);
      return J(prof ? t.filter((x) => x.teacher === me.name) : t.filter((x) => x.classId === me.classId));
    }
    case 'homework': {
      const h = await readJSON('homework', []);
      const done = (await readJSON('hwdone', {}))[me.id] || [];
      const list = prof ? h.filter((x) => x.createdBy === me.id) : h.filter((x) => x.classId === me.classId);
      return J(list.map((x) => ({ ...x, done: done.includes(x.id) })).sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
    }
    case 'grades': {
      const g = await readJSON('grades', []);
      const list = prof ? g.filter((x) => x.teacher === me.id) : g.filter((x) => x.studentId === me.id);
      return J(list.map((x) => ({ ...x, studentName: nameOf(x.studentId) })).sort((a, b) => b.date - a.date));
    }
    case 'absences': {
      const a = await readJSON('absences', []);
      const list = prof ? a.filter((x) => x.createdBy === me.id) : a.filter((x) => x.studentId === me.id);
      return J(list.map((x) => ({ ...x, studentName: nameOf(x.studentId) })).sort((x, y) => y.date.localeCompare(x.date)));
    }
    case 'news': return J((await readJSON('news', [])).sort((a, b) => b.createdAt - a.createdAt));
    case 'messages': {
      const m = await readJSON('messages', []);
      return J(m.filter((x) => x.to === me.id || x.from === me.id)
        .map((x) => ({ ...x, fromName: nameOf(x.from), toName: nameOf(x.to) })).sort((a, b) => b.createdAt - a.createdAt));
    }
    case 'forum': return J((await readJSON('posts', [])).filter((p) => p.status === 'visible').slice(0, 50));
    default: return J({ error: 'Inconnu' }, 404);
  }
}

export async function POST(req, { params }) {
  const me = await getUser();
  if (!me) return J({ error: 'Non connecté' }, 401);
  const b = await req.json().catch(() => ({}));
  const prof = me.role === 'prof';
  const users = await readJSON('users', []);
  const isStudent = (id) => users.some((u) => u.id === id && u.role === 'eleve');

  switch (params.res) {
    case 'homework': {
      if (!prof) return J({ error: 'Réservé aux professeurs' }, 403);
      const x = { classId: str(b.classId, 20), subject: str(b.subject, 40), title: str(b.title, 500), dueDate: str(b.dueDate, 10) };
      if (!x.classId || !x.subject || !x.title || !x.dueDate) return J({ error: 'Champs manquants' }, 400);
      const h = await readJSON('homework', []);
      h.push({ id: uid(), ...x, createdBy: me.id, createdAt: Date.now() });
      await writeJSON('homework', h);
      return J({ ok: true });
    }
    case 'grades': {
      if (!prof) return J({ error: 'Réservé aux professeurs' }, 403);
      const value = Number(b.value), outOf = Number(b.outOf) || 20, coef = Number(b.coef) || 1;
      if (!isStudent(b.studentId) || !str(b.subject, 40) || Number.isNaN(value) || value < 0 || value > outOf) return J({ error: 'Note invalide' }, 400);
      const g = await readJSON('grades', []);
      g.push({ id: uid(), studentId: b.studentId, subject: str(b.subject, 40), title: str(b.title, 100) || 'Évaluation', value, outOf, coef, date: Date.now(), teacher: me.id });
      await writeJSON('grades', g);
      return J({ ok: true });
    }
    case 'absences': {
      if (!prof) return J({ error: 'Réservé aux professeurs' }, 403);
      if (!isStudent(b.studentId) || !str(b.date, 10)) return J({ error: 'Champs invalides' }, 400);
      const a = await readJSON('absences', []);
      a.push({ id: uid(), studentId: b.studentId, date: str(b.date, 10), type: b.type === 'retard' ? 'retard' : 'absence', duration: str(b.duration, 30), reason: str(b.reason, 300), justified: 'non', createdBy: me.id });
      await writeJSON('absences', a);
      return J({ ok: true });
    }
    case 'hwdone': {
      const d = await readJSON('hwdone', {});
      const s = new Set(d[me.id] || []);
      s.has(b.id) ? s.delete(b.id) : s.add(b.id);
      d[me.id] = [...s];
      await writeJSON('hwdone', d);
      return J({ ok: true });
    }
    case 'messages': {
      const to = users.find((u) => u.id === b.to);
      if (!to || to.id === me.id || (!prof && to.role !== 'prof')) return J({ error: 'Destinataire invalide' }, 400);
      if (!str(b.text, 3000)) return J({ error: 'Message vide' }, 400);
      const m = await readJSON('messages', []);
      m.push({ id: uid(), from: me.id, to: to.id, subject: str(b.subject, 120) || '(sans objet)', text: str(b.text, 3000), createdAt: Date.now() });
      await writeJSON('messages', m);
      return J({ ok: true, message: 'Envoyé ✅' });
    }
    case 'forum': {
      const s = { ...DEFAULT_SETTINGS, ...(await readJSON('settings', {})) };
      if (!s.boardOpen) return J({ error: 'Le forum est fermé.' }, 403);
      if (s.bannedPseudos.some((p) => [me.name, me.login].map((x) => x.toLowerCase()).includes(p.toLowerCase())))
        return J({ error: 'Tu as été banni du forum.' }, 403);
      const text = str(b.text, 500);
      if (!text) return J({ error: 'Message vide' }, 400);
      const flagged = s.bannedWords.some((w) => w && text.toLowerCase().includes(w.toLowerCase()));
      const p = await readJSON('posts', []);
      p.unshift({ id: uid(), pseudo: me.name, text, status: flagged ? 'pending' : 'visible', createdAt: Date.now() });
      await writeJSON('posts', p);
      return J({ ok: true, message: flagged ? 'Message en attente de modération.' : 'Publié ✅' });
    }
    default: return J({ error: 'Inconnu' }, 404);
  }
}

// Justifier une absence (élève) / valider (prof)
export async function PATCH(req, { params }) {
  const me = await getUser();
  if (!me) return J({ error: 'Non connecté' }, 401);
  if (params.res !== 'absences') return J({ error: 'Inconnu' }, 404);
  const b = await req.json().catch(() => ({}));
  const a = await readJSON('absences', []);
  const x = a.find((i) => i.id === b.id);
  if (!x) return J({ error: 'Introuvable' }, 404);
  if (me.role === 'eleve' && x.studentId === me.id) { x.reason = str(b.reason, 300); x.justified = 'attente'; }
  else if (me.role === 'prof' && x.createdBy === me.id) { x.justified = b.justified === 'oui' ? 'oui' : 'non'; }
  else return J({ error: 'Interdit' }, 403);
  await writeJSON('absences', a);
  return J({ ok: true });
}

export async function DELETE(req, { params }) {
  const me = await getUser();
  if (!me || me.role !== 'prof') return J({ error: 'Interdit' }, 403);
  const id = new URL(req.url).searchParams.get('id');
  const owner = { homework: 'createdBy', grades: 'teacher', absences: 'createdBy' }[params.res];
  if (!owner) return J({ error: 'Inconnu' }, 404);
  const list = await readJSON(params.res, []);
  await writeJSON(params.res, list.filter((x) => !(x.id === id && x[owner] === me.id)));
  return J({ ok: true });
}
