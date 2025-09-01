// Server shell + client list
import FeedList from './FeedList';

export default async function FeedPage() {
  return (
    <main style={{ padding: 20, fontFamily: 'system-ui', maxWidth: 720, margin: '0 auto' }}>
      <h1>Feed</h1>
      <a href="/login" style={{ fontSize: 14 }}>Login</a>
      <FeedList />
    </main>
  );
}
