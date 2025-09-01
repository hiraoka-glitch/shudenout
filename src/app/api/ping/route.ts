export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local';
  const env = process.env.VERCEL_ENV ?? 'unknown';
  const timestamp = new Date().toISOString();
  
  return new Response(JSON.stringify({ 
    ok: true, 
    env, 
    sha,
    timestamp,
    message: 'Ping successful - API routes are working'
  }), {
    status: 200,
    headers: { 
      'content-type': 'application/json',
      'cache-control': 'no-store'
    },
  });
}
