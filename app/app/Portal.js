'use client';
import { useEffect, useState, useCallback } from 'react';

const call = (res, method = 'GET', body, qs = '') =>
  fetch(`/api/portal/${res}${qs}`, { method, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());
const fd = (t) => new Date(t).toLocaleDateString('fr-FR');
const fdt = (t) => new Date(t).toLocaleString('fr-FR');
const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

function useRes(res) {
  const [data, setData] = useState(null);
  const load = useCallback(() => call(res).then((d) => setData(Array.isArray(d) ? d : d.error ? [] : d)).catch(() => setData([])), [res]);
  useEffect(() => { load(); }, [load]);
  return [data, load];
}
const avg = (gs) => {
  const c = gs.reduce((a, g) => a + g.coef, 0);
  return c ? (gs.reduce((a, g) => a + (g.value / g.outOf) * 20 * g.coef, 0) / c).toFixed(2) : '–';
};
const Loading = () => <p className="mut">Chargement…</p>;

function AddForm({ res, onDone, children, label = 'Ajouter' }) {
  const [msg, setMsg] = useState('');
  async function submit(e) {
    e.preventDefault();
    const form = e.target;
    const r = await call(res, 'POST', Object.fromEntries(new FormData(form)));
    if (r.error) return setMsg(r.error);
    setMsg(r.message || '');
    form.reset();
    onDone && onDone();
  }
  return (<form className="card" onSubmit={submit}>{children}<button>{label}</button> <span className="mut">{msg}</span></form>);
}

function Home({ me }) {
  const [news] = useRes('news');
  const [hw] = useRes('homework');
  const [gr] = useRes('grades');
  if (!news || !hw || !gr) return <Loading />;
  const todo = hw.filter((h) => !h.done).slice(0, 5);
  return (
    <>
      <div className="card"><h3>📰 Actualités</h3>{news.slice(0, 3).map((n) => (<p key={n.id}><b>{n.title}</b><br />{n.text}</p>))}{!news.length && <p className="mut">Rien pour le moment.</p>}</div>
      <div className="card"><h3>📚 {me.role === 'prof' ? 'Devoirs donnés' : 'Travail à faire'}</h3>{todo.map((h) => (<div key={h.id}>• <b>{h.subject}</b> pour le {fd(h.dueDate)} : {h.title}</div>))}{!todo.length && <p className="mut">Rien à faire 🎉</p>}</div>
      {me.role === 'eleve' && <div className="card"><h3>📝 Dernières notes</h3>{gr.slice(0, 4).map((g) => (<div key={g.id}>• <b>{g.subject}</b> – {g.title} : <span className="pill">{g.value}/{g.outOf}</span></div>))}{!gr.length && <p className="mut">Aucune note.</p>}</div>}
    </>
  );
}

function Edt({ me }) {
  const [t] = useRes('edt');
  if (!t) return <Loading />;
  return (
    <div className="edt">
      {DAYS.map((name, i) => (
        <div key={name} className="card">
          <h3>{name}</h3>
          {t.filter((x) => x.day === i + 1).sort((a, b) => a.start.localeCompare(b.start)).map((x) => (
            <div key={x.id} className="slot"><b>{x.start}–{x.end}</b> {x.subject}
              <div className="mut">{me.role === 'prof' ? `Classe ${x.classId}` : x.teacher} · salle {x.room}</div></div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Devoirs({ me }) {
  const prof = me.role === 'prof';
  const [hw, load] = useRes('homework');
  const [st] = useRes(prof ? 'students' : 'me');
  if (!hw) return <Loading />;
  const classes = prof && Array.isArray(st) ? [...new Set(st.map((s) => s.classId))] : [];
  return (
    <>
      {prof && (
        <AddForm res="homework" onDone={load} label="Donner le devoir">
          <h3>Nouveau devoir</h3>
          <select name="classId" required>{classes.map((c) => <option key={c}>{c}</option>)}</select>
          <input name="subject" placeholder="Matière" required />
          <input name="title" placeholder="Travail à faire" required />
          <input name="dueDate" type="date" required />
        </AddForm>
      )}
      {hw.map((h) => (
        <div key={h.id} className="card row" style={{ justifyContent: 'space-between' }}>
          <div className={h.done ? 'done' : ''}><b>{h.subject}</b> · pour le {fd(h.dueDate)}{prof && ` · ${h.classId}`}<br />{h.title}</div>
          {prof
            ? <button className="del" onClick={async () => { await call('homework', 'DELETE', null, `?id=${h.id}`); load(); }}>Supprimer</button>
            : <button className="sec" onClick={async () => { await call('hwdone', 'POST', { id: h.id }); load(); }}>{h.done ? 'Annuler' : 'Fait ✔'}</button>}
        </div>
      ))}
      {!hw.length && <p className="mut">Aucun devoir.</p>}
    </>
  );
}

function Notes({ me }) {
  const prof = me.role === 'prof';
  const [gr, load] = useRes('grades');
  const [st] = useRes(prof ? 'students' : 'me');
  if (!gr) return <Loading />;
  if (prof) {
    return (
      <>
        <AddForm res="grades" onDone={load} label="Enregistrer la note">
          <h3>Nouvelle note</h3>
          <select name="studentId" required>{(Array.isArray(st) ? st : []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.classId})</option>)}</select>
          <input name="subject" placeholder="Matière" required />
          <input name="title" placeholder="Intitulé (ex. DS n°1)" />
          <div className="row"><input name="value" type="number" step="0.25" placeholder="Note" required style={{ flex: 1 }} /><input name="outOf" type="number" defaultValue={20} style={{ flex: 1 }} /><input name="coef" type="number" step="0.5" defaultValue={1} style={{ flex: 1 }} /></div>
        </AddForm>
        <div className="card"><table><tbody>{gr.map((g) => (<tr key={g.id}><td>{g.studentName}</td><td>{g.subject} – {g.title}</td><td>{g.value}/{g.outOf}</td><td><button className="del" onClick={async () => { await call('grades', 'DELETE', null, `?id=${g.id}`); load(); }}>✕</button></td></tr>))}</tbody></table></div>
      </>
    );
  }
  const subjects = [...new Set(gr.map((g) => g.subject))];
  return (
    <>
      <div className="card"><h3>Moyenne générale : <span className="pill">{avg(gr)}/20</span></h3></div>
      {subjects.map((s) => {
        const list = gr.filter((g) => g.subject === s);
        return (
          <div key={s} className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}><h3>{s}</h3><span className="pill">{avg(list)}</span></div>
            <table><tbody>{list.map((g) => (<tr key={g.id}><td>{g.title}</td><td>{fd(g.date)}</td><td>coef {g.coef}</td><td><b>{g.value}/{g.outOf}</b></td></tr>))}</tbody></table>
          </div>
        );
      })}
      {!gr.length && <p className="mut">Aucune note pour le moment.</p>}
    </>
  );
}

function Absences({ me }) {
  const prof = me.role === 'prof';
  const [ab, load] = useRes('absences');
  const [st] = useRes(prof ? 'students' : 'me');
  if (!ab) return <Loading />;
  const label = { non: 'non justifiée', attente: 'en attente', oui: 'justifiée ✅' };
  return (
    <>
      {prof && (
        <AddForm res="absences" onDone={load} label="Signaler">
          <h3>Signaler une absence / un retard</h3>
          <select name="studentId" required>{(Array.isArray(st) ? st : []).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.classId})</option>)}</select>
          <select name="type"><option value="absence">Absence</option><option value="retard">Retard</option></select>
          <input name="date" type="date" required />
          <input name="duration" placeholder="Durée (ex. 1 h, 10 min)" />
        </AddForm>
      )}
      {ab.map((a) => (
        <div key={a.id} className="card row" style={{ justifyContent: 'space-between' }}>
          <div><b>{a.type === 'retard' ? '⏰ Retard' : '🚫 Absence'}</b> · {fd(a.date)} {a.duration && `· ${a.duration}`}{prof && ` · ${a.studentName}`}
            <div className="mut">{label[a.justified]}{a.reason && ` — ${a.reason}`}</div></div>
          <div className="row">
            {!prof && a.justified === 'non' && <button className="sec" onClick={async () => { const reason = prompt('Motif ?'); if (reason) { await call('absences', 'PATCH', { id: a.id, reason }); load(); } }}>Justifier</button>}
            {prof && a.justified === 'attente' && <button onClick={async () => { await call('absences', 'PATCH', { id: a.id, justified: 'oui' }); load(); }}>Valider</button>}
            {prof && <button className="del" onClick={async () => { await call('absences', 'DELETE', null, `?id=${a.id}`); load(); }}>✕</button>}
          </div>
        </div>
      ))}
      {!ab.length && <p className="mut">Aucune absence ni retard.</p>}
    </>
  );
}

function Messages() {
  const [m, load] = useRes('messages');
  const [c] = useRes('contacts');
  if (!m || !c) return <Loading />;
  return (
    <>
      <AddForm res="messages" onDone={load} label="Envoyer">
        <h3>Nouveau message</h3>
        <select name="to" required>{c.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}</select>
        <input name="subject" placeholder="Objet" />
        <textarea name="text" rows={3} placeholder="Message" required />
      </AddForm>
      {m.map((x) => (
        <div key={x.id} className="card">
          <b>{x.subject}</b> <span className="mut">· {x.fromName} → {x.toName} · {fdt(x.createdAt)}</span>
          <p>{x.text}</p>
        </div>
      ))}
    </>
  );
}

function News() {
  const [n] = useRes('news');
  if (!n) return <Loading />;
  return n.length ? n.map((x) => (<div key={x.id} className="card"><h3>{x.title}</h3><div className="mut">{fd(x.createdAt)}</div><p>{x.text}</p></div>)) : <p className="mut">Aucune actualité.</p>;
}

function Forum() {
  const [p, load] = useRes('forum');
  if (!p) return <Loading />;
  return (
    <>
      <AddForm res="forum" onDone={load} label="Publier"><h3>Forum</h3><textarea name="text" rows={2} placeholder="Ton message" required maxLength={500} /></AddForm>
      {p.map((x) => (<div key={x.id} className="card"><b>{x.pseudo}</b> <span className="mut">{fdt(x.createdAt)}</span><div>{x.text}</div></div>))}
    </>
  );
}

function Support({ me }) {
  const [msg, setMsg] = useState('');
  async function submit(e) {
    e.preventDefault();
    const form = e.target;
    const res = await fetch('/api/support', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const j = await res.json();
    setMsg(res.ok ? `Demande envoyée ✅ (n° ${j.id})` : j.error || 'Erreur');
    if (res.ok) form.reset();
  }
  return (
    <form className="card" onSubmit={submit}>
      <h3>Contacter le support</h3>
      <input name="name" defaultValue={me.name} required />
      <input name="email" type="email" placeholder="Ton e-mail (pour la réponse)" required />
      <input name="subject" placeholder="Sujet" required />
      <textarea name="message" rows={4} placeholder="Décris ton problème" required />
      <input className="hp" name="website" tabIndex={-1} autoComplete="off" />
      <button>Envoyer</button> <span className="mut">{msg}</span>
    </form>
  );
}

const TABS = [
  ['accueil', '🏠 Accueil', Home], ['edt', '📅 Emploi du temps', Edt], ['devoirs', '📚 Devoirs', Devoirs],
  ['notes', '📝 Notes', Notes], ['absences', '🚫 Absences', Absences], ['messages', '✉️ Messagerie', Messages],
  ['news', '📰 Actualités', News], ['forum', '💬 Forum', Forum], ['support', '🎧 Support', Support],
];

export default function Portal({ me }) {
  const [tab, setTab] = useState('accueil');
  const Current = TABS.find((t) => t[0] === tab)[2];
  return (
    <>
      <div className="top">
        <b>🎓 Espace scolaire</b>
        <span>{me.name} · {me.role === 'prof' ? 'Professeur' : `Élève ${me.classId}`}{' '}
          <button onClick={async () => { await fetch('/api/portal/login', { method: 'DELETE' }); location.href = '/login'; }}>Déconnexion</button></span>
      </div>
      <div className="wrap">
        <div className="nav">{TABS.map(([k, label]) => (<button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>))}</div>
        <Current key={tab} me={me} />
      </div>
    </>
  );
}
