/**
 * エリア定義とコア機能
 * UIとAPIで共通利用する信頼できる座標データ
 */

export type AreaKey =
  | 'shinjuku' | 'shibuya' | 'ikebukuro' | 'ueno' | 'tokyo' | 'yokohama';

export const AREAS: Record<AreaKey, { label: string; lat: number; lng: number }> = {
  shinjuku:  { label: '新宿',   lat: 35.6905, lng: 139.7004 },
  shibuya:   { label: '渋谷',   lat: 35.6591, lng: 139.7036 },
  ikebukuro: { label: '池袋',   lat: 35.7289, lng: 139.7101 },
  ueno:      { label: '上野',   lat: 35.7123, lng: 139.7770 },
  tokyo:     { label: '東京駅', lat: 35.6812, lng: 139.7671 },
  yokohama:  { label: '横浜',   lat: 35.4662, lng: 139.6220 },
};

export const DEFAULT_AREA: AreaKey = 'shinjuku';

/**
 * 安全なエリア変換：未知値・旧値をフォールバック
 */
export function coerceArea(input: unknown): AreaKey {
  const v = String(input ?? '').toLowerCase();
  if (v in AREAS) return v as AreaKey;
  
  // 互換: 旧キー・誤表記はデフォルトへ吸収
  if (['current', 'nearby', 'geo', 'now', '', 'current_location'].includes(v)) {
    return DEFAULT_AREA;
  }
  
  return DEFAULT_AREA;
}

/**
 * エリア選択肢配列（UIコンポーネント用）
 */
export const AREA_OPTIONS = Object.entries(AREAS).map(([key, area]) => ({
  value: key as AreaKey,
  label: area.label,
  ...area
}));

/**
 * エリアキーから座標取得（安全フォールバック付き）
 */
export function getAreaCoords(areaKey: AreaKey | string | null | undefined): { lat: number; lng: number; label: string } {
  const safe = coerceArea(areaKey);
  return AREAS[safe];
}

/**
 * 座標から最も近いエリアを推定（逆引き）
 */
export function findNearestArea(lat: number, lng: number): AreaKey {
  let nearest = DEFAULT_AREA;
  let minDistance = Infinity;
  
  for (const [key, area] of Object.entries(AREAS)) {
    const distance = Math.sqrt(
      Math.pow(lat - area.lat, 2) + Math.pow(lng - area.lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = key as AreaKey;
    }
  }
  
  return nearest;
}
