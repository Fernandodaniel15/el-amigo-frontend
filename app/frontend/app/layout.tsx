// app/frontend/app/layout.tsx
import './globals.css';

export const metadata = { title: 'El Amigo' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header style={{ padding: '12px 20px', borderBottom: '1px solid #eee', display: 'flex', gap: 12 }}>
          <a href="/feed">Feed</a>
          <a href="/login">Login</a>
        </header>
        <main style={{ padding: 20 }}>{children}</main>
      </body>
    </html>
  );
}
