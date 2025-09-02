'use client';

import { useEffect, useRef, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { apiDelete, apiPut, apiPost, apiMe } from '@/lib/http';
import Comments from './Comments';

type Media = {
  images?: { url: string; filter?: string }[];
  videos?: { url: string; poster?: string; filter?: string; overlay?: { text: string; pos: 'tl'|'tr'|'bl'|'br'; size: number; family: string } }[];
  audios?: { url: string; transcription?: string; effect?: 'none'|'fast'|'slow'|'robot' }[];
};

type Props = {
  id: string;
  text: string;
  createdAt?: string;
  author?: { id: string; name: string };
  media?: Media;
  reactionsCount?: number;
  likedByMe?: boolean;
  emojiCounts?: Record<string, number>;
  myReaction?: string | null;
};

const EMOJIS = ['❤️','👎','👍','😂','🎉','😢','😡'] as const;

function cssFilter(filter?: string) {
  switch (filter) {
    case 'grayscale': return 'grayscale(1)';
    case 'sepia': return 'sepia(1)';
    case 'contrast': return 'contrast(1.4)';
    case 'saturate': return 'saturate(1.6)';
    case 'blur': return 'blur(2px)';
    default: return 'none';
  }
}

export default function FeedItem({
  id, text, createdAt, author, media,
  reactionsCount = 0, likedByMe = false,
  emojiCounts = {}, myReaction = null
}: Props) {
  const router = useRouter();
  const [me, setMe] = useState<{id:string; name:string} | null>(null);
  const [displayText, setDisplayText] = useState(text);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [busy, setBusy] = useState(false);

  const [likes, setLikes] = useState(reactionsCount);
  const [liked, setLiked] = useState(likedByMe);

  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    for (const e of EMOJIS) base[e] = emojiCounts[e] ?? 0;
    return base;
  });
  const [mine, setMine] = useState<string | null>(myReaction);

  // WebAudio para efecto "robot" en reproducción de audio
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => { apiMe().then(r => setMe(r.user ?? null)); }, []);
  const canEdit = !!(me && (!author || me.id === author.id));

  async function onSave() {
    if (!value.trim()) return;
    setBusy(true);
    try {
      await apiPut(`/v1/feed/${id}`, { text: value });
      setDisplayText(value);
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (e:any) { alert(e?.message || 'No se pudo guardar'); }
    finally { setBusy(false); }
  }

  async function onDelete() {
    if (!confirm('¿Borrar este ítem?')) return;
    setBusy(true);
    try { await apiDelete(`/v1/feed/${id}`); startTransition(() => router.refresh()); }
    catch (e:any) { alert(e?.message || 'No se pudo borrar'); }
    finally { setBusy(false); }
  }

  async function onLike() {
    if (!me) return alert('Login para reaccionar');
    const was = liked;
    setLiked(!was);
    setLikes(n => n + (was ? -1 : 1));
    try { await apiPost(`/v1/feed/${id}/like`, {}); startTransition(() => router.refresh()); }
    catch { setLiked(was); setLikes(n => n + (was ? 1 : -1)); }
  }

  async function onReact(type: string) {
    if (!me) return alert('Login para reaccionar');
    const prev = mine;
    setMine(prev === type ? null : type);
    setCounts(c => {
      const next = { ...c };
      if (prev) next[prev] = Math.max(0, (next[prev] || 0) - 1);
      if (prev !== type && type) next[type] = (next[type] || 0) + 1;
      return next;
    });
    try { await apiPost(`/v1/feed/${id}/react`, { type }); }
    catch {
      setMine(prev);
      setCounts(c => {
        const next = { ...c };
        if (prev) next[prev] = (next[prev] || 0) + 1;
        if (prev !== type && type) next[type] = Math.max(0, (next[type] || 0) - 1);
        return next;
      });
    }
  }

  // Audio con efectos (al reproducir)
  function attachAudioEffects(el: HTMLAudioElement, effect?: 'none'|'fast'|'slow'|'robot') {
    if (!effect || effect === 'none') { el.playbackRate = 1; return; }
    if (effect === 'fast') { el.playbackRate = 1.35; return; }
    if (effect === 'slow') { el.playbackRate = 0.8; return; }
    // robot: usar WebAudio BiquadFilter
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaElementSource(el);
      const biquad = ctx.createBiquadFilter();
      biquad.type = 'bandpass';
      biquad.frequency.value = 1200;
      biquad.Q.value = 3;
      source.connect(biquad).connect(ctx.destination);
    } catch {}
  }

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 10 }}>
      {!editing ? (
        <>
          {!!displayText && <div style={{ marginBottom: 6, whiteSpace: 'pre-wrap' }}>{displayText}</div>}

          {/* IMÁGENES (carrusel) */}
          {media?.images?.length ? (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 8 }}>
              {media.images.map((img, i) => (
                <img key={i} src={img.url} alt="" style={{ width: 220, height: 220, objectFit: 'cover', borderRadius: 8, filter: cssFilter(img.filter) }} />
              ))}
            </div>
          ) : null}

          {/* VIDEOS (con overlay de texto) */}
          {media?.videos?.length ? (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 8 }}>
              {media.videos.map((v, i) => (
                <div key={i} style={{ position:'relative' }}>
                  <video src={v.url} poster={v.poster} controls style={{ width: 360, borderRadius: 8, filter: cssFilter(v.filter) }} />
                  {v.overlay?.text ? (
                    <div
                      style={{
                        position:'absolute',
                        ...(v.overlay.pos === 'tl' ? { top:8, left:8 } :
                            v.overlay.pos === 'tr' ? { top:8, right:8 } :
                            v.overlay.pos === 'bl' ? { bottom:8, left:8 } :
                                                      { bottom:8, right:8 }),
                        background:'rgba(0,0,0,0.4)',
                        color:'#fff',
                        padding:'4px 6px',
                        borderRadius:6,
                        fontSize: v.overlay.size,
                        fontFamily: v.overlay.family,
                        pointerEvents:'none'
                      }}
                    >
                      {v.overlay.text}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* AUDIOS (con efectos en reproducción) */}
          {media?.audios?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {media.audios.map((a, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <audio
                    src={a.url}
                    controls
                    onPlay={(e) => attachAudioEffects(e.currentTarget, a.effect)}
                  />
                  {a.transcription ? <small style={{ color: '#555' }}>📝 {a.transcription}</small> : null}
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>
            {author?.name ? <b>{author.name}</b> : '—'} ·{' '}
            {createdAt ? (
              <time dateTime={createdAt} suppressHydrationWarning>{new Date(createdAt).toLocaleString()}</time>
            ) : ''}
          </div>

          {/* Reacciones */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <button onClick={onLike}>{liked ? '❤️ Quitar' : '🤍 Me gusta'} ({likes})</button>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => onReact(e)} title={`Reaccionar ${e}`}>
                {mine === e ? `[${e}]` : e} ({counts[e] || 0})
              </button>
            ))}
            {canEdit && (
              <>
                <button onClick={()=>setEditing(true)}>Editar</button>
                <button onClick={onDelete}>Borrar</button>
              </>
            )}
          </div>
        </>
      ) : (
        <div>
          <textarea value={value} onChange={e=>setValue(e.target.value)} rows={3} style={{ width: '100%', padding: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button disabled={busy} onClick={onSave}>Guardar</button>
            <button disabled={busy} onClick={()=>{ setEditing(false); setValue(displayText); }}>Cancelar</button>
          </div>
        </div>
      )}

      <Comments itemId={id} />
    </div>
  );
}
