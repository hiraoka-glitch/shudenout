import dynamic from 'next/dynamic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 段階的復帰用のコンポーネント（必要に応じてコメントアウト解除）
// const Footer = dynamic(() => import('@/app/components/Footer'), { ssr: false });
// const GoogleAnalytics = dynamic(() => import('@/app/components/GoogleAnalytics'), { ssr: false });
// const StructuredData = dynamic(() => import('@/app/components/StructuredData'), { ssr: false });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>終電後にすぐ泊まれる宿</title>
        <meta name="description" content="本日空室ありのホテルのみ表示" />
        {/* StructuredData追加時: <StructuredData data={{}} /> */}
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        {/* GoogleAnalytics追加時: <GoogleAnalytics /> */}
        <main id="main">
          {children}
        </main>
        {/* Footer追加時: <Footer /> */}
        <footer style={{ textAlign: 'center', padding: '20px', borderTop: '1px solid #ccc', marginTop: '40px' }}>
          <p>&copy; 2024 終電後にすぐ泊まれる宿. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
