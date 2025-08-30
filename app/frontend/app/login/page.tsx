// app/frontend/app/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiLogin, apiLogout, apiMe } from '@/lib/http';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function refreshMe() {
    const r = await apiMe();
    setMe(r.ok && r.user ? r.user : null);
  }

  return (
    <div>
      <h1>Login</h1>
      <button onClick={refreshMe} style={{ marginBottom: 12 }}>Ver estado</button>
      {me && <div>Conectado: <b>{me.name}</b> ({me.id})</div>}

      <div style={{ marginTop: 16 }}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre..." />
        <button disabled={busy} onClick={async ()=>{
          setBusy(true);
          try {
            await apiLogin(name);
            router.push('/feed');
            router.refresh();
          } finally { setBusy(false); }
        }}>Entrar</button>

        <button disabled={busy} onClick={async ()=>{
          setBusy(true);
          try {
            await apiLogout();
            router.refresh();
          } finally { setBusy(false); }
        }} style={{ marginLeft: 8 }}>Salir</button>
      </div>
    </div>
  );
}
