// el-amigo-frontend\packages\web\components\Navbar.js
import Link from "next/link";

export default function Navbar() {
  return (
    <nav>
      <Link href="/">Home</Link> |{" "}
      <Link href="/feed">Feed</Link> |{" "}
      <Link href="/wallet">Wallet</Link> |{" "}
      <Link href="/eventos">Eventos</Link> |{" "}
      <Link href="/profile">Perfil</Link> |{" "}
      <Link href="/auth/login">Login</Link> |{" "}
      <Link href="/auth/register">Registrarme</Link>
    </nav>
  );
}

