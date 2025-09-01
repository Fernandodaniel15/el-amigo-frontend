'use client';
import { useEffect, useState } from 'react';
import { apiLogin, apiLogout, apiMe } from '@/lib/http';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [me, setMe] = useState<{id:string; name:string} | null>(null);
  const [id, setId] = useState('u1');
  const [name, setName] = useState('Fer');
  const router = useRouter();

  async function refreshMe() { const r = await apiMe(); setMe(r.user ?? null); }
  useEffect(() => { refreshMe(); }, []);

  return (
    <main style={{ padding: 20, fontFamily: 'system-ui' }}>
      <nav style={{ marginBottom: 12 }}><a href="/feed">Feed</a></nav>
      <h1>Login</h1>
      <p>{me ? `Logueado como ${me.name} (${me.id})` : 'No logueado'}</p>

      <div style={{ display: 'flex', gap: 8, marginBlock: 10 }}>
        <input value={id} onChange={e=>setId(e.target.value)} placeholder="id" />
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="name" />
        <button onClick={async ()=>{ await apiLogin(id, name); await refreshMe(); router.refresh(); }}>Login</button>
        <button onClick={async ()=>{ await apiLogout(); await refreshMe(); router.refresh(); }}>Logout</button>
      </div>

      <a href="/feed">Ir al feed</a>
    </main>
  );
}
