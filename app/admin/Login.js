'use client';
import { useState } from 'react';

export default function Login() {
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    const password = new FormData(e.target).get('password');
    const res = await fetch('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) });
    if (res.ok) location.reload(); else setErr('Mot de passe incorrect');
  }
  return (
    <div className="wrap" style={{ maxWidth: 380, paddingTop: 80 }}>
      <form className="card" onSubmit={submit}>
        <h2>🔐 Admin</h2>
        <input type="password" name="password" placeholder="Mot de passe" autoFocus required />
        <button>Connexion</button> <span style={{ color: 'var(--err)' }}>{err}</span>
      </form>
    </div>
  );
}
