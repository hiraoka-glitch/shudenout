import type { Metadata } from "next";
import "./globals.css";

// Fallback フォント設定（エラー耐性）
let geistSans: any;
let geistMono: any;
try {
  const { Geist, Geist_Mono } = require("next/font/google");
  geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
  });
  geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
  });
} catch (fontError) {
  console.warn('⚠️ Font loading failed, using fallback:', fontError);
  geistSans = { variable: "--font-geist-sans" };
  geistMono = { variable: "--font-geist-mono" };
}

// 防御的メタデータ生成
let safeMetadata: Metadata;
try {
  const { generateMetadata } = require("@/lib/seo");
  safeMetadata = generateMetadata({ canonical: "/" });
} catch (metadataError) {
  console.warn('⚠️ Metadata generation failed, using fallback:', metadataError);
  safeMetadata = {
    title: "終電後にすぐ泊まれる宿",
    description: "本日空室ありのホテルのみ表示",
  };
}

export const metadata: Metadata = safeMetadata;

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 防御的なコンポーネント読み込み
  let Footer: any = () => null;
  let StructuredData: any = () => null;
  let GoogleAnalytics: any = () => null;
  let websiteStructuredData: any = {};

  try {
    Footer = require("@/app/components/Footer").default;
  } catch (footerError) {
    console.warn('⚠️ Footer component failed to load:', footerError);
  }

  try {
    StructuredData = require("@/app/components/StructuredData").default;
    const { generateStructuredData } = require("@/lib/seo");
    websiteStructuredData = generateStructuredData("website");
  } catch (structuredDataError) {
    console.warn('⚠️ StructuredData component failed:', structuredDataError);
  }

  try {
    GoogleAnalytics = require("@/app/components/GoogleAnalytics").default;
  } catch (analyticsError) {
    console.warn('⚠️ GoogleAnalytics component failed:', analyticsError);
  }

  const fontClasses = [
    geistSans?.variable || "",
    geistMono?.variable || "",
    "antialiased",
    "min-h-screen", 
    "bg-gray-50"
  ].filter(Boolean).join(" ");

  return (
    <html lang="ja">
      <head>
        <StructuredData data={websiteStructuredData} />
      </head>
      <body className={fontClasses}>
        <GoogleAnalytics />
        <main id="main">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}