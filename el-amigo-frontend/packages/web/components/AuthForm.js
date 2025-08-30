// packages/web/components/AuthForm.js
import { useState } from "react";
import axios from "axios";

export default function AuthForm({ mode }) {
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    password: ""
  });
  const [status, setStatus] = useState(null);

  const isLogin = mode === "login";

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await axios.post("http://localhost:3000/auth/login", {
          email: form.email,
          password: form.password,
        });
      } else {
        await axios.post("http://localhost:3000/auth/register", {
          email: form.email,
          fullName: form.fullName,
          password: form.password,
        });
      }
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  return (
    <main>
      <h2>{isLogin ? "Iniciar Sesión" : "Registro de Usuario"}</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="email"
          onChange={handleChange}
          placeholder="Email"
          autoComplete="email"
        />
        {!isLogin && (
          <input
            name="fullName"
            onChange={handleChange}
            placeholder="Nombre completo"
            autoComplete="name"
          />
        )}
        <input
          name="password"
          onChange={handleChange}
          type="password"
          placeholder="Contraseña"
          autoComplete={isLogin ? "current-password" : "new-password"}
        />
        <button type="submit">
          {isLogin ? "Entrar" : "Registrarme"}
        </button>
      </form>
      {status === "ok" && (
        <p style={{ color: "green" }}>Operación exitosa.</p>
      )}
      {status === "error" && (
        <p style={{ color: "red" }}>Error en la operación.</p>
      )}
    </main>
  );
}
