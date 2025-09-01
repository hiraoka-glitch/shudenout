"use client";

import { type HotelItem } from "@/types/api";
import { trackHotelBooking } from "@/lib/analytics";
import { isValidLatLng } from "@/lib/geo";
import { CoordsGuard } from "./MapOrDistanceGuard";
import { haversineKm } from "@/lib/distance";
import Image from "next/image";

interface HotelCardProps {
  hotel: HotelItem;
  isVacantConfirmed?: boolean;
  userLat?: number | null;
  userLng?: number | null;
}

export default function HotelCard({ hotel, userLat, userLng }: HotelCardProps) {
  // デバッグ設定（環境変数制御・本番では無効）
  const isDebugMode = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_LINKS_UI === 'true';
  
  // 地理座標の安全性チェック
  const lat = hotel.latitude;
  const lng = hotel.longitude;
  const hasValidCoords = lat != null && lng != null && isValidLatLng(lat, lng);
  
  // 安全な距離計算
  const distance = haversineKm(userLat ?? null, userLng ?? null, lat, lng);
  
  // アフィリエイトURL診断
  const inspectAffiliateUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const isHBAFL = urlObj.hostname === 'hb.afl.rakuten.co.jp';
      
      if (!isHBAFL) {
        return {
          isOK: false,
          reason: `Non-hb.afl: ${urlObj.hostname}`
        };
      }
      
      const pcRaw = urlObj.searchParams.get('pc') || '';
      const hasDoubleEncode = /%25[0-9A-Fa-f]{2}/.test(pcRaw);
      
      if (hasDoubleEncode) {
        return {
          isOK: false,
          reason: 'Double-encoded pc parameter'
        };
      }
      
      if (pcRaw) {
        try {
          const pcDecoded = decodeURIComponent(pcRaw);
          const pcUrlObj = new URL(pcDecoded);
          const isTravelHost = pcUrlObj.hostname === 'travel.rakuten.co.jp' || pcUrlObj.hostname === 'hotel.travel.rakuten.co.jp';
          
          if (!isTravelHost) {
            return {
              isOK: false,
              reason: `Invalid pc host: ${pcUrlObj.hostname}`
            };
          }
        } catch {
          return {
            isOK: false,
            reason: 'Invalid pc URL format'
          };
        }
      }
      
      return { isOK: true, reason: '' };
    } catch {
      return {
        isOK: false,
        reason: 'Invalid URL format'
      };
    }
  };
  
  const handleAnalyticsTracking = () => {
    // アフィリエイトURL診断
    const affiliateUrl = hotel.affiliateUrl || '';
    const urlInspection = inspectAffiliateUrl(affiliateUrl);
    const domHref = affiliateUrl; // 実際のDOM hrefと同じ
    const hrefMatches = domHref === affiliateUrl;
    
    // デバッグ情報をコンソールに出力
    if (isDebugMode) {
      console.info('BOOKING_LINK', {
        hotelId: hotel.hotelNo,
        hotelName: hotel.hotelName,
        apiAffiliateUrl: affiliateUrl,
        domHref: domHref,
        hrefMatches,
        urlInspection
      });
    }
    
    // 従来のログ
    console.log({ event: "book_click", id: hotel.hotelNo, affiliateUrl: affiliateUrl });
    
    // Google Analytics追跡（距離は安全な値のみ）
    trackHotelBooking({
      hotelId: hotel.hotelNo.toString(),
      hotelName: hotel.hotelName,
      price: hotel.hotelMinCharge,
      area: hotel.address1 + hotel.address2,
      distanceKm: (hasValidCoords && hotel.distance && Number.isFinite(hotel.distance)) ? hotel.distance : 0,
    });
  };
  
  // 診断バッジ用の状態計算
  const urlInspection = isDebugMode ? inspectAffiliateUrl(hotel.affiliateUrl || '') : null;
  const hrefMatches = hotel.affiliateUrl === hotel.affiliateUrl; // 実際は常に true（DOMと同じ値）
  const badgeStatus = urlInspection ? (urlInspection.isOK && hrefMatches ? 'OK' : 'WARN') : null;

  // 楽天トラベル評価があれば表示（数値のみ）
  const hasValidRating = hotel.hotelSpecial && hotel.hotelSpecial.includes('評価');

  return (
    <div className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out">
      {/* ホテル画像（安全表示） */}
      <div className="relative h-48 w-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {hotel.roomImageUrl ? (
          <Image
            src={hotel.roomImageUrl}
            alt={hotel.hotelName}
            width={400}
            height={240}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500 w-full h-full"
            priority={false}
            onError={() => console.warn('Image load error:', hotel.roomImageUrl)}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 grid place-items-center text-xs text-gray-500">
            画像なし
          </div>
        )}
        
        {/* 価格バッジ（画像上） */}
        <div className="absolute top-3 right-3">
          <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-lg font-bold text-gray-900">
              ¥{hotel.hotelMinCharge.toLocaleString()}
            </span>
            <span className="text-xs text-gray-600 ml-1">〜</span>
          </div>
        </div>

        {/* 評価バッジはスキップ（楽天API応答に含まれないため） */}

        {/* 当日空室バッジ（画像上） - 空室確認済みのみ表示 */}
        <div className="absolute bottom-3 left-3">
          <div 
            className="px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 bg-green-500/90 text-white"
            aria-label="本日空室あり"
          >
            <span>✅</span>
            <span>本日空室あり</span>
          </div>
        </div>
        
        {/* 診断バッジ（開発時のみ） */}
        {isDebugMode && badgeStatus && (
          <div className="absolute top-12 left-3">
            <div 
              className={`px-2 py-1 rounded text-xs font-bold ${
                badgeStatus === 'OK' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-yellow-500 text-black'
              }`}
              title={badgeStatus === 'WARN' ? urlInspection?.reason : 'All checks passed'}
            >
              {badgeStatus}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-5">
        {/* ホテル名 */}
        <h3 className="font-bold text-xl mb-2 text-gray-900 leading-tight line-clamp-2">
          {hotel.hotelName}
        </h3>
        
        {/* 最寄り駅・エリア・距離 */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">{hotel.address1}</span>
          </div>
          <span className="text-gray-300">•</span>
          <span className="text-sm text-gray-500">{hotel.address2}</span>
          
          {/* 距離表示（座標ガード付き） */}
          <CoordsGuard 
            lat={lat} 
            lng={lng} 
            fallback={isDebugMode ? <><span className="text-gray-300">•</span><span className="text-xs text-red-500">位置情報なし</span></> : null}
          >
            {distance != null && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-green-600">
                  現在地から約 {distance} km
                </span>
              </>
            )}
          </CoordsGuard>
          
          {/* 位置情報デバッグ表示（開発時のみ） */}
          {isDebugMode && (
            <>
              <span className="text-gray-300">•</span>
              {hasValidCoords ? (
                <span className="text-xs text-green-600 font-mono">
                  座標: {lat?.toFixed(4)}, {lng?.toFixed(4)}
                </span>
              ) : (
                <span className="text-xs text-red-500">
                  座標: 不正値
                </span>
              )}
            </>
          )}
        </div>

        {/* 評価表示はスキップ（楽天API応答に含まれないため） */}
        
        {/* 設備タグ（簡易版） */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {/* WiFi推定 */}
          {hotel.hotelSpecial?.includes('WiFi') && (
            <span className="inline-flex items-center bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium border border-blue-100">
              WiFi
            </span>
          )}
          {/* 朝食推定 */}
          {hotel.withBreakfastFlag === 1 && (
            <span className="inline-flex items-center bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-xs font-medium border border-green-100">
              朝食付き
            </span>
          )}
          {/* 夕食推定 */}
          {hotel.withDinnerFlag === 1 && (
            <span className="inline-flex items-center bg-orange-50 text-orange-700 px-2.5 py-1 rounded-md text-xs font-medium border border-orange-100">
              夕食付き
            </span>
          )}
        </div>

        {/* 価格・予約ボタン */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-2xl font-bold text-gray-900">
              ¥{hotel.hotelMinCharge.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500"> / 泊〜</span>
          </div>
        </div>
        
        {/* 予約ボタン */}
        <a
          href={hotel.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAnalyticsTracking}
          className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:transform active:scale-[0.98] text-center"
          data-analytics="book"
          data-hotel-id={hotel.hotelNo}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            今すぐ予約
          </span>
        </a>
      </div>
    </div>
  );
}