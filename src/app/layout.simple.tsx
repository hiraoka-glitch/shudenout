import type { Metadata } from "next";
import "./globals.css";

// 超シンプルなメタデータ（SEO機能は一時停止）
export const metadata: Metadata = {
  title: "終電後にすぐ泊まれる宿",
  description: "本日空室ありのホテルのみ表示",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased min-h-screen bg-gray-50">
        <main id="main">
          {children}
        </main>
        <footer style={{ textAlign: 'center', padding: '20px', borderTop: '1px solid #ccc' }}>
          <p>&copy; 2024 終電後にすぐ泊まれる宿. All rights reserved.</p>
        </footer>
      </body>
    </html>
  );
}
