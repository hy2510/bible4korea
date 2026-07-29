import type { PronunciationProgressSnapshot } from "@/lib/pronunciation-progress";

export const DAILY_GOAL_MIN = 1;
export const DAILY_GOAL_MAX = 1000;
export const DEFAULT_DAILY_GOAL_TARGET = 31;

export function getKoreanCalendarDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

export function countCompletedVersesOnDate(
  snapshot: PronunciationProgressSnapshot,
  calendarDate: string,
): number {
  return Object.entries(snapshot.completedVerseDetails).filter(
    ([verseKey, detail]) =>
      snapshot.completedVerseKeys.has(verseKey) &&
      detail.completedDate === calendarDate,
  ).length;
}

export function isValidDailyGoalTarget(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= DAILY_GOAL_MIN &&
    value <= DAILY_GOAL_MAX
  );
}
