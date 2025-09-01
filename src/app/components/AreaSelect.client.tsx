'use client';
import { AREAS, coerceArea, type AreaKey } from '@/lib/areas';

export default function AreaSelect({
  value, onChange, className,
}:{ value?: string|null; onChange:(v:AreaKey)=>void; className?:string }) {
  const safe = coerceArea(value);
  return (
    <label className={className}>
      <span className="mr-2 text-sm text-slate-600">エリア</span>
      <select
        value={safe}
        onChange={(e)=> onChange(coerceArea(e.target.value))}
        className="border rounded-md px-2 py-1 bg-white"
      >
        {Object.entries(AREAS).map(([k,a])=>(
          <option key={k} value={k}>{a.label}</option>
        ))}
      </select>
    </label>
  );
}
