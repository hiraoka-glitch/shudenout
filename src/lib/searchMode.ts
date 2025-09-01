/**
 * 検索モードの安全な変換とバリデーション
 * 旧値（current等）が来ても絶対にクラッシュしない
 */

const ALLOWED = ['area', 'station'] as const; // 'current'は削除済み
export type SearchMode = typeof ALLOWED[number];

export function coerceSearchMode(input: unknown, fallback: SearchMode = 'area'): SearchMode {
  const v = String(input ?? '').toLowerCase();
  
  // 現在有効な値かチェック
  if ((ALLOWED as readonly string[]).includes(v)) {
    return v as SearchMode;
  }
  
  // 旧値の互換維持（現在地系は全てareaにフォールバック）
  if (['current', 'current_location', 'nearby', 'geo'].includes(v)) {
    console.warn(`SearchMode: Deprecated value "${v}" → fallback to "${fallback}"`);
    return fallback;
  }
  
  // 不明値もフォールバック
  if (v !== '' && v !== 'undefined' && v !== 'null') {
    console.warn(`SearchMode: Unknown value "${v}" → fallback to "${fallback}"`);
  }
  
  return fallback;
}

/**
 * SearchModeの選択肢定義（UI用）
 */
export const SEARCH_MODE_OPTIONS = [
  { value: 'area' as const, label: 'エリアで探す' },
  { value: 'station' as const, label: '駅から探す' },
  // 'current'は削除済み - 旧値との互換性はcoerceSearchModeで処理
] as const;

/**
 * 安全なモード判定（switch文用）
 */
export function isValidSearchMode(mode: unknown): mode is SearchMode {
  return typeof mode === 'string' && (ALLOWED as readonly string[]).includes(mode);
}
