import { getStaff, hashPassword } from '../../../../lib/auth';
import { readJSON, writeJSON, uid } from '../../../../lib/db';

// Crée un petit jeu de données de démo : prof / eleve, mot de passe demo1234
export async function POST() {
  const s = await getStaff();
  if (s?.staff !== 'fondateur') return Response.json({ error: 'Non autorisé' }, { status: 401 });
  const users = await readJSON('users', []);
  if (users.some((u) => u.login === 'eleve' || u.login === 'prof')) return Response.json({ error: 'Les comptes de démo existent déjà.' }, { status: 409 });
  const prof = { id: uid(), login: 'prof', name: 'M. Martin', role: 'prof', classId: '', staff: '', hash: hashPassword('demo1234') };
  const eleve = { id: uid(), login: 'eleve', name: 'Léa Dupont', role: 'eleve', classId: '4B', staff: '', hash: hashPassword('demo1234') };
  await writeJSON('users', [...users, prof, eleve]);

  const slot = (day, start, end, subject, room) => ({ id: uid(), classId: '4B', day, start, end, subject, teacher: prof.name, room });
  await writeJSON('timetable', [...(await readJSON('timetable', [])),
    slot(1, '08:00', '09:00', 'Mathématiques', '12'), slot(2, '10:00', '11:00', 'Mathématiques', '12'),
    slot(4, '14:00', '15:00', 'Mathématiques', '14'), slot(5, '09:00', '10:00', 'Mathématiques', '12')]);

  const in3 = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  await writeJSON('homework', [...(await readJSON('homework', [])),
    { id: uid(), classId: '4B', subject: 'Mathématiques', title: 'Exercices 12 à 15 p. 84', dueDate: in3, createdBy: prof.id, createdAt: Date.now() }]);
  await writeJSON('grades', [...(await readJSON('grades', [])),
    { id: uid(), studentId: eleve.id, subject: 'Mathématiques', title: 'DS n°1', value: 14.5, outOf: 20, coef: 2, date: Date.now(), teacher: prof.id },
    { id: uid(), studentId: eleve.id, subject: 'Mathématiques', title: 'Interro', value: 8, outOf: 10, coef: 1, date: Date.now(), teacher: prof.id }]);
  await writeJSON('news', [{ id: uid(), title: 'Bienvenue sur l’espace Team DTK', text: 'Retrouve ici ton emploi du temps, tes devoirs et tes notes.', createdAt: Date.now() }, ...(await readJSON('news', []))]);
  return Response.json({ ok: true });
}
