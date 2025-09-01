import { NextResponse } from 'next/server';
import { AREAS, coerceArea, DEFAULT_AREA } from '@/lib/areas';
import { buildVacantParams } from '@/lib/rakutenParams';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function jstDates(){
  const now = new Date();
  const jst = new Date(now.getTime()+9*3600*1000);
  const checkin = jst.toISOString().slice(0,10);
  const checkout = new Date(jst.getTime()+24*3600*1000).toISOString().slice(0,10);
  return { checkin, checkout };
}

export async function GET(req: Request){
  const u = new URL(req.url);
  const area = coerceArea(u.searchParams.get('area'));
  const radius = Number(u.searchParams.get('radius') ?? '3');
  const isInspect = u.searchParams.get('inspect') === '1';
  const base = AREAS[area] ?? AREAS[DEFAULT_AREA];

  const appId = process.env.RAKUTEN_APP_ID ?? '';
  const dates = jstDates();
  const params = buildVacantParams(appId, { lat: base.lat, lng: base.lng }, dates, radius);

  const url = 'https://app.rakuten.co.jp/services/api/Travel/VacantHotelSearch/20170426'
              + '?' + new URLSearchParams(params as any).toString();

  let upstreamStatus = 0;
  let body: any = null;
  try{
    const res = await fetch(url, { cache:'no-store' });
    upstreamStatus = res.status;
    body = await res.text();
  } catch (e){
    // ネットワーク例外でも 200 で返す（UIを落とさない）
    return NextResponse.json({
      success:false,
      classification:'server_error',
      items:[],
      ...(isInspect && {
        debug:{ 
          upstream:{ status: 'fetch_error', error: String(e) }, 
          finalSearchParams: params 
        }
      })
    },{ status:200 });
  }

  const classification =
    upstreamStatus === 400 ? 'param_invalid' :
    upstreamStatus === 404 ? 'no_results'   :
    upstreamStatus === 429 ? 'rate_limit'   :
    upstreamStatus >=500   ? 'server_error' : 'ok';

  // 簡易正規化（エラー時も安全）
  let items:any[] = [];
  try{
    const json = JSON.parse(body);
    const hotels = json?.hotels || [];
    items = Array.isArray(hotels) ? hotels.map((h:any) => {
      const info = h?.hotel?.[0]?.hotelBasicInfo;
      if (!info) return null;
      return {
        id: String(info.hotelNo || crypto.randomUUID()),
        name: info.hotelName || '名称不明',
        price: info.hotelMinCharge || 0,
        affiliateUrl: info.hotelInformationUrl || ''
      };
    }).filter(Boolean) : [];
  }catch(parseError){
    // パース失敗でも空配列で継続
    items = [];
  }

  return NextResponse.json({
    success: classification==='ok' && items.length > 0,
    classification,
    items,
    ...(isInspect && {
      debug:{
        upstream:{ status: upstreamStatus },
        finalSearchParams: params,
        itemCount: items.length,
        area: area,
        coordinates: base
      }
    })
  },{ status:200 });
}