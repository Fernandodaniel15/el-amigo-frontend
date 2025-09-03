// app/frontend/app/feed/FeedForm.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { apiMe, apiPost } from '@/lib/http';

type Me  = { id: string; name: string };
type Img = { url: string; filter?: string; caption?: string };
type Vid = { url: string; filter?: string };
type Aud = { url: string; transcription?: string; effect?: 'none'|'fast'|'slow'|'robot' };

const IMG_FILTERS = ['none','grayscale','sepia','contrast','saturate','blur'] as const;
const VID_FILTERS = ['none','grayscale','sepia','contrast'] as const;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

function absUrl(u: string) {
  if (!u) return u;
  return /^https?:\/\//i.test(u) ? u : `${API_BASE}${u.startsWith('/') ? u : `/${u}`}`;
}

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

export default function FeedForm() {
  const [me, setMe]     = useState<Me | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const [imgs, setImgs] = useState<Img[]>([]);
  const [vids, setVids] = useState<Vid[]>([]);
  const [auds, setAuds] = useState<Aud[]>([]);

  // FOTO (cámara)
  const photoVideoRef  = useRef<HTMLVideoElement | null>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const [photoCamOn, setPhotoCamOn] = useState(false);

  // VIDEO (grabación)
  const recVideoRef      = useRef<HTMLVideoElement | null>(null);
  const recStreamRef     = useRef<MediaStream | null>(null);
  const recMediaRecRef   = useRef<MediaRecorder | null>(null);
  const recChunksRef     = useRef<BlobPart[]>([]);
  const [recOn, setRecOn]= useState(false);

  // AUDIO / VOZ
  const vrecRef        = useRef<MediaRecorder | null>(null);
  const vrecChunksRef  = useRef<BlobPart[]>([]);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceEffect, setVoiceEffect] = useState<'none'|'fast'|'slow'|'robot'>('none');
  const [voiceTrans,  setVoiceTrans]  = useState('');

  useEffect(() => {
    apiMe().then(r => setMe(r.user ?? null));
    return () => {
      photoStreamRef.current?.getTracks().forEach(t => t.stop());
      recStreamRef.current?.getTracks().forEach(t => t.stop());
      if (recMediaRecRef.current && recMediaRecRef.current.state !== 'inactive') recMediaRecRef.current.stop();
      if (vrecRef.current && vrecRef.current.state !== 'inactive') vrecRef.current.stop();
    };
  }, []);

  // ===== helpers de subida =====
  const fileToDataURL = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
  }, []);

  async function uploadDataURL(dataUrl: string, ext?: string) {
    const up = await apiPost<{ ok: true; url: string }>('/v1/files', { dataUrl, ext });
    return absUrl(up.url);
  }
  async function uploadFile(file: File, extFallback: string) {
    const dataUrl = await fileToDataURL(file);
    const ext = file.name.split('.').pop() || extFallback;
    return uploadDataURL(dataUrl, ext);
  }

  // ===== cámara (foto) =====
  const startPhotoCam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      photoStreamRef.current = stream;
      setPhotoCamOn(true); // importante: enlazar luego en useEffect
    } catch {
      alert('No se pudo abrir la cámara');
    }
  }, []);

  const stopPhotoCam = useCallback(() => {
    photoStreamRef.current?.getTracks().forEach(t => t.stop());
    photoStreamRef.current = null;
    setPhotoCamOn(false);
  }, []);

  // enlazar stream -> video cuando existe el nodo
  useEffect(() => {
    const v = photoVideoRef.current;
    const s = photoStreamRef.current;
    if (photoCamOn && v && s) {
      try {
        // @ts-ignore
        v.srcObject = s;
        v.muted = true;
        v.play().catch(() => {});
      } catch {}
    }
  }, [photoCamOn]);

  const takeSnapshot = useCallback(async () => {
    const v = photoVideoRef.current;
    if (!v) return;
    const w = v.videoWidth || 640;
    const h = v.videoHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(v, 0, 0, w, h);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const url = await uploadDataURL(dataUrl, 'png');
      setImgs(prev => [...prev, { url: absUrl(url), filter: 'none' }]);
    } catch (e:any) {
      alert(e?.message || 'No se pudo subir la foto');
    }
  }, []);

  // ===== inputs por archivo =====
  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const uploaded: Img[] = [];
    for (const f of files) {
      const url = await uploadFile(f, 'jpg');
      uploaded.push({ url: absUrl(url), filter: 'none' });
    }
    setImgs(prev => [...prev, ...uploaded]);
    e.currentTarget.value = '';
  }
  async function onPickVideos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const uploaded: Vid[] = [];
    for (const f of files) {
      const url = await uploadFile(f, 'mp4');
      uploaded.push({ url: absUrl(url), filter: 'none' });
    }
    setVids(prev => [...prev, ...uploaded]);
    e.currentTarget.value = '';
  }

  // ===== grabar video =====
  const startRecVideo = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      recStreamRef.current = s;
      recChunksRef.current = [];

      const mime =
        (window as any).MediaRecorder?.isTypeSupported?.('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' :
        (window as any).MediaRecorder?.isTypeSupported?.('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' :
        (window as any).MediaRecorder?.isTypeSupported?.('video/mp4') ? 'video/mp4' : '';

      const mr = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
      recMediaRecRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blobType = mime.includes('mp4') ? 'video/mp4' : 'video/webm';
        const blob = new Blob(recChunksRef.current, { type: blobType });
        recChunksRef.current = [];
        const fr = new FileReader();
        fr.onload = async () => {
          try {
            const url = await uploadDataURL(String(fr.result), blobType.endsWith('mp4') ? 'mp4' : 'webm');
            setVids(prev => [...prev, { url: absUrl(url), filter: 'none' }]);
          } catch (e:any) { alert(e?.message || 'No se pudo subir el video'); }
        };
        fr.readAsDataURL(blob);
        s.getTracks().forEach(t => t.stop());
      };

      setRecOn(true); // renderiza el <video> de preview
      mr.start();     // imprescindible
    } catch {
      alert('No se pudo iniciar la cámara para video');
    }
  }, []);

  // enlazar stream -> video preview
  useEffect(() => {
    const v = recVideoRef.current;
    const s = recStreamRef.current;
    if (recOn && v && s) {
      try {
        // @ts-ignore
        v.srcObject = s;
        v.muted = true;
        v.play().catch(() => {});
      } catch {}
    }
  }, [recOn]);

  const stopRecVideo = useCallback(() => {
    const mr = recMediaRecRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
    setRecOn(false);
  }, []);

  // ===== audio / voz =====
  const startVoice = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      vrecChunksRef.current = [];

      const aMime =
        (window as any).MediaRecorder?.isTypeSupported?.('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        (window as any).MediaRecorder?.isTypeSupported?.('audio/ogg;codecs=opus') ? 'audio/ogg;codecs=opus' :
        (window as any).MediaRecorder?.isTypeSupported?.('audio/mp4') ? 'audio/mp4' : '';

      const mr = new MediaRecorder(s, aMime ? { mimeType: aMime } : undefined);
      vrecRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) vrecChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blobType = aMime.includes('mp4') ? 'audio/mp4' : (aMime.includes('ogg') ? 'audio/ogg' : 'audio/webm');
        const blob = new Blob(vrecChunksRef.current, { type: blobType });
        const fr = new FileReader();
        fr.onload = async () => {
          try {
            const ext = blobType.endsWith('mp4') ? 'm4a' : (blobType.endsWith('ogg') ? 'ogg' : 'webm');
            const url = await uploadDataURL(String(fr.result), ext);
            setAuds(prev => [...prev, { url: absUrl(url), effect: voiceEffect, transcription: voiceTrans }]);
            setVoiceTrans(''); setVoiceEffect('none');
          } catch (e:any) {
            alert(e?.message || 'No se pudo subir el audio');
          }
        };
        fr.readAsDataURL(blob);
        s.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setVoiceOn(true);
    } catch {
      alert('No se pudo acceder al micrófono');
    }
  }, [voiceEffect, voiceTrans]);

  const stopVoice = useCallback(() => {
    const mr = vrecRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
    setVoiceOn(false);
  }, []);

  // ===== publicar =====
  const onSubmit = useCallback(async () => {
    const val = text.trim();
    const hasMedia = imgs.length > 0 || vids.length > 0 || auds.length > 0;
    if (!val && !hasMedia) return alert('Escribí algo o adjuntá media');
    setBusy(true);
    try {
      await apiPost('/v1/feed', {
        text: val,
        media: {
          images: imgs.length ? imgs : undefined,
          videos: vids.length ? vids : undefined,
          audios: auds.length ? auds : undefined,
        }
      });
      setText('');
      setImgs([]); setVids([]); setAuds([]);
      // @ts-ignore
      if (typeof window !== 'undefined' && (window as any)?.amigoRefreshFeed) (window as any).amigoRefreshFeed();
      else window.location.reload();
    } catch (e:any) {
      alert(e?.message || 'No se pudo publicar');
    } finally { setBusy(false); }
  }, [text, imgs, vids, auds]);

  if (!me) return <div>Logueate para postear. <a href="/login">Login</a></div>;

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
      <textarea
        value={text}
        onChange={(e)=>setText(e.target.value)}
        rows={3}
        placeholder="¿Qué querés compartir?"
        style={{ width: '100%', padding: 8 }}
      />

      {/* Adjuntos archivo */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        <label style={{ cursor: 'pointer' }}>
          📷 Fotos (archivo)
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onPickImages} />
        </label>
        <label style={{ cursor: 'pointer' }}>
          🎬 Videos (archivo)
          <input type="file" accept="video/*" multiple style={{ display: 'none' }} onChange={onPickVideos} />
        </label>
      </div>

      {/* Cámara: foto */}
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!photoCamOn ? (
          <button onClick={startPhotoCam}>📸 Tomar foto con cámara</button>
        ) : (
          <>
            <video ref={photoVideoRef} autoPlay playsInline muted style={{ width: 240, borderRadius: 8, background:'#000' }} />
            <button onClick={takeSnapshot}>Tomar captura</button>
            <button onClick={stopPhotoCam}>Cerrar cámara</button>
          </>
        )}
      </div>

      {/* Cámara: video */}
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!recOn ? (
          <button onClick={startRecVideo}>🎥 Grabar video</button>
        ) : (
          <>
            <video ref={recVideoRef} autoPlay playsInline muted style={{ width: 240, borderRadius: 8, background:'#000' }} />
            <button onClick={stopRecVideo}>⏹ Detener</button>
          </>
        )}
      </div>

      {/* Voz */}
      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={voiceEffect} onChange={e=>setVoiceEffect(e.target.value as any)}>
          <option value="none">Efecto: ninguno</option>
          <option value="fast">Rápido</option>
          <option value="slow">Lento</option>
          <option value="robot">Robot</option>
        </select>
        <input
          value={voiceTrans}
          onChange={e=>setVoiceTrans(e.target.value)}
          placeholder="Transcripción (opcional)"
          style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd' }}
        />
        {!voiceOn ? (
          <button onClick={startVoice}>🎙 Grabar voz</button>
        ) : (
          <button onClick={stopVoice}>⏹ Detener</button>
        )}
      </div>

      {/* Previews imágenes */}
      {imgs.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, overflowX: 'auto' }}>
          {imgs.map((im, i) => (
            <div key={i} style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'center' }}>
              <img src={im.url} style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 8, filter: cssFilter(im.filter) }} />
              <select value={im.filter || 'none'} onChange={e => {
                const v = e.target.value;
                setImgs(prev => prev.map((x,idx)=> idx===i ? { ...x, filter: v } : x));
              }}>
                {IMG_FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <button onClick={()=> setImgs(prev => prev.filter((_,idx)=>idx!==i))}>Quitar</button>
            </div>
          ))}
        </div>
      )}

      {/* Previews videos */}
      {vids.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, overflowX: 'auto' }}>
          {vids.map((vd, i) => (
            <div key={i} style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-start', border:'1px solid #eee', borderRadius:8, padding:6 }}>
              <video src={vd.url} style={{ width: 260, borderRadius: 8, filter: cssFilter(vd.filter) }} controls />
              <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
                <label>Filtro:
                  <select value={vd.filter || 'none'} onChange={e => {
                    const v = e.target.value;
                    setVids(prev => prev.map((x,idx)=> idx===i ? { ...x, filter: v } : x));
                  }}>
                    {VID_FILTERS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </label>
                <button onClick={()=> setVids(prev => prev.filter((_,idx)=>idx!==i))}>Quitar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'flex-end', marginTop: 10 }}>
        <button disabled={busy} onClick={onSubmit}>Publicar</button>
      </div>
    </div>
  );
}
