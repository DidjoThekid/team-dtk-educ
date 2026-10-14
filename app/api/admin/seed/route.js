import { getStaff, hashPassword } from '../../../../lib/auth';
// ...
export async function POST() {
  const s = await getStaff();
  if (s?.staff !== 'fondateur') return Response.json({ error: 'Non autorisé' }, { status: 401 });import { getStaff, hashPassword } from '../../../../lib/auth';
// ...
export async function POST() {
  const s = await getStaff();
  if (s?.staff !== 'fondateur') return Response.json({ error: 'Non autorisé' }, { status: 401 });
