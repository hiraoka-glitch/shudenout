/**
 * 地理座標の正規化とバリデーション
 * 秒単位で来た緯度経度を度に変換し、不正値を検出
 */

export function normalizeLatLng(latRaw: number | string, lngRaw: number | string) {
  const toNum = (v: any) => {
    if (typeof v === 'string') return Number(v);
    if (typeof v === 'number') return v;
    return NaN;
  };
  
  // 秒で来たら度に矯正（±180を超える値は秒単位と判定）
  const fix = (v: number) => {
    if (!Number.isFinite(v)) return NaN;
    return Math.abs(v) > 180 ? v / 3600 : v;
  };
  
  // 小数点6桁で丸める（約1mの精度）
  const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
  
  const lat = round6(fix(toNum(latRaw)));
  const lng = round6(fix(toNum(lngRaw)));
  
  return { lat, lng };
}

export function isValidLatLng(lat: number | null, lng: number | null): boolean {
  if (lat == null || lng == null) return false;
  return Number.isFinite(lat) && 
         Number.isFinite(lng) && 
         Math.abs(lat) <= 90 && 
         Math.abs(lng) <= 180;
}

/**
 * データ形状を判定（デバッグ用）
 */
export function detectLatLngUnit(samples: Array<{lat: number, lng: number}>): 'deg' | 'arcsec' | 'unknown' {
  if (!samples.length) return 'unknown';
  
  const hasLargeValues = samples.some(s => 
    Math.abs(s.lat) > 180 || Math.abs(s.lng) > 180
  );
  
  return hasLargeValues ? 'arcsec' : 'deg';
}

/**
 * 安全な距離計算（Haversine公式）
 */
export function haversineKm(
  aLat: number | null, 
  aLng: number | null, 
  bLat: number | null, 
  bLng: number | null
): number | null {
  if (!isValidLatLng(aLat, aLng) || !isValidLatLng(bLat, bLng)) {
    return null;
  }
  
  const toRad = (deg: number) => deg * Math.PI / 180;
  const R = 6371; // 地球の半径（km）
  
  try {
    const dLat = toRad(bLat! - aLat!);
    const dLng = toRad(bLng! - aLng!);
    
    const a = Math.sin(dLat / 2) ** 2 + 
              Math.cos(toRad(aLat!)) * Math.cos(toRad(bLat!)) * 
              Math.sin(dLng / 2) ** 2;
    
    const distance = 2 * R * Math.asin(Math.sqrt(a));
    
    // NaNチェック
    if (!Number.isFinite(distance)) return null;
    
    // 0.1km単位で丸める
    return Math.round(distance * 10) / 10;
  } catch (error) {
    console.warn('Distance calculation error:', error);
    return null;
  }
}
