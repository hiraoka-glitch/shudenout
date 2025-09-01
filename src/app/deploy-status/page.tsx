'use client';

import { useEffect, useState } from 'react';

interface DiagMeta {
  vercel: {
    env: string | null;
    region: string | null;
    url: string | null;
    gitCommitSha: string | null;
    gitCommitRef: string | null;
    buildTime: string | null;
  };
  build: {
    timestamp: string;
    shortSha: string;
    deployEnvironment: string;
  };
}

interface DiagResponse {
  meta: DiagMeta;
  env: {
    hasAppId: boolean;
    nodeEnv: string;
    runtime: string;
  };
}

export default function DeployStatusPage() {
  const [diagData, setDiagData] = useState<DiagResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<string>('');

  const fetchDiagData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/diag?ts=${Date.now()}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setDiagData(data);
      setLastCheck(new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagData();
  }, []);

  const formatBuildTime = (buildTime: string | null) => {
    if (!buildTime) return 'N/A';
    try {
      const date = new Date(parseInt(buildTime) * 1000);
      return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
    } catch {
      return buildTime;
    }
  };

  const getEnvironmentBadge = (env: string | null) => {
    switch (env) {
      case 'production':
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">PRODUCTION</span>;
      case 'preview':
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">PREVIEW</span>;
      case 'development':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">DEVELOPMENT</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-medium">{env || 'UNKNOWN'}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">デプロイステータス</h1>
          <p className="text-gray-600">本番環境のデプロイ状況と最新コミット情報</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800 font-medium">エラー</div>
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">現在のデプロイ</h2>
            <button
              onClick={fetchDiagData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              {loading ? '更新中...' : '🔄 再確認'}
            </button>
          </div>

          {diagData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">環境</div>
                  <div className="flex items-center gap-2">
                    {getEnvironmentBadge(diagData.meta.vercel.env)}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">コミットSHA</div>
                  <div className="font-mono text-lg">
                    {diagData.meta.vercel.gitCommitSha ? (
                      <>
                        <span className="text-blue-600">{diagData.meta.build.shortSha}</span>
                        <span className="text-gray-400 text-sm ml-2">
                          ({diagData.meta.vercel.gitCommitSha})
                        </span>
                      </>
                    ) : (
                      <span className="text-gray-500">N/A</span>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">ブランチ</div>
                  <div className="font-mono text-lg">
                    {diagData.meta.vercel.gitCommitRef || 'N/A'}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">ビルド時刻</div>
                  <div className="text-sm">
                    {formatBuildTime(diagData.meta.vercel.buildTime)}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">リージョン</div>
                  <div>{diagData.meta.vercel.region || 'N/A'}</div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">URL</div>
                  <div className="text-sm break-all">
                    {diagData.meta.vercel.url || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800 mb-2">環境確認</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">App ID:</span> {diagData.env.hasAppId ? '✅ 設定済み' : '❌ 未設定'}
                  </div>
                  <div>
                    <span className="text-blue-600">Node ENV:</span> {diagData.env.nodeEnv}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">データを読み込めませんでした</div>
          )}

          {lastCheck && (
            <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
              最終確認: {lastCheck}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">本番デプロイ確認手順</h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-gray-50 rounded">
              <div className="font-medium text-gray-900 mb-1">1. 環境確認</div>
              <div className="text-gray-600">
                上記の「環境」が <strong>PRODUCTION</strong> であることを確認
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="font-medium text-gray-900 mb-1">2. 最新コミット確認</div>
              <div className="text-gray-600">
                「コミットSHA」が期待する最新のコミットと一致することを確認
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="font-medium text-gray-900 mb-1">3. ビルド時刻確認</div>
              <div className="text-gray-600">
                「ビルド時刻」が最近（数分〜数時間以内）であることを確認
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
