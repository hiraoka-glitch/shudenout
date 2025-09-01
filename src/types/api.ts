// API応答とUI状態の型定義

export type ApiStatus = 'ok' | 'no_results' | 'param_invalid' | 'rate_limit' | 'server_error' | 'other';

export interface HotelItem {
  hotelNo: number;
  hotelName: string;
  hotelKanaName?: string;
  latitude: number | null;
  longitude: number | null;
  address1: string;
  address2: string;
  postalCode?: string;
  telephoneNo?: string;
  hotelMinCharge: number;
  hotelSpecial?: string;
  hotelInformationUrl?: string;
  planListUrl?: string;
  reviewUrl?: string;
  affiliateUrl?: string;
  roomName?: string;
  planName?: string;
  pointRate?: number;
  withDinnerFlag?: number;
  withBreakfastFlag?: number;
  roomImageUrl?: string;
  // 追加フィールド
  distance?: number;
  hasVacancy?: boolean;
}

export interface HotelsApiResponse {
  items: HotelItem[];
  paging: {
    total: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
  };
  isSample: boolean;
  fallback: boolean;
  searchParams: {
    area: string;
    checkinDate: string;
    checkoutDate: string;
    adultNum: number;
    isVacantSearch: boolean;
    radius?: number; // 新追加
  };
  message: string | null;
  success: boolean;
  error: string | null;
  debug?: {
    totalElapsedMs: number;
    finalSearchParams: Record<string, unknown>;
    pipeline: {
      branch: string;
      candidateCount: number;
      vacancyCount: number;
    };
    upstream: Array<{
      endpoint: string;
      status: number;
      classification: string;
      elapsedMs: number;
      url: string;
    }>;
    shape?: {
      latlng_unit: 'deg' | 'arcsec' | 'unknown';
      samples: Array<{id: string, lat: number, lng: number}>;
      flags: string[];
    };
    env: {
      hasAppId: boolean;
      safeMode: boolean;
      runtime: string;
    };
  };
}

// UI状態管理用の型
export type UiState = 
  | 'loading'
  | 'ok_with_results'
  | 'ok_no_results'
  | 'param_invalid'
  | 'rate_limit'
  | 'server_error'
  | 'fetch_error';

export interface SearchState {
  uiState: UiState;
  hotels: HotelItem[];
  searchParams: HotelsApiResponse['searchParams'] | null;
  message: string | null;
  debug?: HotelsApiResponse['debug'];
  retryCount: number;
  currentRadius: number;
  lastError?: string;
}

// 検索パラメータ
export interface SearchParams {
  area?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  adultNum?: number;
}
