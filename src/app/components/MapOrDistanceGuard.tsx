'use client';
import { isValidLatLng } from '@/lib/geo';

export function CoordsGuard({
  lat, lng, children, fallback=null,
}: { lat: number|null|undefined, lng: number|null|undefined, children: React.ReactNode, fallback?: React.ReactNode }) {
  if (lat==null || lng==null || !isValidLatLng(lat, lng)) return <>{fallback}</>;
  return <>{children}</>;
}
