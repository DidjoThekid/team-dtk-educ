'use client';
import { useEffect, useState, useCallback } from 'react';

const api = (r, method = 'GET', body, qs = '') =>
  fetch(`/api/admin/${r}${qs}`, { method, body: body ? JSON.stringify(body) : undefined }).then((x) => x.json());
const DAYS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

export function Users() {
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState('');
  const load = useCallback(() => api('users').then(setList), []);
  useEffect(() => { load(); }, [load]);
  async function add(e) {
    e.preventDefault();
    const form = e.target;
    const r = await api('users', 'POST', Object.fromEntries(new FormData(form)));
    setMsg(r.error || 'Compte créé ✅');
    if (!r.error) { form.reset(); load(); }
  }
  return (
    <>
      <form className="card" onSubmit={add}>
        <h3>Nouveau compte</h3>
        <input name="name" placeholder="Nom complet" required />
        <input name="login" placeholder="Identifiant (a-z, 0-9)" required autoCapitalize="none" />
        <select name="role"><option value="eleve">Élève</option><option value="prof">Professeur</option></select>
        <input name="classId" placeholder="Classe (élèves, ex. 4B)" />
        <input name="password" placeholder="Mot de passe (6+ caractères)" required />
        <button>Créer</button> <span className="mut">{msg}</span>
      </form>
      <div className="card"><table><tbody>
        {list.map((u) => (
          <tr key={u.id}>
            <td><b>{u.name}</b><div className="mut">{u.login}</div></td><td>{u.role}</td><td>{u.classId}</td>
            <td className="row">
              <button className="sec" onClick={async () => { const p = prompt('Nouveau mot de passe (6+) ?'); if (p) setMsg((await api('users', 'PATCH', { id: u.id, password: p })).error || 'Mot de passe changé ✅'); }}>Mot de passe</button>
              <button className="del" onClick={async () => { if (confirm(`Supprimer ${u.name} ?`)) { await api('users', 'DELETE', null, `?id=${u.id}`); load(); } }}>Supprimer</button>
            </td>
          </tr>
        ))}
      </tbody></table>{!list.length && <p className="mut">Aucun compte. Crée-en un ou utilise l'onglet Démo.</p>}</div>
    </>
  );
}

export function Timetable() {
  const [list, setList] = useState([]);
  useEffect(() => { api('timetable').then(setList); }, []);
  const save = (l) => { setList(l); api('timetable', 'PUT', l); };
  function add(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    save([...list, { id: Math.random().toString(36).slice(2, 10), ...f, day: Number(f.day) }]);
    e.target.reset();
  }
  return (
    <>
      <form className="card" onSubmit={add}>
        <h3>Ajouter un cours</h3>
        <input name="classId" placeholder="Classe (ex. 4B)" required />
        <select name="day">{[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{DAYS[d]}</option>)}</select>
        <div className="row"><input name="start" type="time" required style={{ flex: 1 }} /><input name="end" type="time" required style={{ flex: 1 }} /></div>
        <input name="subject" placeholder="Matière" required />
        <input name="teacher" placeholder="Professeur (nom exact du compte)" required />
        <input name="room" placeholder="Salle" />
        <button>Ajouter</button>
      </form>
      <div className="card"><table><tbody>
        {[...list].sort((a, b) => a.classId.localeCompare(b.classId) || a.day - b.day || a.start.localeCompare(b.start)).map((x) => (
          <tr key={x.id}><td>{x.classId}</td><td>{DAYS[x.day]}</td><td>{x.start}–{x.end}</td><td>{x.subject}</td><td>{x.teacher}</td><td>{x.room}</td>
            <td><button className="del" onClick={() => save(list.filter((y) => y.id !== x.id))}>✕</button></td></tr>
        ))}
      </tbody></table></div>
    </>
  );
}

export function News() {
  const [list, setList] = useState([]);
  useEffect(() => { api('news').then(setList); }, []);
  const save = (l) => { setList(l); api('news', 'PUT', l); };
  function add(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    save([{ id: Math.random().toString(36).slice(2, 10), ...f, createdAt: Date.now() }, ...list]);
    e.target.reset();
  }
  return (
    <>
      <form className="card" onSubmit={add}>
        <h3>Actualité de l'établissement</h3>
        <input name="title" placeholder="Titre" required />
        <textarea name="text" rows={3} placeholder="Texte" required />
        <button>Publier</button>
      </form>
      {list.map((n) => (<div key={n.id} className="card row" style={{ justifyContent: 'space-between' }}><div><b>{n.title}</b><div className="mut">{n.text}</div></div><button className="del" onClick={() => save(list.filter((x) => x.id !== n.id))}>Supprimer</button></div>))}
    </>
  );
}

export function Demo() {
  const [msg, setMsg] = useState('');
  return (
    <div className="card">
      <h3>Données de démo</h3>
      <p className="mut">Crée les comptes <b>eleve</b> et <b>prof</b> (mot de passe <b>demo1234</b>), un emploi du temps, un devoir, des notes et une actualité. À supprimer ensuite depuis l'onglet Comptes.</p>
      <button onClick={async () => setMsg((await api('seed', 'POST')).error || 'Démo créée ✅')}>Créer la démo</button> <span className="mut">{msg}</span>
    </div>
  );
}
