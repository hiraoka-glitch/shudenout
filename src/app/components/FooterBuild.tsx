/**
 * バージョンウォーターマーク表示
 * 本番デプロイ状況をフッターで一目確認
 */
export default function FooterBuild() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local';
  const env = process.env.VERCEL_ENV ?? 'dev';
  const buildTime = process.env.VERCEL_BUILD_TIME 
    ? new Date(parseInt(process.env.VERCEL_BUILD_TIME) * 1000).toISOString().slice(0, 16).replace('T', ' ')
    : null;

  return (
    <div className="text-[11px] text-gray-400 font-mono">
      build: {env} {sha}
      {buildTime && (
        <span className="ml-2 opacity-60">
          @{buildTime}Z
        </span>
      )}
    </div>
  );
}
