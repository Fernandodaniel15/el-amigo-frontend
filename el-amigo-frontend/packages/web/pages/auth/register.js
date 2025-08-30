import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";

export default function Register() {
  const [form, setForm] = useState({ email: "", fullName: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      await axios.post("http://localhost:3000/auth/register", {
        email: form.email,
        fullName: form.fullName,
        password: form.password,
      }, { withCredentials: true });
      setMsg("Operación exitosa.");
      setTimeout(() => router.push("/profile"), 1200);
    } catch {
      setMsg("Error en la operación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h2>Registro de Usuario</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
          value={form.email}
          autoComplete="email"
        />
        <input
          name="fullName"
          placeholder="Nombre completo"
          onChange={handleChange}
          value={form.fullName}
          autoComplete="name"
        />
        <div style={{ display: "flex", alignItems: "center" }}>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Contraseña"
            onChange={handleChange}
            value={form.password}
            autoComplete="new-password"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            style={{
              marginLeft: 8,
              padding: "6px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {showPassword ? "Ocultar" : "Ver"}
          </button>
        </div>
        <button type="submit" disabled={loading} style={{ marginTop: 10 }}>
          {loading ? "Registrando..." : "Registrarme"}
        </button>
      </form>
      {msg && (
        <p style={{ color: msg.startsWith("Operación") ? "green" : "red" }}>{msg}</p>
      )}
    </main>
  );
}
