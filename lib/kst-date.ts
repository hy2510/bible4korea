/** KST 기준 YYYY-MM-DD — 오늘의 말씀 캐시 키 */
export function getKstDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(date);
}
