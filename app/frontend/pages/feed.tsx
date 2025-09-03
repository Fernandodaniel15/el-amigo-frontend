import dynamic from 'next/dynamic';
const FeedForm = dynamic(() => import('../app/feed/FeedForm'), { ssr: false });

export default function FeedPage() {
  return (
    <main style={{ maxWidth: 860, margin: '0 auto', padding: 16 }}>
      <h1>Feed</h1>
      <FeedForm />
    </main>
  );
}
