import { isValidLatLng } from '@/lib/geo';

export function haversineKm(aLat: number|null, aLng: number|null, bLat: number|null, bLng: number|null) {
  if (aLat==null || aLng==null || bLat==null || bLng==null) return null;
  if (!isValidLatLng(aLat, aLng) || !isValidLatLng(bLat, bLng)) return null;
  const toRad = (d:number)=> d*Math.PI/180, R=6371;
  const dLat=toRad(bLat-aLat), dLng=toRad(bLng-aLng);
  const s=Math.sin(dLat/2)**2 + Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLng/2)**2;
  return Math.round( (2*R*Math.asin(Math.sqrt(s))) * 10 ) / 10;
}
