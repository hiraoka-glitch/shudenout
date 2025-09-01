import { NextRequest, NextResponse } from 'next/server';
import { todayTomorrowJST } from '../../../lib/date';
import { safeFetch, isSafeMode, getAllBreakerStates, Result, Ok, Err, safeParseJson } from '../../../lib/guardrail';
import { normalizeLatLng, isValidLatLng, detectLatLngUnit } from '@/lib/geo';

// Force dynamic rendering and use Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ホテル型定義（統一）
interface HotelItem {
  id: string;
  name: string;
  price: number;
  rating?: number;
  imageUrl: string;
  affiliateUrl: string;
  area: string;
  nearest: string;
  amenities: ("WiFi" | "シャワー" | "2人可")[];
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  walkingTimeMinutes?: number;
  isSameDayAvailable: boolean;
}

// 統一レスポンススキーマ
interface ApiResponse {
  items: HotelItem[];
  paging: {
    total: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
  };
  isSample: boolean;
  fallback: boolean;
  message: string | null;
  success: boolean;
  error: string | null;
  debug?: Record<string, unknown>;
}

// エリア座標マッピング（標準化された緯度経度検索用）
const AREA_COORDINATES: Record<string, { lat: number; lng: number; name: string }> = {
  'shinjuku': { lat: 35.690921, lng: 139.700258, name: '新宿' },
  'shibuya': { lat: 35.6580, lng: 139.7016, name: '渋谷' },
  'ueno': { lat: 35.7141, lng: 139.7774, name: '上野' },
  'shinbashi': { lat: 35.6662, lng: 139.7580, name: '新橋' },
  'ikebukuro': { lat: 35.7295, lng: 139.7109, name: '池袋' },
  'roppongi': { lat: 35.6627, lng: 139.7314, name: '六本木' }
};

// デフォルト検索中心（新宿駅）
const DEFAULT_SEARCH_CENTER = { lat: 35.690921, lng: 139.700258, name: '新宿駅周辺' };

// サブセンター座標（フォールバック用）
const SUB_CENTERS = [
  { lat: 35.690921, lng: 139.720258, name: '東サブセンター' }, // 東に0.02度
  { lat: 35.690921, lng: 139.680258, name: '西サブセンター' }  // 西に0.02度
];

// 楽天API安全呼び出し（ガードレール + デバッグ対応）
async function callRakutenAPI(
  endpoint: string,
  params: Record<string, string>,
  apiType: 'SimpleHotelSearch' | 'VacantHotelSearch' = 'SimpleHotelSearch'
): Promise<Result<{ status: number; data: any; elapsedMs: number; class?: string; bodySnippet?: string }>> {
  const startTime = Date.now();
  const url = `https://app.rakuten.co.jp/services/api/Travel/${endpoint}?${new URLSearchParams(params)}`;
  
  // セーフモード時は即座にフォールバック
  if (isSafeMode()) {
    return Err('Safe mode active - external API calls disabled', 503);
  }

  const fetchResult = await safeFetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  }, {
    timeoutMs: 5000,
    retries: 1,
    baseDelay: 300,
    breakerName: 'rakuten',
    breakerConfig: { threshold: 3, cooldownMs: 60000 }
  });

  const elapsedMs = Date.now() - startTime;

  if (!fetchResult.ok) {
    // ブレーカーOPEN時はセーフモードメッセージ
    if (fetchResult.code === 503) {
      return Err('現在混雑しています。時間をおいて再試行してください。', 503);
    }
    return Err(fetchResult.error, fetchResult.code);
  }

  const response = fetchResult.data;

  // レスポンス処理（デバッグ強化版）
  try {
    const text = await response.text();
    const bodySnippet = text.slice(0, 800); // デバッグ用スニペット
    const parseResult = safeParseJson(text);
    
    // エラー分類
    let errorClass: string | undefined;
    if (response.status === 400) {
      errorClass = 'param_invalid';
    } else if (response.status === 404) {
      errorClass = 'no_results';
    } else if (response.status >= 500) {
      errorClass = 'server_error';
    } else if (response.status === 429) {
      errorClass = 'rate_limit';
    }
    
    if (!parseResult.ok) {
      return Err(`JSON parse error: ${parseResult.error}`, response.status);
    }

    return Ok({
      status: response.status,
      data: parseResult.data,
      elapsedMs,
      ...(errorClass && { class: errorClass }),
      bodySnippet
    });
  } catch (error) {
    return Err(`Response processing error: ${error instanceof Error ? error.message : String(error)}`, response.status);
  }
}

// SimpleHotelSearch API呼び出し（ガードレール対応）
async function callSimpleHotelSearch(params: {
  applicationId: string;
  latitude: string;
  longitude: string;
  searchRadius?: string;
  datumType?: string;
  hits?: string;
  page?: string;
  responseType?: string;
  keyword?: string;
}): Promise<Result<{ status: number; data: any; elapsedMs: number }>> {
  const searchParams = {
    applicationId: params.applicationId,
    latitude: params.latitude,
    longitude: params.longitude,
    searchRadius: params.searchRadius || '3.0',
    datumType: params.datumType || '1',
    hits: params.hits || '100',
    page: params.page || '1',
    responseType: params.responseType || 'small',
    ...(params.keyword && { keyword: params.keyword })
  };

  return await callRakutenAPI('SimpleHotelSearch/20170426', searchParams, 'SimpleHotelSearch');
}

// VacantHotelSearch API呼び出し（ガードレール対応）
async function callVacantHotelSearch(params: {
  applicationId: string;
  checkinDate: string;
  checkoutDate: string;
  adultNum: string;
  roomNum?: string;
  latitude?: string;
  longitude?: string;
  searchRadius?: string;
  datumType?: string;
  sort?: string;
  hits?: string;
  page?: string;
}): Promise<Result<{ status: number; data: any; elapsedMs: number }>> {
  const searchParams = {
    applicationId: params.applicationId,
    checkinDate: params.checkinDate,
    checkoutDate: params.checkoutDate,
    adultNum: params.adultNum,
    roomNum: params.roomNum || '1',
    ...(params.latitude && { latitude: params.latitude }),
    ...(params.longitude && { longitude: params.longitude }),
    searchRadius: params.searchRadius || '3.0',
    datumType: params.datumType || '1',
    sort: params.sort || '+roomCharge',
    hits: params.hits || '30',
    page: params.page || '1'
  };

  return await callRakutenAPI('VacantHotelSearch/20170426', searchParams, 'VacantHotelSearch');
}

// 楽天ホテルデータをHotelItemに変換
function transformRakutenToHotelItem(rakutenHotel: any, area: string): HotelItem {
  const hotelBasicInfo = rakutenHotel.hotel?.[0]?.hotelBasicInfo;
  if (!hotelBasicInfo) {
    throw new Error('Invalid hotel data structure');
  }

  // 設備推定
  const amenities: ("WiFi" | "シャワー" | "2人可")[] = [];
  const special = hotelBasicInfo.hotelSpecial || '';
  if (special.includes('WiFi') || special.includes('無線LAN')) amenities.push('WiFi');
  if (special.includes('シャワー') || special.includes('浴室')) amenities.push('シャワー');
  if (special.includes('2人') || special.includes('ダブル')) amenities.push('2人可');

  // アフィリエイトURL生成
  const affiliateId = process.env.RAKUTEN_AFFILIATE_ID;
  const hotelDetailUrl = `https://travel.rakuten.co.jp/HOTEL/${hotelBasicInfo.hotelNo}/${hotelBasicInfo.hotelNo}.html`;
  const affiliateUrl = affiliateId 
    ? `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encodeURIComponent(hotelDetailUrl)}`
    : hotelDetailUrl;

  // 緯度経度の正規化（秒→度変換＋バリデーション）
  const { lat, lng } = normalizeLatLng(hotelBasicInfo.latitude, hotelBasicInfo.longitude);
  
  return {
    id: hotelBasicInfo.hotelNo.toString(),
    name: hotelBasicInfo.hotelName || '名称未設定',
    price: parseInt(hotelBasicInfo.hotelMinCharge) || 0,
    rating: parseFloat(hotelBasicInfo.reviewAverage) || undefined,
    imageUrl: hotelBasicInfo.hotelImageUrl || '/placeholder-hotel.jpg',
    affiliateUrl,
    area,
    nearest: hotelBasicInfo.nearestStation || '最寄駅不明',
    amenities,
    // 不正値はnullにしてUI側で無視
    latitude: isValidLatLng(lat, lng) ? lat : null,
    longitude: isValidLatLng(lat, lng) ? lng : null,
    isSameDayAvailable: true
  };
}

// 統一レスポンス生成（完全防御版）
function createResponse(data: {
  items?: HotelItem[];
  success?: boolean;
  error?: string | null;
  message?: string | null;
  fallback?: boolean;
  debug?: Record<string, unknown>;
  classification?: string;
}): NextResponse {
  // 必須フィールドの完全初期化
  const safeItems = Array.isArray(data.items) ? data.items : [];
  const success = data.success !== undefined ? data.success : true;
  const fallback = data.fallback !== undefined ? data.fallback : false;
  
  // 日付の安全な生成
  let checkinDate = '2025-09-01';
  let checkoutDate = '2025-09-02';
  try {
    const dates = todayTomorrowJST();
    checkinDate = dates.today;
    checkoutDate = dates.tomorrow;
  } catch (dateError) {
    console.warn('⚠️ Date generation fallback used:', dateError);
  }
  
  // 分類の決定
  let classification = data.classification;
  if (!classification) {
    if (success && safeItems.length > 0) {
      classification = 'ok';
    } else if (success && safeItems.length === 0) {
      classification = 'no_results';
    } else if (data.error?.includes('param') || data.error?.includes('invalid')) {
      classification = 'param_invalid';
    } else if (data.error?.includes('rate') || data.error?.includes('limit')) {
      classification = 'rate_limit';
    } else if (!success) {
      classification = 'server_error';
    } else {
      classification = 'other';
    }
  }

  // 統一レスポンススキーマ（UIを壊さない保証）
  const response = {
    items: safeItems,
    paging: {
      total: safeItems.length,
      page: 1,
      totalPages: safeItems.length > 0 ? 1 : 0,
      hasNext: false
    },
    isSample: false,
    fallback,
    searchParams: {
      area: '新宿駅周辺',
      checkinDate,
      checkoutDate,
      adultNum: 2,
      isVacantSearch: true
    },
    message: data.message || null,
    success,
    error: data.error || null,
    classification,
    ...(data.debug ? { debug: data.debug } : {})
  };

  // 常に200 OKで返却（UI側でsuccessフィールドを見る）
  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json'
    }
  });
}

// メイン処理：候補取得
async function fetchCandidates(
  appId: string,
  searchCenter: { lat: number; lng: number; name: string },
  searchRadius: number = 3.0
): Promise<{
  hotelNos: string[];
  branch: string;
  upstreamLogs: Array<{ endpoint: string; paramsUsed: Record<string, string>; status: number; elapsedMs: number; count: number }>;
}> {
  const upstreamLogs: Array<{ endpoint: string; paramsUsed: Record<string, string>; status: number; elapsedMs: number; count: number }> = [];
  let hotelNos: string[] = [];
  let branch = 'first';

  // 1) 第1段：標準座標検索（ガードレール対応）
  const firstResult = await callSimpleHotelSearch({
    applicationId: appId,
    latitude: searchCenter.lat.toString(),
    longitude: searchCenter.lng.toString(),
    searchRadius: searchRadius.toString(),
    datumType: '1',
    hits: '100',
    page: '1',
    responseType: 'small'
  });

  const firstLog = {
    endpoint: 'SimpleHotelSearch/20170426',
    paramsUsed: {
      latitude: searchCenter.lat.toString(),
      longitude: searchCenter.lng.toString(),
      searchRadius: '3.0',
      hits: '100'
    },
    status: firstResult.ok ? firstResult.data.status : (!firstResult.ok && firstResult.code ? firstResult.code : 0),
    elapsedMs: firstResult.ok ? firstResult.data.elapsedMs : 0,
    count: 0
  };

  if (firstResult.ok && firstResult.data.status === 200 && firstResult.data.data) {
    const data = firstResult.data.data;
    if (data.hotels && Array.isArray(data.hotels)) {
      hotelNos = data.hotels.map((hotel: any) => hotel.hotel?.[0]?.hotelBasicInfo?.hotelNo?.toString()).filter(Boolean);
      firstLog.count = hotelNos.length;
    }
  }

  upstreamLogs.push(firstLog);

  // 2) フォールバック (a)：キーワード検索（ガードレール対応）
  if (hotelNos.length === 0) {
    branch = 'simpleKeyword';
    const keywordResult = await callSimpleHotelSearch({
      applicationId: appId,
      latitude: searchCenter.lat.toString(),
      longitude: searchCenter.lng.toString(),
      searchRadius: '3.0',
      keyword: searchCenter.name,
      hits: '100'
    });

    const keywordLog = {
      endpoint: 'SimpleHotelSearch/20170426',
      paramsUsed: {
        latitude: searchCenter.lat.toString(),
        longitude: searchCenter.lng.toString(),
        keyword: searchCenter.name,
        hits: '100'
      },
      status: keywordResult.ok ? keywordResult.data.status : (!keywordResult.ok && keywordResult.code ? keywordResult.code : 0),
      elapsedMs: keywordResult.ok ? keywordResult.data.elapsedMs : 0,
      count: 0
    };

    if (keywordResult.ok && keywordResult.data.status === 200 && keywordResult.data.data) {
      const data = keywordResult.data.data;
      if (data.hotels && Array.isArray(data.hotels)) {
        hotelNos = data.hotels.map((hotel: any) => hotel.hotel?.[0]?.hotelBasicInfo?.hotelNo?.toString()).filter(Boolean);
        keywordLog.count = hotelNos.length;
      }
    }

    upstreamLogs.push(keywordLog);
  }

  // 3) フォールバック (b)：サブセンター探索（ガードレール対応）
  if (hotelNos.length === 0) {
    branch = 'subCenters';
    for (const subCenter of SUB_CENTERS) {
      const subResult = await callSimpleHotelSearch({
        applicationId: appId,
        latitude: subCenter.lat.toString(),
        longitude: subCenter.lng.toString(),
        searchRadius: '3.0',
        hits: '100'
      });

      const subLog = {
        endpoint: 'SimpleHotelSearch/20170426',
        paramsUsed: {
          latitude: subCenter.lat.toString(),
          longitude: subCenter.lng.toString(),
          searchRadius: '3.0'
        },
        status: subResult.ok ? subResult.data.status : (!subResult.ok && subResult.code ? subResult.code : 0),
        elapsedMs: subResult.ok ? subResult.data.elapsedMs : 0,
        count: 0
      };

      if (subResult.ok && subResult.data.status === 200 && subResult.data.data) {
        const data = subResult.data.data;
        if (data.hotels && Array.isArray(data.hotels)) {
          const subHotelNos = data.hotels.map((hotel: any) => hotel.hotel?.[0]?.hotelBasicInfo?.hotelNo?.toString()).filter(Boolean);
          const uniqueSet = new Set([...hotelNos, ...subHotelNos]);
          hotelNos = Array.from(uniqueSet); // 重複除去
          subLog.count = subHotelNos.length;
        }
      }

      upstreamLogs.push(subLog);

      if (hotelNos.length > 0) break; // 最初のサブセンターで見つかったら停止
    }
  }

  return { hotelNos, branch, upstreamLogs };
}

// メイン処理：空室判定
async function checkVacancy(
  appId: string,
  hotelNos: string[],
  checkinDate: string,
  checkoutDate: string,
  adultNum: string,
  searchCenter: { lat: number; lng: number },
  areaName: string,
  searchRadius: number = 3.0
): Promise<{
  hotels: HotelItem[];
  upstreamLogs: Array<{ endpoint: string; paramsUsed: Record<string, string>; status: number; elapsedMs: number; count: number }>;
}> {
  const upstreamLogs: Array<{ endpoint: string; paramsUsed: Record<string, string>; status: number; elapsedMs: number; count: number }> = [];
  
  if (hotelNos.length === 0) {
    return { hotels: [], upstreamLogs };
  }

  const result = await callVacantHotelSearch({
    applicationId: appId,
    checkinDate,
    checkoutDate,
    adultNum,
    roomNum: '1',
    latitude: searchCenter.lat.toString(),
    longitude: searchCenter.lng.toString(),
    searchRadius: '3.0',
    datumType: '1',
    sort: '+roomCharge',
    hits: '30',
    page: '1'
  });

  const vacancyLog = {
    endpoint: 'VacantHotelSearch/20170426',
    paramsUsed: {
      checkinDate,
      checkoutDate,
      adultNum,
      latitude: searchCenter.lat.toString(),
      longitude: searchCenter.lng.toString(),
      searchRadius: '3.0'
    },
    status: result.ok ? result.data.status : (!result.ok && result.code ? result.code : 0),
    elapsedMs: result.ok ? result.data.elapsedMs : 0,
    count: 0
  };

  if (result.ok && result.data.status === 200 && result.data.data) {
    const data = result.data.data;
    if (data.hotels && Array.isArray(data.hotels)) {
      const hotels = data.hotels
        .map((hotel: any) => {
          try {
            return transformRakutenToHotelItem(hotel, areaName);
          } catch (error) {
            return null;
          }
        })
        .filter(Boolean) as HotelItem[];
      
      vacancyLog.count = hotels.length;
      upstreamLogs.push(vacancyLog);
      return { hotels, upstreamLogs };
    }
  }

  // 404は正常ケース（空室なし）
  if (result.ok && result.data.status === 404) {
    vacancyLog.count = 0;
    upstreamLogs.push(vacancyLog);
    return { hotels: [], upstreamLogs };
  }

  // その他のエラーまたは失敗
  upstreamLogs.push(vacancyLog);
  return { hotels: [], upstreamLogs };
}



export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // 完全防御版：絶対に例外をthrowしない
  try {
    // パラメータ解析（安全版）
    let searchParams: URLSearchParams;
    let areaParam = 'shinjuku';
    let adultNumParam = '2';
    let isInspectMode = false;
    
    let radiusParam = 3.0;
    let latParam: string | null = null;
    let lngParam: string | null = null;
    
    try {
      searchParams = request.nextUrl.searchParams;
      areaParam = searchParams.get('area') || 'shinjuku';
      adultNumParam = searchParams.get('adultNum') || '2';
      radiusParam = Number(searchParams.get('radius')) || 3.0; // 半径パラメータ追加
      latParam = searchParams.get('lat');
      lngParam = searchParams.get('lng');
      isInspectMode = searchParams.get('inspect') === '1';
    } catch (paramError) {
      console.warn('⚠️ Parameter parsing error, using defaults:', paramError);
    }

    // Rakuten API設定
    const rakutenAppId = process.env.RAKUTEN_APP_ID;
    if (!rakutenAppId) {
      return createResponse({
        success: false,
        error: 'Missing RAKUTEN_APP_ID',
        message: 'APIキーが設定されていません。管理者にお問い合わせください。',
        fallback: true,
        debug: isInspectMode ? { breakerState: getAllBreakerStates() } : undefined
      });
    }

    // セーフモード判定
    if (isSafeMode()) {
      return createResponse({
        success: false,
        error: 'Safe mode active',
        message: '現在メンテナンス中です。しばらく時間をおいて再試行してください。',
        fallback: true,
        debug: isInspectMode ? { 
          safeMode: true,
          breakerState: getAllBreakerStates() 
        } : undefined
      });
    }

    // 検索中心の決定
    const searchCenter = AREA_COORDINATES[areaParam] || DEFAULT_SEARCH_CENTER;
    const areaName = searchCenter.name;

    // JST日付生成（都度生成で0時跨ぎ対応）
    const { today, tomorrow } = todayTomorrowJST();

    // 候補取得フェーズ（半径パラメータ使用）
    const candidatesResult = await fetchCandidates(rakutenAppId, searchCenter, radiusParam);
    
    // 空室判定フェーズ（候補が0でもAPIは呼ばない）
    let vacancyResult = { hotels: [] as HotelItem[], upstreamLogs: [] as any[] };
    if (candidatesResult.hotelNos.length > 0) {
      vacancyResult = await checkVacancy(
        rakutenAppId,
        candidatesResult.hotelNos,
        today,
        tomorrow,
        adultNumParam,
        searchCenter,
        areaName,
        radiusParam
      );
    }

    // 統合結果
    const allUpstreamLogs = [...candidatesResult.upstreamLogs, ...vacancyResult.upstreamLogs];
    const totalElapsedMs = Date.now() - startTime;

    // 結果メッセージの決定
    let message: string | null = null;
    let success = true;

    if (candidatesResult.hotelNos.length === 0) {
      message = '本日の空室は見つかりませんでした。エリアを変えてお試しください。';
    } else if (vacancyResult.hotels.length === 0) {
      message = '本日の空室は見つかりませんでした。エリアを変えてお試しください。';
    }

    // 5xx/429エラーの確認
    const hasServerError = allUpstreamLogs.some(log => log.status >= 500 || log.status === 429);
    if (hasServerError && vacancyResult.hotels.length === 0) {
      success = false;
      message = 'アクセス集中のため、一時的に検索できません。しばらく後にお試しください。';
    }

    // ページング設定
    const paging = {
      total: vacancyResult.hotels.length,
      page: 1,
      totalPages: vacancyResult.hotels.length > 0 ? 1 : 0,
      hasNext: false
    };

    // デバッグ情報（inspect=1時の詳細情報）
    let debug: Record<string, unknown> | undefined;
    if (isInspectMode) {
      // 最終送信パラメータ
      const finalSearchParams = {
        area: areaParam,
        adultNum: adultNumParam,
        searchCenter: {
          lat: searchCenter.lat,
          lng: searchCenter.lng,
          name: searchCenter.name
        },
        dates: {
          checkin: candidatesResult.hotelNos.length > 0 ? 'calculated' : 'fallback',
          checkout: candidatesResult.hotelNos.length > 0 ? 'calculated' : 'fallback'
        },
        searchRadius: `${radiusParam}km`
      };
      
      // upstream詳細情報（エラー分類含む）
      const upstreamDetailed = allUpstreamLogs.map(log => ({
        ...log,
        url: log.endpoint.includes('SimpleHotel') 
          ? `https://app.rakuten.co.jp/services/api/Travel/${log.endpoint}`
          : `https://app.rakuten.co.jp/services/api/Travel/${log.endpoint}`,
        classification: log.status === 200 ? 'success' 
          : log.status === 400 ? 'param_invalid'
          : log.status === 404 ? 'no_results'
          : log.status >= 500 ? 'server_error'
          : log.status === 429 ? 'rate_limit'
          : 'unknown'
      }));
      
      // データ形状解析
      const coordSamples = vacancyResult.hotels
        .filter(h => h.latitude != null && h.longitude != null)
        .slice(0, 5)
        .map(h => ({
          id: h.id,
          lat: h.latitude!,
          lng: h.longitude!
        }));
      
      const coordUnit = detectLatLngUnit(coordSamples);
      const hasInvalidCoords = vacancyResult.hotels.some(h => 
        h.latitude != null && h.longitude != null && !isValidLatLng(h.latitude, h.longitude)
      );
      
      debug = {
        totalElapsedMs,
        finalSearchParams,
        pipeline: {
          branch: candidatesResult.branch,
          candidateCount: candidatesResult.hotelNos.length,
          vacancyCount: vacancyResult.hotels.length
        },
        upstream: upstreamDetailed,
        shape: {
          latlng_unit: coordUnit,
          samples: coordSamples.slice(0, 3),
          flags: [
            ...(hasInvalidCoords ? ['data_shape:latlng_invalid'] : []),
            ...(coordUnit === 'arcsec' ? ['data_shape:latlng_arcsec'] : [])
          ]
        },
        env: {
          hasAppId: !!process.env.RAKUTEN_APP_ID,
          safeMode: isSafeMode(),
          runtime: 'nodejs'
        }
      };
    }

    return createResponse({
      items: vacancyResult.hotels,
      fallback: false,
      message,
      success,
      error: success ? null : message,
      debug
    });

  } catch (error) {
    // 最終セーフティネット：絶対に失敗しない
    const errorElapsedMs = Date.now() - startTime;
    console.error('💥 Critical API error (final catch):', error);
    
    let isInspectMode = false;
    try {
      isInspectMode = request?.nextUrl?.searchParams?.get('inspect') === '1';
    } catch (inspectError) {
      // さらに安全なフォールバック
    }
    
    return createResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Critical system error',
      message: 'システムエラーが発生しました。しばらく時間をおいて再試行してください。',
      fallback: true,
      debug: isInspectMode ? {
        criticalError: true,
        errorType: error instanceof Error ? error.name : 'Unknown',
        elapsedMs: errorElapsedMs
      } : undefined
    });
  }
}
