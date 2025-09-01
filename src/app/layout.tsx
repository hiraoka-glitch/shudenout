import { inter } from './fonts';
import FooterBuild from './components/FooterBuild';
import './globals.css';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>終電後にすぐ泊まれる宿</title>
        <meta name="description" content="本日空室ありのホテルのみ表示" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite", 
              "name": "終電後にすぐ泊まれる宿",
              "description": "本日空室ありのホテルのみ表示"
            }, null, 2),
          }}
        />
      </head>
      <body className={inter.className}>
        <main id="main">
          {children}
        </main>
        <footer style={{ 
          textAlign: 'center', 
          padding: '20px', 
          borderTop: '1px solid #ccc', 
          marginTop: '40px' 
        }}>
          <p>&copy; 2024 終電後にすぐ泊まれる宿. All rights reserved.</p>
          <FooterBuild />
        </footer>
      </body>
    </html>
  );
}