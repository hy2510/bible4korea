import type { Json } from "@/lib/supabase/database.types";
import { getUserDisplayName } from "@/lib/user-profile";

export interface ActivityRankingItem {
  rank: number;
  username: string;
  nickname: string | null;
  displayName: string;
  readCount: number;
  affiliation: string | null;
}

export interface ActivityRankingResponse {
  items: ActivityRankingItem[];
  total: number;
  weekLabel: string;
}

export interface ActivityWeekRange {
  startAt: string;
  endAt: string;
  startDate: string;
  endDate: string;
  label: string;
}

const KOREA_TIME_OFFSET_MS = 9 * 60 * 60 * 1_000;
const WEEK_DURATION_MS = 7 * 24 * 60 * 60 * 1_000;

function formatKoreanCalendarDate(date: Date): string {
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

export function getCurrentKoreanWeekRange(
  now = new Date(),
): ActivityWeekRange {
  const koreanNow = new Date(now.getTime() + KOREA_TIME_OFFSET_MS);
  const dayOfWeek = koreanNow.getUTCDay() || 7;
  const koreanWeekStart = Date.UTC(
    koreanNow.getUTCFullYear(),
    koreanNow.getUTCMonth(),
    koreanNow.getUTCDate() - dayOfWeek + 1,
  );
  const startAt = new Date(koreanWeekStart - KOREA_TIME_OFFSET_MS);
  const endAt = new Date(startAt.getTime() + WEEK_DURATION_MS);
  const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  });

  return {
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    startDate: formatKoreanCalendarDate(startAt),
    endDate: formatKoreanCalendarDate(endAt),
    label: `이번 주 · ${dateFormatter.format(startAt)}~${dateFormatter.format(
      new Date(endAt.getTime() - 1),
    )}`,
  };
}

export function countReadingProgressInRange(
  progress: Json,
  range: ActivityWeekRange,
): number {
  if (
    !progress ||
    typeof progress !== "object" ||
    Array.isArray(progress) ||
    !Array.isArray(progress.completedVerseKeys) ||
    !progress.completedVerseDetails ||
    typeof progress.completedVerseDetails !== "object" ||
    Array.isArray(progress.completedVerseDetails)
  ) {
    return 0;
  }

  const completedVerseKeys = new Set(
    progress.completedVerseKeys.filter(
      (verseKey): verseKey is string => typeof verseKey === "string",
    ),
  );
  const rangeStart = new Date(range.startAt).getTime();
  const rangeEnd = new Date(range.endAt).getTime();

  return Object.entries(progress.completedVerseDetails).filter(
    ([verseKey, detail]) => {
      if (
        !completedVerseKeys.has(verseKey) ||
        !detail ||
        typeof detail !== "object" ||
        Array.isArray(detail) ||
        typeof detail.completedAt !== "string"
      ) {
        return false;
      }

      if (
        typeof detail.completedDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(detail.completedDate)
      ) {
        return (
          detail.completedDate >= range.startDate &&
          detail.completedDate < range.endDate
        );
      }

      const completedAt = new Date(detail.completedAt).getTime();
      return (
        Number.isFinite(completedAt) &&
        completedAt >= rangeStart &&
        completedAt < rangeEnd
      );
    },
  ).length;
}
