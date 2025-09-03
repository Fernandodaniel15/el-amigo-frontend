import dynamic from 'next/dynamic';

// Cargamos el formulario como componente de cliente:
const FeedForm = dynamic(() => import('../app/feed/FeedForm'), { ssr: false });

export default function FeedPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 16 }}>
      <nav style={{ marginBottom: 16 }}>
        <a href="/feed" style={{ marginRight: 12 }}>Feed</a>
        <a href="/login">Login</a>
      </nav>

      <h1>Feed</h1>
      <FeedForm />
    </main>
  );
}
