/**
 * 楽天アフィリエイトURL生成ユーティリティ
 * 二重エンコード防止とPC/SP分岐を一元化
 */

export interface AffiliateUrlOptions {
  hotelId: string | number;
  affiliateId: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  isMobile?: boolean;
}

/**
 * 楽天トラベルのホテル詳細URLを生成
 */
function buildHotelDetailUrl(hotelId: string | number, params?: Record<string, string>): string {
  const baseUrl = `https://travel.rakuten.co.jp/HOTEL/${hotelId}/${hotelId}.html`;
  
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  
  const queryString = new URLSearchParams(params).toString();
  return `${baseUrl}?${queryString}`;
}

/**
 * 楽天アフィリエイトURLを生成
 * @param options - アフィリエイトURL生成オプション
 * @returns 完全なアフィリエイトURL
 */
export function buildRakutenAffiliateUrl(options: AffiliateUrlOptions): string {
  const {
    hotelId,
    affiliateId,
    utm_source = 'shudenout',
    utm_medium = 'web',
    utm_campaign = 'hotel_search',
    utm_content,
    isMobile = false
  } = options;

  // UTMパラメータを構築
  const utmParams: Record<string, string> = {
    utm_source,
    utm_medium,
    utm_campaign
  };
  
  if (utm_content) {
    utmParams.utm_content = utm_content;
  }

  // ターゲットURL生成（楽天トラベルのホテル詳細ページ）
  const targetUrl = buildHotelDetailUrl(hotelId, utmParams);

  // アフィリエイトURL構築
  // 注意: affiliateId の後にスラッシュを付ける
  const affiliateBaseUrl = `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/`;
  
  const affiliateParams = new URLSearchParams({
    pc: targetUrl, // PCサイト用
    ...(isMobile && { m: targetUrl }) // モバイル用（必要に応じて）
  });

  return `${affiliateBaseUrl}?${affiliateParams.toString()}`;
}

/**
 * URLが既にエンコードされているかチェック
 */
function isAlreadyEncoded(url: string): boolean {
  try {
    return url !== decodeURIComponent(url);
  } catch {
    return false;
  }
}

/**
 * 安全なURLエンコード（二重エンコード防止）
 */
export function safeEncodeURIComponent(str: string): string {
  if (isAlreadyEncoded(str)) {
    return str;
  }
  return encodeURIComponent(str);
}

/**
 * ホテルIDの正規化（文字列・数値両対応）
 */
export function normalizeHotelId(hotelId: string | number): string {
  return String(hotelId).replace(/[^\d]/g, '');
}
