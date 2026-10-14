'use client';
import { useEffect, useState, useCallback } from 'react';
import { Users, Timetable, News, Demo } from './AdminExtra';

const api = (r, method = 'GET', body, qs = '') =>
  fetch(`/api/admin/${r}${qs}`, { method, body: body ? JSON.stringify(body) : undefined }).then((x) => x.json());
const fmt = (t) => new Date(t).toLocaleString('fr-FR');

function Announcements() {
  const [list, setList] = useState([]);
  const [text, setText] = useState('');
  const [type, setType] = useState('info');
  useEffect(() => { api('announcements').then(setList); }, []);
  const save = (l) => { setList(l); api('announcements', 'PUT', l); };
  const add = () => {
    if (!text.trim()) return;
    save([{ id: Math.random().toString(36).slice(2, 10), text, type, active: true, createdAt: Date.now() }, ...list]);
    setText('');
  };
  return (
    <>
      <div className="card">
        <h3>Nouvelle annonce</h3>
        <div className="row">
          {['Ce site est en version bêta 🚧', 'Maintenance du site prévue ce soir 🛠️'].map((s) => (
            <button key={s} className="sec" onClick={() => setText(s)}>{s}</button>
          ))}
        </div>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Texte de l'annonce" style={{ marginTop: 10 }} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="info">Info (bleu)</option>
          <option value="warning">Avertissement (orange)</option>
          <option value="maintenance">Maintenance (rouge)</option>
        </select>
        <button onClick={add}>Publier</button>
      </div>
      {list.map((a) => (
        <div key={a.id} className="card row" style={{ justifyContent: 'space-between' }}>
          <div><span className="badge">{a.type}</span> {a.text} <div className="mut">{fmt(a.createdAt)}</div></div>
          <div className="row">
            <button className="sec" onClick={() => save(list.map((x) => x.id === a.id ? { ...x, active: !x.active } : x))}>{a.active ? 'Désactiver' : 'Activer'}</button>
            <button className="del" onClick={() => save(list.filter((x) => x.id !== a.id))}>Supprimer</button>
          </div>
        </div>
      ))}
    </>
  );
}

function Support() {
  const [list, setList] = useState([]);
  const [replies, setReplies] = useState({});
  const load = useCallback(() => api('support').then(setList), []);
  useEffect(() => { load(); }, [load]);
  return list.length === 0 ? <p className="mut">Aucune demande.</p> : list.map((t) => (
    <div key={t.id} className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <b>{t.subject}</b>
        <span className="badge">{t.status === 'open' ? '🟢 ouvert' : '⚪ fermé'}</span>
      </div>
      <div className="mut">{t.name} · <a href={`mailto:${t.email}?subject=Re: ${encodeURIComponent(t.subject)}`}>{t.email}</a> · {fmt(t.createdAt)}</div>
      <p>{t.message}</p>
      {(t.replies || []).map((r, i) => <div key={i} className="mut">↳ Note de {r.by || 'l’équipe'} ({fmt(r.at)}) : {r.text}</div>)}
      {t.modBy && <div className="mut">Dernière action : {t.modBy}</div>}
      <input placeholder="Note interne" value={replies[t.id] || ''} onChange={(e) => setReplies({ ...replies, [t.id]: e.target.value })} />
      <div className="row">
        <button className="sec" onClick={async () => { if (replies[t.id]) { await api('support', 'PATCH', { id: t.id, reply: replies[t.id] }); setReplies({ ...replies, [t.id]: '' }); load(); } }}>Ajouter la note</button>
        <button className="sec" onClick={async () => { await api('support', 'PATCH', { id: t.id, status: t.status === 'open' ? 'closed' : 'open' }); load(); }}>{t.status === 'open' ? 'Fermer' : 'Rouvrir'}</button>
        <button className="del" onClick={async () => { await api('support', 'DELETE', null, `?id=${t.id}`); load(); }}>Supprimer</button>
      </div>
    </div>
  ));
}

function Moderation() {
  const [posts, setPosts] = useState([]);
  const [s, setS] = useState(null);
  const load = useCallback(() => { api('posts').then(setPosts); api('settings').then(setS); }, []);
  useEffect(() => { load(); }, [load]);
  const saveS = (n) => { setS(n); api('settings', 'PUT', n); };
  const act = async (id, status) => { await api('posts', 'PATCH', { id, status }); load(); };
  if (!s) return null;
  const listEdit = (key, label) => (
    <>
      <label className="mut">{label} (séparés par des virgules)</label>
      <input defaultValue={s[key].join(', ')} onBlur={(e) => saveS({ ...s, [key]: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} />
    </>
  );
  return (
    <>
      <div className="card">
        <h3>Règles</h3>
        <label><input type="checkbox" style={{ width: 'auto' }} checked={s.boardOpen} onChange={(e) => saveS({ ...s, boardOpen: e.target.checked })} /> Forum ouvert</label>
        {listEdit('bannedWords', 'Mots interdits (le message passe en attente)')}
        {listEdit('bannedPseudos', 'Pseudos bannis')}
      </div>
      {posts.map((p) => (
        <div key={p.id} className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <b>{p.pseudo}</b><span className="badge">{p.status}</span>
          </div>
          <div className="mut">{fmt(p.createdAt)}{p.modBy && ` · modéré par ${p.modBy}`}</div>
          <p>{p.text}</p>
          <div className="row">
            {p.status !== 'visible' && <button onClick={() => act(p.id, 'visible')}>Approuver</button>}
            {p.status !== 'hidden' && <button className="sec" onClick={() => act(p.id, 'hidden')}>Masquer</button>}
            <button className="sec" onClick={() => saveS({ ...s, bannedPseudos: [...new Set([...s.bannedPseudos, p.pseudo])] })}>Bannir le pseudo</button>
            <button className="del" onClick={async () => { await api('posts', 'DELETE', null, `?id=${p.id}`); load(); }}>Supprimer</button>
          </div>
        </div>
      ))}
    </>
  );
}

function Settings() {
  const [s, setS] = useState(null);
  useEffect(() => { api('settings').then(setS); }, []);
  if (!s) return null;
  const save = (n) => { setS(n); api('settings', 'PUT', n); };
  return (
    <div className="card">
      <h3>Mode maintenance</h3>
      <p className="mut">Quand il est activé, les visiteurs voient seulement le message ci-dessous. L'équipe Team DTK garde l'accès.</p>
      <label><input type="checkbox" style={{ width: 'auto' }} checked={s.maintenance} onChange={(e) => save({ ...s, maintenance: e.target.checked })} /> Maintenance activée</label>
      <textarea rows={3} defaultValue={s.maintenanceMessage} onBlur={(e) => save({ ...s, maintenanceMessage: e.target.value })} />
    </div>
  );
}

const TABS = {
  annonces: ['📢 Annonces', Announcements], users: ['👥 Comptes', Users], edt: ['📅 Emploi du temps', Timetable],
  news: ['📰 Actualités', News], support: ['🎧 Support', Support], moderation: ['🛡️ Modération', Moderation],
  reglages: ['⚙️ Réglages', Settings], demo: ['🧪 Démo', Demo],
};
const MOD_TABS = ['annonces', 'news', 'support', 'moderation']; // onglets visibles par un modérateur

export default function AdminPanel({ staff }) {
  const keys = Object.keys(TABS).filter((k) => staff.level === 'fondateur' || MOD_TABS.includes(k));
  const [tab, setTab] = useState(keys[0]);
  const Current = TABS[tab][1];
  return (
    <div className="wrap">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Admin Team DTK</h1>
        <div className="row">
          <span className="mut">{staff.name} · {staff.level}</span>
          <a href="/app"><button className="sec">Retour au site</button></a>
          <button className="sec" onClick={async () => { await fetch('/api/portal/login', { method: 'DELETE' }); location.href = '/login'; }}>Déconnexion</button>
        </div>
      </div>
      <div className="tabs">
        {keys.map((k) => (<button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{TABS[k][0]}</button>))}
      </div>
      <Current key={tab} />
    </div>
  );
}
