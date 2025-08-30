import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link href="/">Inicio</Link>
      <Link href="/feed">Feed</Link>
      <Link href="/wallet">Wallet</Link>
      <Link href="/economy">Economía</Link>
      <Link href="/events">Eventos</Link>
      <Link href="/profile">Perfil</Link>
      <Link href="/pactamos">Pactamos</Link>
      <Link href="/admin">Admin</Link>
      <Link href="/legal/terminos">Legal</Link>
      <Link href="/login">Login</Link>
    </nav>
  );
}
