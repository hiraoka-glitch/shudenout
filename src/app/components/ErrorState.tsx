"use client";

import React from 'react';
import { UiState } from '../../types/api';

interface ErrorStateProps {
  uiState: UiState;
  message?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
}

export default function ErrorState({ uiState, message, onRetry, retryDisabled = false }: ErrorStateProps) {
  const getErrorContent = () => {
    switch (uiState) {
      case 'param_invalid':
        return {
          icon: '⚠️',
          title: '検索条件エラー',
          description: '検索条件に不備があります。ページを再読み込みするか、エリアを変更してお試しください。',
          color: 'border-yellow-500 bg-yellow-50 text-yellow-800',
          iconColor: 'text-yellow-600'
        };
      
      case 'rate_limit':
        return {
          icon: '🚦',
          title: 'アクセス集中中',
          description: 'アクセスが集中しているため、一時的に検索できません。数分後に再試行してください。',
          color: 'border-orange-500 bg-orange-50 text-orange-800',
          iconColor: 'text-orange-600'
        };
      
      case 'server_error':
        return {
          icon: '🔧',
          title: 'サーバー障害',
          description: 'サーバーで一時的な障害が発生しています。時間をおいて再試行してください。',
          color: 'border-red-500 bg-red-50 text-red-800',
          iconColor: 'text-red-600'
        };
      
      case 'fetch_error':
        return {
          icon: '📡',
          title: '通信エラー',
          description: 'ネットワーク接続に問題があります。インターネット接続を確認して再試行してください。',
          color: 'border-blue-500 bg-blue-50 text-blue-800',
          iconColor: 'text-blue-600'
        };
      
      default:
        return {
          icon: '❌',
          title: 'エラーが発生しました',
          description: message || '予期しないエラーが発生しました。',
          color: 'border-gray-500 bg-gray-50 text-gray-800',
          iconColor: 'text-gray-600'
        };
    }
  };

  const errorContent = getErrorContent();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        
        {/* エラーカード */}
        <div className={`border-2 rounded-xl p-6 shadow-lg ${errorContent.color}`}>
          
          {/* アイコンとタイトル */}
          <div className="text-center mb-4">
            <div className={`text-4xl mb-2 ${errorContent.iconColor}`}>
              {errorContent.icon}
            </div>
            <h2 className="text-xl font-bold mb-2">
              {errorContent.title}
            </h2>
            <p className="text-sm leading-relaxed">
              {errorContent.description}
            </p>
          </div>

          {/* カスタムメッセージ */}
          {message && message !== errorContent.description && (
            <div className="bg-white bg-opacity-50 rounded-lg p-3 mb-4 text-sm">
              <strong>詳細:</strong> {message}
            </div>
          )}

          {/* 再試行ボタン */}
          {onRetry && (
            <div className="text-center">
              <button
                onClick={onRetry}
                disabled={retryDisabled}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  retryDisabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-gray-800 hover:bg-gray-100 shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                }`}
              >
                {retryDisabled ? '再試行中...' : '🔄 再試行'}
              </button>
            </div>
          )}

          {/* 追加の案内 */}
          <div className="mt-4 pt-4 border-t border-current border-opacity-20">
            <p className="text-xs text-center opacity-75">
              問題が続く場合は、別のエリアでお試しいただくか、<br />
              時間をおいて再度アクセスしてください。
            </p>
          </div>

        </div>

        {/* ホームに戻るリンク */}
        <div className="text-center mt-6">
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
