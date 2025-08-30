// packages/web/pages/index.js
import Head from "next/head";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <>
      <Head>
        <title>EL AMIGO — Social + Fintech</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Evitar cache en la home (opcional) */}
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate, proxy-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </Head>

      <Navbar />

      <main style={{ maxWidth: 960, margin: "24px auto", padding: "0 16px" }}>
        <h1>EL AMIGO - Social + Fintech</h1>
        <p>
          Bienvenido a la plataforma social y económica más avanzada. Acceso a feed, wallet, eventos,
          microcréditos, IA, comunidad y compliance legal. Todo integrado.
        </p>

        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <Link href="/feed" legacyBehavior>
            <a
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                background: "#6b25d7",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              Ir al feed
            </a>
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
