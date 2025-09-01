/**
 * 本番環境でthrowしない安全なassertNever
 */
export function assertNever(x: never, context?: string): void {
  // 開発時のみ例外を投げる
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-throw-literal
    throw new Error(`assertNever: ${context ?? 'unknown context'} received unexpected value: ${String(x)}`);
  } else {
    // 本番では警告ログのみ（クラッシュしない）
    console.warn('[assertNever] Non-fatal assertion failed:', {
      context: context ?? 'unknown context',
      value: String(x),
      type: typeof x
    });
  }
}
