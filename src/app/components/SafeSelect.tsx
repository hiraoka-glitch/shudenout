'use client';
import React from 'react';

type Option = { value: string; label: string; disabled?: boolean; hidden?: boolean };

interface SafeSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * 選択値不整合でクラッシュしない安全なSelectコンポーネント
 * valueがoptionsに存在しない場合は自動的にフォールバック
 */
export function SafeSelect({
  value: rawValue,
  onChange,
  options,
  placeholder = "選択してください",
  className = "",
  disabled = false
}: SafeSelectProps) {
  // 表示可能なオプションのみフィルタ
  const visibleOptions = options.filter(o => !o.hidden);
  
  // 安全な値の決定（optionsに存在しない場合はフォールバック）
  const safeValue = React.useMemo(() => {
    if (!rawValue) return '';
    
    // 値が存在するかチェック
    const exists = visibleOptions.some(o => o.value === rawValue);
    if (exists) return rawValue;
    
    // 存在しない場合のフォールバック
    const firstValidOption = visibleOptions.find(o => !o.disabled);
    const fallbackValue = firstValidOption?.value ?? '';
    
    if (rawValue !== fallbackValue) {
      console.warn(`SafeSelect: Value "${rawValue}" not found in options, fallback to "${fallbackValue}"`);
      // 非同期でonChangeを呼んでコンポーネント外の状態も同期
      setTimeout(() => onChange(fallbackValue), 0);
    }
    
    return fallbackValue;
  }, [rawValue, visibleOptions, onChange]);

  return (
    <select
      value={safeValue}
      onChange={(e) => onChange(e.target.value)}
      className={`border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      disabled={disabled}
    >
      {!safeValue && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {visibleOptions.map(option => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
