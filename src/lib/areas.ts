export type AreaKey = 'shinjuku'|'shibuya'|'ikebukuro'|'ueno'|'tokyo'|'yokohama';

export const AREAS: Record<AreaKey,{label:string;lat:number;lng:number}> = {
  shinjuku:{label:'新宿',lat:35.6905,lng:139.7004},
  shibuya:{label:'渋谷',lat:35.6591,lng:139.7036},
  ikebukuro:{label:'池袋',lat:35.7289,lng:139.7101},
  ueno:{label:'上野',lat:35.7123,lng:139.7770},
  tokyo:{label:'東京駅',lat:35.6812,lng:139.7671},
  yokohama:{label:'横浜',lat:35.4662,lng:139.6220},
};

export const DEFAULT_AREA: AreaKey = 'shinjuku';

export function coerceArea(input: unknown): AreaKey {
  const v = String(input ?? '').toLowerCase();
  return (v in AREAS ? v : DEFAULT_AREA) as AreaKey;
}
