// packages/web/components/out.js
import React, { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState("login");
  const [loginData, setLoginData] = useState({ user: "", password: "" });
  const [registerData, setRegisterData] = useState({
    email: "",
    fullName: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  function switchTab(t) {
    setTab(t);
    setMsg("");
  }

  function handleLoginChange(e) {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  }

  function handleRegisterChange(e) {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      await axios.post("http://localhost:3000/auth/login", {
        email: loginData.user.includes("@") ? loginData.user : undefined,
        password: loginData.password,
      });
      router.push("/");
    } catch (err) {
      setMsg(err?.response?.data?.mensaje || "Error de login");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      await axios.post("http://localhost:3000/auth/register", {
        email: registerData.email,
        fullName: registerData.fullName,
        password: registerData.password,
      });
      setMsg("¡Registro exitoso! Redirigiendo a login...");
      setTimeout(() => router.push("/PageLogin"), 1000);
    } catch (err) {
      setMsg(err?.response?.data?.mensaje || "Error en el registro");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    display: "block",
    width: "100%",
    padding: 12,
    marginBottom: 14,
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 16,
    outline: "none",
  };

  const buttonStyle = {
    width: "100%",
    padding: 12,
    background: "#4f0fc5",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: "bold",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "60px auto",
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 4px 16px #0002",
        padding: 32,
      }}
    >
      <div style={{ display: "flex", marginBottom: 24 }}>
        <button
          style={{
            flex: 1,
            padding: 12,
            background: tab === "login" ? "#4f0fc5" : "#eee",
            color: tab === "login" ? "#fff" : "#333",
            border: "none",
            fontWeight: "bold",
            borderRadius: "16px 0 0 16px",
            cursor: "pointer",
          }}
          onClick={() => switchTab("login")}
        >
          Iniciar sesión
        </button>
        <button
          style={{
            flex: 1,
            padding: 12,
            background: tab === "register" ? "#4f0fc5" : "#eee",
            color: tab === "register" ? "#fff" : "#333",
            border: "none",
            fontWeight: "bold",
            borderRadius: "0 16px 16px 0",
            cursor: "pointer",
          }}
          onClick={() => switchTab("register")}
        >
          Crear cuenta
        </button>
      </div>

      {tab === "login" ? (
        <form onSubmit={handleLogin}>
          <input
            name="user"
            type="text"
            placeholder="Email"
            value={loginData.user}
            onChange={handleLoginChange}
            required
            style={inputStyle}
            autoComplete="username"
          />
          <div style={{ position: "relative" }}>
            <input
              name="password"
              type={showPwd ? "text" : "password"}
              placeholder="Contraseña"
              value={loginData.password}
              onChange={handleLoginChange}
              required
              style={inputStyle}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                height: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              {showPwd ? "🙈" : "👁️"}
            </button>
          </div>
          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={registerData.email}
            onChange={handleRegisterChange}
            required
            style={inputStyle}
            autoComplete="email"
          />
          <input
            name="fullName"
            type="text"
            placeholder="Nombre completo"
            value={registerData.fullName}
            onChange={handleRegisterChange}
            required
            style={inputStyle}
            autoComplete="name"
          />
          <div style={{ position: "relative" }}>
            <input
              name="password"
              type={showPwd ? "text" : "password"}
              placeholder="Contraseña"
              value={registerData.password}
              onChange={handleRegisterChange}
              required
              style={inputStyle}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                height: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              {showPwd ? "🙈" : "👁️"}
            </button>
          </div>
          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>
      )}

      {msg && (
        <div style={{ marginTop: 20, color: msg.startsWith("¡Registro") ? "green" : "#c00", fontWeight: 500 }}>
          {msg}
        </div>
      )}
    </div>
  );
}
