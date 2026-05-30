/**
 * 靜態資產設定
 *
 * 本地開發：BASE_URL = "" → 走 /public/ 路徑
 * 上線後可將 BASE_URL 指向 OSS/CDN 根目錄，路徑無需改動
 */
const BASE_URL = "";

function asset(path: string): string {
  return `${BASE_URL}${path}`;
}

/** 預留 CDN 資產；Hero 背景已改為 canvas，不再載入影片 */
export const media = {
  hero: {},
} as const;

export { asset };
