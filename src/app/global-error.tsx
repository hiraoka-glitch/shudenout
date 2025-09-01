'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 詳細なスタック情報をログ出力（本番でファイル・行番号特定用）
  console.error('[global-error] Message:', error?.message || 'No message');
  console.error('[global-error] Stack:', error?.stack || 'No stack');
  console.error('[global-error] Digest:', error?.digest || 'No digest');
  console.error('[global-error] Full error object:', error);
  console.error('[global-error] Error name:', error?.name || 'No name');
  console.error('[global-error] Error cause:', (error as any)?.cause || 'No cause');
  
  return (
    <html>
      <body>
        <div style={{ maxWidth: 720, margin: '40px auto', padding: 24 }}>
          <h1>一時的なエラーが発生しました</h1>
          <p>ページの一部で問題が起きましたが、サイトは利用可能です。</p>
          <details style={{ marginTop: 20 }}>
            <summary>エラー詳細（開発・診断用）</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#f5f5f5', padding: 10, marginTop: 10 }}>
              Message: {error?.message ?? 'unknown error'}
              {'\n'}
              Name: {error?.name ?? 'unknown name'}
              {'\n'}
              Digest: {error?.digest ?? 'no digest'}
              {'\n'}
              Stack: {error?.stack ?? 'no stack trace'}
            </pre>
          </details>
          <div style={{ marginTop: 20 }}>
            <button onClick={() => reset()}>再読み込み</button>
            <a href="/" style={{ marginLeft: 12 }}>トップへ戻る</a>
            <a href="/health" style={{ marginLeft: 12 }}>ヘルスチェック</a>
            <a href="/_layout-ok" style={{ marginLeft: 12 }}>レイアウトテスト</a>
            <a href="/api/diag" style={{ marginLeft: 12 }}>API診断</a>
          </div>
        </div>
      </body>
    </html>
  );
}
