export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const meta = {
    env: process.env.VERCEL_ENV ?? null,
    sha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    url: process.env.VERCEL_URL ?? null,
    region: process.env.VERCEL_REGION ?? null,
    buildTime: process.env.VERCEL_BUILD_TIME ?? null,
    gitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
  };
  
  return new Response(JSON.stringify({ 
    ok: true, 
    meta,
    timestamp: new Date().toISOString(),
    message: 'Diagnostic endpoint working'
  }), {
    status: 200,
    headers: { 
      'content-type': 'application/json',
      'cache-control': 'no-store'
    },
  });
}
