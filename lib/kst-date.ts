/** KST 기준 YYYY-MM-DD */
export function getKstDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(date);
}
