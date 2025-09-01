"use client";

import { useState } from "react";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryDisabled?: boolean;
}

export default function ErrorBanner({ 
  message, 
  onRetry, 
  onDismiss, 
  retryDisabled = false 
}: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleRetry = () => {
    if (!retryDisabled && onRetry) {
      onRetry();
      // バナーを自動で閉じる
      setDismissed(true);
    }
  };

  return (
    <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg 
            className="h-5 w-5 text-orange-400" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        
        <div className="ml-3 flex-1">
          <p className="text-sm text-orange-700 font-medium">
            {message}
          </p>
        </div>
        
        <div className="ml-4 flex flex-shrink-0 space-x-2">
          {onRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retryDisabled}
              className={`
                text-sm font-medium rounded-md px-3 py-1 transition-colors
                ${retryDisabled 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-orange-600 hover:text-orange-500 hover:bg-orange-100'
                }
              `}
            >
              {retryDisabled ? '再試行中...' : '再試行'}
            </button>
          )}
          
          <button
            type="button"
            onClick={handleDismiss}
            className="text-sm font-medium text-orange-600 hover:text-orange-500 hover:bg-orange-100 rounded-md px-2 py-1 transition-colors"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
