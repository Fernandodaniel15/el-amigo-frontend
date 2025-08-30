import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import axios from "axios";

export default function PermalinkPage() {
  const router = useRouter();
  const { id } = router.query || {};
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        // Intento 1: endpoint con filtro por id (si tu /feed lo soporta)
        const r = await axios.get("/api/social/feed", { params: { id, _t: Date.now() } });
        let p = null;
        if (Array.isArray(r.data)) p = r.data.find(x => String(x.id) === String(id)) || null;
        else if (r.data?.items) p = r.data.items.find(x => String(x.id) === String(id)) || null;
        else if (r.data?.post) p = r.data.post;

        // Intento 2 (fallback): cargo primeros y busco
        if (!p) {
          const r2 = await axios.get("/api/social/feed", { params: { limit: 20, _t: Date.now() } });
          const arr = Array.isArray(r2.data) ? r2.data : (r2.data?.items || []);
          p = arr.find(x => String(x.id) === String(id)) || null;
        }
        setPost(p || null);
        if (!p) setError("Post no encontrado");
      } catch(e) {
        setError(e.message || "Error");
      }
    })();
  }, [id]);

  if (error) return <main style={{padding:"2rem"}}><p>⚠ {error}</p></main>;
  if (!post) return <main style={{padding:"2rem"}}><p>Cargando…</p></main>;

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Post #{post.id}</h1>
      <p><b>{post.author}</b></p>
      <p style={{ whiteSpace: "pre-wrap" }}>{post.text}</p>
      <small style={{ color:"#777" }}>
        Permalink listo — <a href={`/p/${post.id}`}>/p/{post.id}</a>
      </small>
    </main>
  );
}
