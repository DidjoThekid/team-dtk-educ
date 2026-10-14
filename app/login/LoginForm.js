'use client';
import { useState } from 'react';

export default function LoginForm() {
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    const res = await fetch('/api/portal/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    if (res.ok) location.href = '/app'; else setErr((await res.json()).error || 'Erreur');
  }
  return (
    <div className="wrap" style={{ maxWidth: 400, paddingTop: 70 }}>
      <form className="card" onSubmit={submit}>
        <h1>🎓 Espace scolaire</h1>
        <p className="mut">Connecte-toi avec l'identifiant donné par ton établissement.</p>
        <input name="login" placeholder="Identifiant" required autoFocus autoCapitalize="none" />
        <input name="password" type="password" placeholder="Mot de passe" required />
        <p className="mut" style={{ marginTop: 10 }}>
          Vous êtes prof ? <a href="mailto:team-dtk@outlook.com">Contactez-nous par mail à team-dtk@outlook.com</a> pour créer votre classe !
        </p>
        <button>Connexion</button> <span style={{ color: 'var(--err)' }}>{err}</span>
      </form>
    </div>
  );
}
