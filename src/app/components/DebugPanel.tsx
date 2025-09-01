"use client";

import React, { useState } from 'react';
import { HotelsApiResponse } from '../../types/api';

interface DebugPanelProps {
  data: HotelsApiResponse | null;
  searchParams: {
    lat?: number;
    lng?: number;
    radius?: number;
    area?: string;
    currentArea?: string;
  };
  isVisible: boolean;
}

export default function DebugPanel({ data, searchParams, isVisible }: DebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible || !data?.debug) {
    return null;
  }

  const { debug } = data;
  const { env, finalSearchParams, pipeline, upstream } = debug;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* トグルボタン */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-mono hover:bg-gray-700 transition-colors duration-200"
        title="Debug Panel"
      >
        🔧 Debug {isExpanded ? '▼' : '▲'}
      </button>

      {/* デバッグパネル本体 */}
      {isExpanded && (
        <div className="absolute bottom-12 right-0 bg-gray-900 text-green-400 p-4 rounded-lg shadow-xl border border-gray-700 max-w-md w-96 max-h-96 overflow-y-auto text-xs font-mono">
          
          {/* 環境情報 */}
          <div className="mb-3">
            <h3 className="text-yellow-400 font-bold mb-1">🌍 Environment</h3>
            <div className="space-y-1">
              <div>hasAppId: <span className={env?.hasAppId ? 'text-green-400' : 'text-red-400'}>{String(env?.hasAppId)}</span></div>
              <div>safeMode: <span className={env?.safeMode ? 'text-red-400' : 'text-green-400'}>{String(env?.safeMode)}</span></div>
              <div>runtime: <span className="text-blue-400">{env?.runtime}</span></div>
            </div>
          </div>

          {/* 検索パラメータ */}
          <div className="mb-3">
            <h3 className="text-yellow-400 font-bold mb-1">🔍 Search Params</h3>
            <div className="space-y-1">
              <div>area: <span className="text-green-400">{String(finalSearchParams?.area || searchParams.currentArea || 'N/A')}</span></div>
              <div>lat/lng: <span className="text-cyan-400">{searchParams.lat?.toFixed(6)}, {searchParams.lng?.toFixed(6)}</span></div>
              <div>radius: <span className="text-cyan-400">{String(finalSearchParams?.searchRadius || 'N/A')}</span></div>
              <div>datum: <span className="text-yellow-400">{String(finalSearchParams?.datumType || '1')} (度)</span></div>
              <div>adults: <span className="text-cyan-400">{String(finalSearchParams?.adultNum || 'N/A')}</span></div>
            </div>
          </div>

          {/* 日付情報 */}
          {data.searchParams && (
            <div className="mb-3">
              <h3 className="text-yellow-400 font-bold mb-1">📅 Dates (JST)</h3>
              <div className="space-y-1">
                <div>checkin: <span className="text-cyan-400">{data.searchParams.checkinDate}</span></div>
                <div>checkout: <span className="text-cyan-400">{data.searchParams.checkoutDate}</span></div>
              </div>
            </div>
          )}

          {/* パイプライン結果 */}
          <div className="mb-3">
            <h3 className="text-yellow-400 font-bold mb-1">⚙️ Pipeline</h3>
            <div className="space-y-1">
              <div>branch: <span className="text-purple-400">{pipeline?.branch}</span></div>
              <div>candidates: <span className="text-cyan-400">{pipeline?.candidateCount}</span></div>
              <div>vacancies: <span className="text-green-400">{pipeline?.vacancyCount}</span></div>
            </div>
          </div>

          {/* API呼び出し履歴 */}
          <div className="mb-3">
            <h3 className="text-yellow-400 font-bold mb-1">🌐 API Calls</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {upstream?.map((call, index) => (
                <div key={index} className="border-l-2 border-gray-600 pl-2">
                  <div className="flex justify-between items-center">
                    <span className="text-white text-xs truncate">
                      {call.endpoint.replace('/20170426', '')}
                    </span>
                    <span className={`text-xs px-1 rounded ${
                      call.classification === 'success' ? 'bg-green-800 text-green-200' :
                      call.classification === 'no_results' ? 'bg-yellow-800 text-yellow-200' :
                      call.classification === 'param_invalid' ? 'bg-red-800 text-red-200' :
                      call.classification === 'rate_limit' ? 'bg-orange-800 text-orange-200' :
                      'bg-gray-800 text-gray-200'
                    }`}>
                      {call.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {call.elapsedMs}ms • {call.classification}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 実行時間 */}
          <div className="pt-2 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              Total: {debug.totalElapsedMs}ms
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
