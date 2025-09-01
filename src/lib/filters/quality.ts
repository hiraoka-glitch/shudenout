import { Hotel } from "@/app/data/hotels";

// 除外対象の低品質ホテルワード
const LOW_QUALITY_WORDS = [
  // カプセル系（全角・半角対応）
  "カプセル", "カプセルホテル", "capsule", "caps", "ｃａｐｓｕｌｅ",
  // キャビン系（全角・半角対応）
  "キャビン", "cabin", "キャビンホテル", "ｃａｂｉｎ",
  // ポッド系
  "ポッド", "pod", "pods", "ｐｏｄ",
  // ドミトリー系
  "ドミトリー", "dorm", "dormitory", "相部屋", "男女混合", "shared",
  // ホステル系（全角・半角対応）
  "ホステル", "hostel", "ゲストハウス", "guest house", "guesthouse", "ｈｏｓｔｅｌ",
  // ネットカフェ系（全角・半角対応）
  "ネットカフェ", "net cafe", "netcafe", "漫画喫茶", "manga cafe", "ｎｅｔｃａｆｅ",
  // その他低品質系
  "コンパクト", "compact", "ミニマル", "minimal", "シンプル宿泊",
  // バックパッカー系
  "バックパッカー", "backpacker", "youth", "ユース",
  // 簡易宿泊系
  "簡易宿泊", "簡易ホテル", "格安宿泊", "ワンルーム宿泊",
  // サウナ系（24時間利用が多い）
  "サウナ", "sauna", "ｓａｕｎａ"
];

/**
 * 全角・半角文字を正規化（半角に統一）
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, function(s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    })
    .replace(/[　]/g, ' '); // 全角スペースを半角に
}

/**
 * ホテルが品質基準を満たすかどうかを判定する
 * @param hotel ホテル情報
 * @returns 品質基準を満たす場合true
 */
export function isQualityHotel(hotel: Hotel): boolean {
  // 1. 価格チェック: 3000円以上（終電後ホテルとして妥当な価格帯）
  if (hotel.price < 3000) {
    // console.log(`🚫 品質フィルターで除外: "${hotel.name}" (理由: 価格が3000円未満 - ${hotel.price}円)`);
    return false;
  }

  // 2. 評価チェック: 3.5以上（評価なしは通す）
  if (hotel.rating && hotel.rating < 3.5) {
    // console.log(`🚫 品質フィルターで除外: "${hotel.name}" (理由: 評価が3.5未満 - ${hotel.rating})`);
    return false;
  }

  // 3. 除外ワードチェック（低品質ホテル）
  const normalizedHotelName = normalizeText(hotel.name);
  const matchedWord = LOW_QUALITY_WORDS.find(word => {
    const normalizedWord = normalizeText(word);
    return normalizedHotelName.includes(normalizedWord);
  });
  
  if (matchedWord) {
    // console.log(`🚫 品質フィルターで除外: "${hotel.name}" (理由: 除外ワード "${matchedWord}")`);
    return false;
  }

  return true;
}

/**
 * ホテルリストを品質フィルターでフィルタリング
 * @param hotels ホテルリスト
 * @returns 品質基準を満たすホテルのみ
 */
export function filterQualityHotels(hotels: Hotel[]): Hotel[] {
  const filteredHotels = hotels.filter(hotel => isQualityHotel(hotel));
  
  // 警告解消のための変更：未使用の統計変数を削除
  // console.log(`📊 品質フィルター結果: ${hotels.length}件 → ${filteredHotels.length}件除外後`);
  
  return filteredHotels;
}
