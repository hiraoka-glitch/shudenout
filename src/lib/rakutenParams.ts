export type Geo = { lat:number; lng:number };
export type Dates = { checkin:string; checkout:string };

const clampRadius = (r:number)=> Math.round(Math.min(3,Math.max(0.1,r))*10)/10;

export function buildVacantParams(appId:string, geo:Geo, d:Dates, radiusKm:number){
  return {
    applicationId: appId,
    format: 'json',
    formatVersion: 2,
    checkinDate: d.checkin,
    checkoutDate: d.checkout,
    adultNum: 2,
    roomNum: 1,
    latitude: geo.lat,
    longitude: geo.lng,
    datumType: 1,                 // 度
    searchRadius: clampRadius(radiusKm), // 0.1〜3.0
    responseType: 'small',
    searchPattern: 0,
    carrier: 0,
    hits: 30,
    page: 1,
    sort: 'standard',
  } as const;
}
