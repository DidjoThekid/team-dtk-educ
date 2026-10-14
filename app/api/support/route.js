import { readJSON, writeJSON, uid } from '../../../lib/db';

export async function POST(req) {
  let b;
  try { b = JSON.parse(await req.text()); } catch { return Response.json({ error: 'Requête invalide' }, { status: 400 }); }
  if (b.website) return Response.json({ ok: true, id: 'ok' }); // honeypot anti-bot
  if (!b.name || !b.email || !b.subject || !b.message || !/^\S+@\S+\.\S+$/.test(String(b.email)))
    return Response.json({ error: 'Champs invalides' }, { status: 400 });
  const tickets = await readJSON('support', []);
  const ticket = {
    id: uid(),
    name: String(b.name).slice(0, 60), email: String(b.email).slice(0, 120),
    subject: String(b.subject).slice(0, 120), message: String(b.message).slice(0, 2000),
    status: 'open', createdAt: Date.now(), replies: [],
  };
  tickets.unshift(ticket);
  await writeJSON('support', tickets);
  return Response.json({ ok: true, id: ticket.id });
}
