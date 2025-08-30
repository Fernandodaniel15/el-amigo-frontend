// app/frontend/app/feed/FeedForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/http";

export default function FeedForm() {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string>("");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!text.trim()) return;

    setSending(true);
    try {
      await apiPost("/v1/feed", { text });
      setText("");
      router.refresh(); // recarga los datos del server component
    } catch (e: any) {
      setErr(e?.message ?? "Error inesperado");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {err && <p style={{ color: "#dc2626", marginBottom: 8 }}>Error: {err}</p>}

      <textarea
        placeholder="Escribí algo..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        style={{
          width: "100%",
          fontFamily: "inherit",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #d1d5db",
        }}
      />

      <div style={{ marginTop: 10 }}>
        <button
          type="submit"
          disabled={sending}
          style={{
            background: "#111827",
            color: "#fff",
            border: 0,
            padding: "10px 16px",
            borderRadius: 8,
            cursor: sending ? "not-allowed" : "pointer",
          }}
        >
          {sending ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}
