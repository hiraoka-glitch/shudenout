"use client";

import React from 'react';

interface EmptyStateProps {
  message?: string;
  searchRadius?: number;
  autoRetryAttempted?: boolean;
  onRetry?: () => void;
  onChangeArea?: () => void;
}

export default function EmptyState({ 
  message,
  searchRadius = 3,
  autoRetryAttempted = false,
  onRetry,
  onChangeArea
}: EmptyStateProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        
        {/* アイコンとメッセージ */}
        <div className="mb-8">
          <div className="text-6xl mb-4">🏨</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            本日の空室が見つかりませんでした
          </h2>
          <p className="text-gray-600 leading-relaxed">
            {message || '選択されたエリア周辺で、本日利用可能なホテルが見つかりませんでした。'}
          </p>
        </div>

        {/* 検索詳細情報 */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">検索詳細</h3>
          
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <span>検索日程:</span>
              <span className="font-medium text-gray-800">本日〜明日</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>検索範囲:</span>
              <span className="font-medium text-gray-800">
                半径 {searchRadius}km
                {autoRetryAttempted && <span className="text-blue-600 ml-2">(自動拡大済み)</span>}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>利用人数:</span>
              <span className="font-medium text-gray-800">2名</span>
            </div>
          </div>

          {/* 自動拡大の説明 */}
          {autoRetryAttempted && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                💡 自動的に検索範囲を拡大して再検索しましたが、空室は見つかりませんでした。
              </p>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="space-y-4">
          
          {/* エリア変更ボタン */}
          <button
            onClick={onChangeArea}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
          >
            📍 別のエリアで検索
          </button>

          {/* 手動再試行ボタン */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
            >
              🔄 再検索
            </button>
          )}

        </div>

        {/* 追加の提案 */}
        <div className="mt-8 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-2">💡 おすすめ</h4>
          <ul className="text-sm text-yellow-700 space-y-1 text-left">
            <li>• 別の駅・エリアでお試しください</li>
            <li>• 時間をおいて再度検索してみてください</li>
            <li>• 平日や連休以外の日程をご検討ください</li>
          </ul>
        </div>

        {/* フッターリンク */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm underline transition-colors duration-200"
          >
            🏠 トップページに戻る
          </a>
        </div>

      </div>
    </div>
  );
}
