/**
 * ホテルAPIレスポンス正規化
 * items vs data.hotels スキーマ差異を吸収
 */

export type HotelItem = {
  id: string;
  name: string;
  price?: number | null;
  imageUrl?: string;
  rating?: number | null;
  reviewCount?: number | null;
  affiliateUrl?: string;
  location?: { 
    latitude: number | null; 
    longitude: number | null; 
    address?: string;
  };
  // 追加フィールド
  hotelName?: string;
  hotelNo?: string;
  roomImageUrl?: string;
  hotelMinCharge?: number;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
};

export type NormalizedHotels = {
  items: HotelItem[];
  statusClass: string;  // 'ok' | 'no_results' | 'param_invalid' | 'rate_limit' | 'server_error'
  ok: boolean;
  totalCount?: number;
  debug?: any;
};

export function normalizeHotels(json: any): NormalizedHotels {
  // 複数のAPIレスポンス形式に対応
  const items =
    Array.isArray(json?.items) ? json.items :
    Array.isArray(json?.data?.hotels) ? json.data.hotels :
    Array.isArray(json?.hotels) ? json.hotels :
    Array.isArray(json?.payload?.items) ? json.payload.items :
    [];

  // ステータス判定
  const statusClass =
    json?.class ??
    json?.statusClass ??
    (json?.ok && items.length > 0 ? 'ok' :
     json?.ok ? 'no_results' : 
     json?.error ? 'server_error' :
     'other');

  // OK判定
  const ok = Boolean(
    json?.ok ?? 
    json?.success ?? 
    (items.length > 0) ??
    false
  );

  // アイテム正規化（フィールド名の差異を吸収）
  const normalizedItems = items.filter(Boolean).map((item: any, index: number) => {
    const normalized: HotelItem = {
      id: String(item.id ?? item.hotelNo ?? item.hotelId ?? index),
      name: item.name ?? item.hotelName ?? item.title ?? '名称不明',
      price: Number.isFinite(item.price) ? item.price : 
             Number.isFinite(item.hotelMinCharge) ? item.hotelMinCharge :
             Number.isFinite(item.minPrice) ? item.minPrice : null,
      imageUrl: item.imageUrl ?? item.roomImageUrl ?? item.image ?? item.photoUrl,
      rating: Number.isFinite(item.rating) ? item.rating : 
              Number.isFinite(item.hotelRating) ? item.hotelRating : null,
      reviewCount: Number.isFinite(item.reviewCount) ? item.reviewCount : null,
      affiliateUrl: item.affiliateUrl ?? item.bookingUrl ?? item.url,
      
      // 位置情報の正規化
      location: {
        latitude: Number.isFinite(item.latitude) ? item.latitude :
                 Number.isFinite(item.location?.latitude) ? item.location.latitude : null,
        longitude: Number.isFinite(item.longitude) ? item.longitude :
                  Number.isFinite(item.location?.longitude) ? item.location.longitude : null,
        address: item.address ?? item.location?.address ?? item.hotelAddress,
      },
      
      // 元フィールドも保持（後方互換性）
      hotelName: item.hotelName,
      hotelNo: item.hotelNo,
      roomImageUrl: item.roomImageUrl,
      hotelMinCharge: item.hotelMinCharge,
      latitude: Number.isFinite(item.latitude) ? item.latitude : null,
      longitude: Number.isFinite(item.longitude) ? item.longitude : null,
      address: item.address,
    };

    return normalized;
  });

  return { 
    items: normalizedItems, 
    statusClass, 
    ok,
    totalCount: json?.totalCount ?? json?.count ?? normalizedItems.length,
    debug: json?.debug
  };
}

/**
 * デバッグ用：正規化前後を比較表示
 */
export function debugNormalization(json: any): void {
  if (process.env.NODE_ENV !== 'production') {
    const normalized = normalizeHotels(json);
    console.group('[normalizeHotels] Debug');
    console.log('Raw JSON:', json);
    console.log('Normalized:', normalized);
    console.log('Items extracted from:', 
      Array.isArray(json?.items) ? 'json.items' :
      Array.isArray(json?.data?.hotels) ? 'json.data.hotels' :
      Array.isArray(json?.hotels) ? 'json.hotels' :
      Array.isArray(json?.payload?.items) ? 'json.payload.items' :
      'unknown/empty'
    );
    console.groupEnd();
  }
}
