'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AreaSelect from '@/app/components/AreaSelect.client';
import { AREAS, coerceArea, DEFAULT_AREA, type AreaKey } from '@/lib/areas';

type Ui = 'loading'|'ok'|'empty'|'param_invalid'|'rate_limit'|'server_error';

export default function Page(){
  const sp = useSearchParams();
  const router = useRouter();

  const area = coerceArea(sp.get('area'));
  const [currentArea, setCurrentArea] = useState<AreaKey>(area);
  const geo = useMemo(()=> AREAS[currentArea] ?? AREAS[DEFAULT_AREA], [currentArea]);

  function setAreaAndUrl(next: AreaKey){
    setCurrentArea(next);
    const qp = new URLSearchParams(sp.toString());
    qp.set('area', next);
    router.replace('/?'+qp.toString(), { scroll:false });
  }

  const [ui,setUi] = useState<Ui>('loading');
  const [items,setItems] = useState<any[]>([]);

  async function call(radius:number){
    const url = `/api/hotels?area=${currentArea}&radius=${radius}&ts=${Date.now()}`;
    const res = await fetch(url, { cache:'no-store' });
    const j = await res.json().catch(()=>({}));
    return j as { classification:string; items:any[] };
  }

  useEffect(()=>{
    let dead=false;
    setUi('loading');
    (async()=>{
      const steps=[1.0,2.0,3.0];
      let found:any[]=[];
      let lastClass:'ok'|'no_results'|'param_invalid'|'rate_limit'|'server_error'='no_results';
      for(const r of steps){
        const j = await call(r);
        lastClass = (j.classification as any) ?? 'no_results';
        if(Array.isArray(j.items) && j.items.length>0){ found=j.items; break; }
        if(lastClass==='param_invalid'){ /* 半径等の問題。次のrで継続 */ }
      }
      if(dead) return;
      setItems(found);
      setUi(found.length>0 ? 'ok' : lastClass==='param_invalid' ? 'param_invalid'
                           : lastClass==='rate_limit' ? 'rate_limit'
                           : lastClass==='server_error' ? 'server_error' : 'empty');
    })();
    return()=>{dead=true};
  },[currentArea, geo.lat, geo.lng]); // 変更で必ず再検索

  return (
    <main className="py-4">
      <h1 className="text-2xl font-bold mb-4">終電後にすぐ泊まれる宿</h1>
      
      <div className="mb-4">
        <AreaSelect value={currentArea} onChange={setAreaAndUrl}/>
      </div>

      {ui==='loading' && <p className="text-slate-600">検索中…</p>}
      {ui==='param_invalid' && <p className="text-amber-700">パラメータに問題があります（自動調整中）。しばらくして再試行してください。</p>}
      {ui==='rate_limit' && <p className="text-amber-700">アクセス集中のため一時的に取得できません。少し待って再試行を。</p>}
      {ui==='server_error' && <p className="text-red-600">楽天側の一時的な障害です。時間をおいて再試行してください。</p>}
      {ui==='empty' && <p>選択エリアの当日空室は見つかりませんでした。</p>}

      {(ui==='ok') && (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((it)=>(
            <li key={it.id ?? crypto.randomUUID()} className="border rounded-md p-3">
              <div className="font-semibold">{it.name ?? '名称不明'}</div>
              {Number.isFinite(it?.price) && it.price > 0 && <div>¥{Number(it.price).toLocaleString()}</div>}
              {it?.affiliateUrl && <a className="text-blue-600 underline" href={it.affiliateUrl} target="_blank" rel="noopener noreferrer">空室を見る</a>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}