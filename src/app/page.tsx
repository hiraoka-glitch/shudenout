'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { coerceSearchMode, type SearchMode, SEARCH_MODE_OPTIONS } from '@/lib/searchMode';
import { SafeSelect } from '@/app/components/SafeSelect';
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

const DEFAULT_MODE: SearchMode = 'area';

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plain = searchParams.get('plain') === '1';
  
  // ① 安全なSearchMode取得（旧値も受け入れる）
  const rawMode = searchParams.get('mode');
  const mode = coerceSearchMode(rawMode, DEFAULT_MODE);
  
  const [state, setState] = useState<UiState>('loading');
  const [payload, setPayload] = useState<any>(null);
  const [debugMode, setDebugMode] = useState<boolean>(false);

  // ② 無効なmodeのURL静かに修正（履歴汚さない）
  useEffect(() => {
    if (rawMode !== mode) {
      const qp = new URLSearchParams(searchParams.toString());
      qp.set('mode', mode);
      router.replace('/?' + qp.toString(), { scroll: false });
    }
  }, [rawMode, mode, searchParams, router]);

  // ③ localStorage旧値マイグレーション
  useEffect(() => {
    try {
      const key = 'searchMode';
      const stored = localStorage.getItem(key);
      const migrated = coerceSearchMode(stored, DEFAULT_MODE);
      if (stored !== migrated) {
        console.log(`LocalStorage migration: "${stored}" → "${migrated}"`);
        localStorage.setItem(key, migrated);
      }
    } catch (error) {
      console.warn('LocalStorage migration failed:', error);
    }
  }, []);

  // URLからデバッグモード検出
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugMode(params.has('debug'));
  }, []);

  async function query(radius: number) {
    try {
      const url = `/api/hotels?radius=${radius}&area=shinjuku&lat=35.690921&lng=139.700258${debugMode ? '&inspect=1' : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      return json;
    } catch (error) {
      console.error('[query-error]', error);
      return null;
    }
  }

  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        setState('loading');
        
        const r3 = await query(3);
        if (aborted) return;

        const classify = (j: any): UiState => {
          if (!j) return 'fetch_error';
          if (j.success && j.items?.length > 0) return 'ok_with_results';
          if (j.success && (!j.items || j.items.length === 0)) return 'ok_no_results';
          if (j.error?.includes('param') || j.error?.includes('invalid')) return 'param_invalid';
          if (j.error?.includes('rate') || j.error?.includes('limit')) return 'rate_limit';
          if (j.error?.includes('server') || j.error?.includes('500')) return 'server_error';
          return 'fetch_error';
        };

        let s = classify(r3);
        let p = r3;

        // 自動半径拡大（3 → 5 → 10）
        if (s === 'ok_no_results') {
          setState('loading'); // 拡大中の表示更新
          const r5 = await query(5);
          if (!aborted) {
            const s5 = classify(r5);
            if (s5 === 'ok_with_results') {
              s = s5; p = r5;
            } else if (s5 === 'ok_no_results') {
              setState('loading'); // さらに拡大中
              const r10 = await query(10);
              if (!aborted) {
                const s10 = classify(r10);
                if (s10 === 'ok_with_results') { s = s10; p = r10; }
              }
            } else { s = s5; p = r5; }
          }
        }

        if (!aborted) {
          setPayload(p);
          setState(s);
        }
      } catch (e) {
        console.error('[client-fetch-error]', e);
        if (!aborted) {
          setState('fetch_error');
          setPayload({ error: (e as Error).message });
        }
      }
    })();

    return () => { aborted = true; };
  }, [debugMode]);

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
                {payload?.items?.length || 0}件の空室ありホテルが見つかりました
                {plain && <span className="ml-2 text-xs text-gray-500">（プレーンビュー）</span>}
              </p>
            </div>
            
            {plain ? (
              // プレーンビュー: 名前+価格+リンクのみ（安全な配列アクセス）
              <ul className="space-y-2">
                {Array.isArray(payload?.items) ? payload.items.map((hotel: any, index: number) => (
                  <li key={hotel.hotelNo || index} className="flex gap-2 items-center border-b pb-2">
                    <span className="font-medium flex-1">{hotel.hotelName || '名称不明'}</span>
                    <span className="text-sm text-gray-600">
                      {Number.isFinite(hotel.hotelMinCharge) ? `¥${hotel.hotelMinCharge.toLocaleString()}` : '—'}
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
                )) : []}
              </ul>
            ) : (
              // 通常ビュー: HotelCard使用（安全な配列アクセス）
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.isArray(payload?.items) ? payload.items.map((hotel: any, index: number) => (
                  <Safe 
                    key={hotel.hotelNo || index} 
                    fallback={
                      <div className="p-3 rounded border border-red-200 bg-red-50 text-xs text-red-600">
                        このカードの描画に失敗しました（id:{hotel.hotelNo || index}）
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
          searchParams={{ area: 'shinjuku', lat: 35.690921, lng: 139.700258, radius: 3 }}
          isVisible={true}
        />
      )}
    </div>
  );
}