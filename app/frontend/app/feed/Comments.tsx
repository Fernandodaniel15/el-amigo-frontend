'use client';

import { useEffect, useRef, useState } from 'react';
import { apiGet, apiPost, apiDelete, apiPut, apiMe } from '@/lib/http';

type Props = { itemId: string };
type User = { id: string; name: string };
type Comment = {
  id: string;
  text: string;
  createdAt?: string;
  author?: User;
  // proyecciones del backend
  reactionsCount?: number;              // like clásico
  likedByMe?: boolean;                  // like clásico
  emojiCounts?: Record<string, number>; // emojis (conteos por emoji)
  myReaction?: string | null;           // mi emoji (single-choice)
  media?: {
    audios?: { url: string; transcription?: string; effect?: 'none'|'fast'|'slow'|'robot' }[];
  };
};

const EMOJIS = ['❤️','👎','👍','😂','🎉','😢','😡'] as const;

export default function Comments({ itemId }: Props) {
  const [list, setList] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [me, setMe] = useState<User | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [moreBusy, setMoreBusy] = useState(false);

  // Grabación de voz
  const [recOn, setRecOn] = useState(false);
  const vrecRef = useRef<MediaRecorder | null>(null);
  const vchunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [effect, setEffect] = useState<'none'|'fast'|'slow'|'robot'>('none');
  const [trans, setTrans] = useState('');

  useEffect(() => { apiMe().then(r=> setMe((r as any).user ?? null)); }, []);

  async function load(initial = false) {
    try {
      if (initial) { setLoading(true); setList([]); setCursor(undefined); }
      setErr('');
      const qs = new URLSearchParams(); qs.set('limit','10'); if (!initial && cursor) qs.set('cursor', cursor);
      const res = await apiGet<{ ok: true; comments: Comment[]; nextCursor?: string }>(
        `/v1/feed/${itemId}/comments?${qs.toString()}`
      );
      setList(prev => (initial ? res.comments : [...prev, ...res.comments]));
      setCursor(res.nextCursor);
    } catch (e: any) {
      setErr(e?.message ?? 'No se pudo cargar comentarios');
    } finally { if (initial) setLoading(false); }
  }
  useEffect(() => { load(true); /* eslint-disable-next-line */ }, [itemId]);

  async function onAdd() {
    const val = text.trim();
    if (!val) return;
    setBusy(true);
    try {
      await apiPost(`/v1/feed/${itemId}/comments`, { text: val });
      setText(''); await load(true);
    } catch (e: any) {
      alert(String(e?.message || '').includes('login') ? 'Iniciá sesión para comentar' : (e?.message ?? 'No se pudo comentar'));
    } finally { setBusy(false); }
  }

  async function onDelete(id: string) {
    if (!confirm('¿Borrar comentario?')) return;
    setBusy(true);
    try {
      await apiDelete(`/v1/feed/${itemId}/comments/${id}`);
      setList(prev => prev.filter(x => x.id !== id));
    } catch (e: any) {
      alert(e?.message ?? 'No se pudo borrar');
    } finally { setBusy(false); }
  }

  // Like clásico (optimista + rollback)
  async function onLike(id: string, likedByMe: boolean) {
    if (!me) return alert('Login para reaccionar');
    setList(prev => prev.map(c => c.id === id
      ? { ...c, likedByMe: !likedByMe, reactionsCount: Math.max(0, (c.reactionsCount || 0) + (likedByMe ? -1 : 1)) }
      : c));
    try { await apiPost(`/v1/feed/${itemId}/comments/${id}/like`, {}); }
    catch { load(true); }
  }

  // Emojis single-choice (optimista + rollback)
  async function onReact(id: string, type: string) {
    if (!me) return alert('Login para reaccionar');
    setList(prev => prev.map(c => {
      if (c.id !== id) return c;
      const prevR = c.myReaction || null;
      const counts: Record<string, number> = { ...(c.emojiCounts || {}) };
      for (const e of EMOJIS) counts[e] = counts[e] ?? 0;
      if (prevR) counts[prevR] = Math.max(0, (counts[prevR] || 0) - 1);
      if (prevR !== type) counts[type] = (counts[type] || 0) + 1;
      return { ...c, emojiCounts: counts, myReaction: (prevR === type ? null : type) };
    }));
    try { await apiPost(`/v1/feed/${itemId}/comments/${id}/react`, { type }); }
    catch { load(true); }
  }

  function startEdit(c: Comment) { setEditingId(c.id); setEditVal(c.text); }
  function cancelEdit() { setEditingId(null); setEditVal(''); }
  async function saveEdit(id: string) {
    const val = editVal.trim(); if (!val) return;
    setBusy(true);
    try {
      await apiPut(`/v1/feed/${itemId}/comments/${id}`, { text: val });
      setList(prev => prev.map(c => c.id === id ? { ...c, text: val } : c));
      cancelEdit();
    } catch (e:any) { alert(e?.message || 'No se pudo editar'); }
    finally { setBusy(false); }
  }

  // ====== Grabación de voz ======
  async function startVoice() {
    if (!me) return alert('Login');
    if (!navigator.mediaDevices?.getUserMedia) return alert('Tu navegador no soporta getUserMedia');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      vchunksRef.current = [];
      vrecRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) vchunksRef.current.push(e.data); };
      mr.onstop = async () => {
        try {
          const blob = new Blob(vchunksRef.current, { type: 'audio/webm' });
          const fr = new FileReader();
          fr.onload = async () => {
            try {
              const up = await apiPost<{ ok: true; url: string }>(`/v1/files`, { dataUrl: String(fr.result), ext: 'webm' });
              await apiPost(`/v1/feed/${itemId}/comments`, {
                text: '',
                media: { audios: [{ url: up.url, effect, transcription: trans }] }
              });
              setTrans(''); setEffect('none');
              await load(true);
            } catch (e:any) {
              alert(e?.message || 'No se pudo subir/grabar');
            }
          };
          fr.readAsDataURL(blob);
        } finally {
          stream.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      };
      mr.start();
      setRecOn(true);
    } catch {
      alert('No se pudo acceder al micrófono');
    }
  }
  function stopVoice() {
    const mr = vrecRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
    // las tracks se cierran en onstop
    setRecOn(false);
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #ddd' }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Comentarios</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={me ? 'Escribí un comentario…' : 'Logueate para comentar'}
          disabled={!me}
          style={{ flex: 1, minWidth: 220, padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
        />
        <button disabled={busy || !text.trim() || !me} onClick={onAdd}>Agregar</button>
        {!me && <a href="/login">Login</a>}

        {/* Mensaje de voz */}
        <select value={effect} onChange={e=>setEffect(e.target.value as any)}>
          <option value="none">Efecto: ninguno</option>
          <option value="fast">Rápido</option>
          <option value="slow">Lento</option>
          <option value="robot">Robot</option>
        </select>
        <input
          value={trans}
          onChange={e=>setTrans(e.target.value)}
          placeholder="Transcripción (opcional)"
          style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
        />
        {!recOn ? (
          <button disabled={!me} onClick={startVoice}>🎙️ Grabar voz</button>
        ) : (
          <button onClick={stopVoice}>⏹️ Detener</button>
        )}
      </div>

      {loading && <div style={{ color: '#666' }}>Cargando…</div>}
      {err && !loading && <div style={{ color: '#b00020' }}>Error: {err}</div>}

      {!loading && list.length === 0 ? (
        <div style={{ color: '#666' }}>No hay comentarios.</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map((c) => {
            // Regla: si hay autor => solo el autor; si no hay autor (legacy), cualquiera logueado
            const iCanEdit   = !!(me && (!c.author || me.id === c.author.id));
            const iCanDelete = iCanEdit;

            const when = c.createdAt ? (
              <time dateTime={c.createdAt} suppressHydrationWarning>{new Date(c.createdAt).toLocaleString()}</time>
            ) : '';

            const counts: Record<string, number> = { ...(c.emojiCounts || {}) };
            for (const e of EMOJIS) counts[e] = counts[e] ?? 0;

            return (
              <li key={c.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 8 }}>
                {editingId === c.id ? (
                  <div>
                    <textarea value={editVal} onChange={e=>setEditVal(e.target.value)} rows={2} style={{ width: '100%', padding: 6 }} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button disabled={busy} onClick={()=>saveEdit(c.id)}>Guardar</button>
                      <button disabled={busy} onClick={cancelEdit}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Texto */}
                    {!!c.text && <div style={{ marginBottom: 4, whiteSpace: 'pre-wrap' }}>{c.text}</div>}

                    {/* Audio adjunto */}
                    {c.media?.audios?.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
                        {c.media.audios.map((a, i) => (
                          <div key={i}>
                            <audio
                              src={a.url}
                              controls
                              // efectos locales con playbackRate
                              onPlay={(e) => {
                                const el = e.currentTarget as HTMLAudioElement;
                                if (a.effect === 'fast') el.playbackRate = 1.35;
                                else if (a.effect === 'slow') el.playbackRate = 0.8;
                                else if (a.effect === 'robot') el.playbackRate = 1.05;
                                else el.playbackRate = 1;
                              }}
                            />
                            {a.transcription ? <small style={{ color: '#555' }}>📝 {a.transcription}</small> : null}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Meta + reacciones */}
                    <div style={{ fontSize: 12, color: '#666', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span>{c.author?.name ? <b>{c.author.name}</b> : '—'} · {when}</span>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {/* Like clásico */}
                        <button onClick={()=>onLike(c.id, !!c.likedByMe)}>
                          {c.likedByMe ? '❤️ Quitar' : '🤍 Me gusta'} ({c.reactionsCount || 0})
                        </button>
                        {/* Emojis (single-choice) */}
                        {EMOJIS.map(e => (
                          <button key={e} onClick={()=>onReact(c.id, e)} title={`Reaccionar ${e}`}>
                            {c.myReaction === e ? `[${e}]` : e} ({counts[e] || 0})
                          </button>
                        ))}
                        {iCanEdit && <button onClick={()=>{ setEditingId(c.id); setEditVal(c.text); }}>Editar</button>}
                        {iCanDelete && <button disabled={busy} onClick={() => onDelete(c.id)}>Borrar</button>}
                      </div>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!!cursor && (
        <div style={{ marginTop: 10 }}>
          <button disabled={moreBusy} onClick={async ()=>{ setMoreBusy(true); await load(false); setMoreBusy(false); }}>
            Cargar más
          </button>
        </div>
      )}
    </div>
  );
}
