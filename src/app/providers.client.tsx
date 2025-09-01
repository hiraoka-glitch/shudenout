'use client';
import { useEffect } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  // ブラウザ限定の初期化はここで実行
  useEffect(() => {
    // Google Analytics 初期化や window 依存処理など
    console.log('🔧 Client-side providers initialized');
  }, []);

  return <>{children}</>;
}
