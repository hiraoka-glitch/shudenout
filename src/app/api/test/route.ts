import { NextResponse } from 'next/server';

// Force dynamic rendering and use Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    return NextResponse.json({
      status: 'success',
      message: 'API test successful',
      timestamp: new Date().toISOString(),
      hasRakutenKey: !!process.env.RAKUTEN_APP_ID
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
