import './globals.css';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-slate-900">
        <div className="max-w-7xl mx-auto px-4">{children}</div>
      </body>
    </html>
  );
}