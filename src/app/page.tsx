'use client';
import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AREAS, coerceArea, DEFAULT_AREA, getAreaCoords, type AreaKey } from '@/lib/areas';
import { normalizeHotels, debugNormalization, type HotelItem, type NormalizedHotels } from '@/lib/normalizeHotels';
import { AreaSelect, AreaInfo } from '@/app/components/AreaSelect';
import HotelCard from '@/app/components/HotelCard';
import { Safe } from '@/app/components/Safe';
import ErrorState from '@/app/components/ErrorState';
import EmptyState from '@/app/components/EmptyState';
import DebugPanel from '@/app/components/DebugPanel';

type UiState =
  | 'loading'
  | 'ok_with_results'
  | 'ok_no_results'
  | 'param_invalid'
  | 'rate_limit'
  | 'server_error'
  | 'fetch_error';

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plain = searchParams.get('plain') === '1';
  
  // ① エリア状態管理（URL ⇄ UI ⇄ フェッチ連動）
  const urlArea = coerceArea(searchParams.get('area'));
  const [currentArea, setCurrentArea] = useState<AreaKey>(urlArea);
  
  // ② 座標取得（currentAreaから動的算出）
  const coords = useMemo(() => getAreaCoords(currentArea), [currentArea]);
  
  const [state, setState] = useState<UiState>('loading');
  const [items, setItems] = useState<HotelItem[]>([]);
  const [payload, setPayload] = useState<any>(null);
  const [debugMode, setDebugMode] = useState<boolean>(false);

  // ③ エリア変更ハンドラー：UI選択→URL更新
  const handleAreaChange = (newArea: AreaKey) => {
    setCurrentArea(newArea);
    const qp = new URLSearchParams(searchParams.toString());
    qp.set('area', newArea);
    router.replace('/?' + qp.toString(), { scroll: false });
  };

  // ④ URL同期：直リンク・戻るボタン対応
  useEffect(() => {
    const coerced = coerceArea(searchParams.get('area'));
    if (coerced !== currentArea) {
      setCurrentArea(coerced);
    }
  }, [searchParams, currentArea]);

  // ⑤ デバッグモード検出
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugMode(params.has('debug'));
  }, []);

  // ⑥ API呼び出し（エリア座標連動）
  async function fetchHotels(radiusKm: number): Promise<{ raw: any; normalized: NormalizedHotels }> {
    try {
      const url = `/api/hotels?radius=${radiusKm}&area=${currentArea}&lat=${coords.lat}&lng=${coords.lng}${debugMode ? '&inspect=1' : ''}&ts=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      const raw = await res.json().catch(() => ({}));
      
      if (debugMode) {
        debugNormalization(raw);
      }
      
      const normalized = normalizeHotels(raw);
      return { raw, normalized };
    } catch (error) {
      console.error('[fetch-error]', error);
      const fallback = { items: [], statusClass: 'fetch_error', ok: false };
      return { raw: null, normalized: fallback };
    }
  }

  // ⑦ エリア変更時の自動再フェッチ（重要：currentArea, coords.lat, coords.lngに依存）
  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        setState('loading');
        
        const classify = (normalized: NormalizedHotels): UiState => {
          if (!normalized) return 'fetch_error';
          if (normalized.ok && normalized.items.length > 0) return 'ok_with_results';
          if (normalized.ok && normalized.items.length === 0) return 'ok_no_results';
          if (normalized.statusClass === 'param_invalid') return 'param_invalid';
          if (normalized.statusClass === 'rate_limit') return 'rate_limit';
          if (normalized.statusClass === 'server_error') return 'server_error';
          return 'fetch_error';
        };

        // 段階的半径拡大（1km → 2km → 3km）
        const radiusSteps = [1.0, 2.0, 3.0];
        let finalResult: { raw: any; normalized: NormalizedHotels } | null = null;

        for (const radius of radiusSteps) {
          if (aborted) return;
          
          const result = await fetchHotels(radius);
          if (result.normalized.items.length > 0) {
            finalResult = result;
            break;
          }
          finalResult = result; // 最後の結果を保持（エラー情報含む）
        }

        if (!aborted && finalResult) {
          setItems(finalResult.normalized.items);
          setPayload(finalResult.raw);
          setState(classify(finalResult.normalized));
        }
      } catch (e) {
        console.error('[fetch-error]', e);
        if (!aborted) {
          setState('fetch_error');
          setPayload({ error: (e as Error).message });
        }
      }
    })();

    return () => { aborted = true; };
  }, [currentArea, coords.lat, coords.lng, debugMode]);

  const handleRetry = () => {
    setState('loading');
    setPayload(null);
    // useEffectの依存配列をトリガーするため、debugModeを再設定
    setDebugMode(prev => prev);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">終電後にすぐ泊まれる宿</h1>
          <p className="text-gray-600 mt-1">本日空室ありのホテルのみ表示中</p>
          
          {/* デモ用: SearchModeセレクタ（旧値テスト用） */}
          {debugMode && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm text-yellow-800 mb-2">
                デバッグ: SearchMode = "{mode}" (URL param = "{rawMode}")
              </div>
              <SafeSelect
                value={mode}
                onChange={(newMode) => {
                  const qp = new URLSearchParams(searchParams.toString());
                  qp.set('mode', newMode);
                  router.replace('/?' + qp.toString());
                }}
                options={SEARCH_MODE_OPTIONS}
                className="text-sm max-w-xs"
              />
              <div className="text-xs text-gray-600 mt-1">
                試してみる: ?mode=current (旧値) → areaに自動変換されます
              </div>
            </div>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* エリア選択UI（常時表示） */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <AreaSelect 
            value={currentArea} 
            onChange={handleAreaChange}
            disabled={state === 'loading'}
            className="flex-shrink-0"
          />
          <AreaInfo areaKey={currentArea} />
          {debugMode && (
            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Debug: {currentArea} ({coords.lat}, {coords.lng})
            </div>
          )}
        </div>
        {state === 'loading' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">検索中…</p>
          </div>
        )}

        {state === 'ok_with_results' && (
          <>
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                {items.length}件の空室ありホテルが見つかりました
                {plain && <span className="ml-2 text-xs text-gray-500">（プレーンビュー）</span>}
              </p>
            </div>
            
            {plain ? (
              // プレーンビュー: 名前+価格+リンクのみ（正規化されたitems使用）
              <ul className="space-y-2">
                {items.filter(Boolean).map((hotel: HotelItem, index: number) => (
                  <li key={hotel.id || index} className="flex gap-2 items-center border-b pb-2">
                    <span className="font-medium flex-1">{hotel.name || hotel.hotelName || '名称不明'}</span>
                    <span className="text-sm text-gray-600">
                      {Number.isFinite(hotel.price) ? `¥${hotel.price!.toLocaleString()}` : 
                       Number.isFinite(hotel.hotelMinCharge) ? `¥${hotel.hotelMinCharge!.toLocaleString()}` : '—'}
                    </span>
                    {hotel.affiliateUrl && typeof hotel.affiliateUrl === 'string' && (
                      <a 
                        className="text-blue-600 underline text-sm px-2" 
                        href={hotel.affiliateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        予約
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              // 通常ビュー: HotelCard使用（正規化されたitems使用）
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.filter(Boolean).map((hotel: HotelItem, index: number) => (
                  <Safe 
                    key={hotel.id || index} 
                    fallback={
                      <div className="p-3 rounded border border-red-200 bg-red-50 text-xs text-red-600">
                        このカードの描画に失敗しました（id:{hotel.id || index}）
                      </div>
                    }
                  >
                    <HotelCard hotel={hotel} />
                  </Safe>
                )) : []}
              </div>
            )}
          </>
        )}

        {state === 'ok_no_results' && (
          <EmptyState
            message="近隣では当日の空室が見つかりませんでした。"
            searchRadius={10}
            autoRetryAttempted={true}
            onRetry={handleRetry}
          />
        )}

        {(state === 'param_invalid' || state === 'rate_limit' || state === 'server_error' || state === 'fetch_error') && (
          <ErrorState
            uiState={state}
            message={payload?.error || 'Unknown error'}
            onRetry={handleRetry}
          />
        )}
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 終電後にすぐ泊まれる宿. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* デバッグパネル */}
      {debugMode && payload?.debug && (
        <DebugPanel
          data={payload}
          searchParams={{ 
            currentArea: currentArea,
            area: currentArea, 
            lat: coords.lat, 
            lng: coords.lng, 
            radius: 3 
          }}
          isVisible={true}
        />
      )}
    </div>
  );
}