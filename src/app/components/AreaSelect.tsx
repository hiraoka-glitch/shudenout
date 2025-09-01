'use client';
import React from 'react';
import { AREAS, AREA_OPTIONS, coerceArea, type AreaKey } from '@/lib/areas';

interface AreaSelectProps {
  value?: string | null;
  onChange: (area: AreaKey) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * 堅牢なエリア選択コンポーネント
 * - ネイティブ<select>で確実表示・動作
 * - 未知値の安全フォールバック
 * - z-index/overflow/portal問題なし
 */
export function AreaSelect({ value, onChange, className, disabled }: AreaSelectProps) {
  const safeValue = coerceArea(value);
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newArea = coerceArea(e.target.value);
    onChange(newArea);
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <label htmlFor="area-select" className="text-sm font-medium text-gray-700">
        エリア
      </label>
      <select
        id="area-select"
        value={safeValue}
        onChange={handleChange}
        disabled={disabled}
        className="
          border border-gray-300 rounded-md px-3 py-2 bg-white
          text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
          min-w-[120px]
        "
      >
        {AREA_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* デバッグ情報（開発時のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <span className="text-xs text-gray-400 ml-2">
          ({AREAS[safeValue].lat.toFixed(4)}, {AREAS[safeValue].lng.toFixed(4)})
        </span>
      )}
    </div>
  );
}

/**
 * エリア情報表示用コンポーネント
 */
export function AreaInfo({ areaKey }: { areaKey: AreaKey }) {
  const area = AREAS[areaKey];
  return (
    <div className="text-sm text-gray-600">
      <span className="font-medium">{area.label}</span>
      <span className="ml-2 text-gray-400">
        ({area.lat.toFixed(4)}, {area.lng.toFixed(4)})
      </span>
    </div>
  );
}
