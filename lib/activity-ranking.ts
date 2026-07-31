import type { Json } from "@/lib/supabase/database.types";

export interface ActivityRankingItem {
  rank: number;
  displayName: string;
  readCount: number;
}

export interface ActivityRankingResponse {
  items: ActivityRankingItem[];
  total: number;
  weekLabel: string;
  organizationName: string | null;
  membershipStatus: "pending" | "approved" | null;
}

export interface ActivityWeekdayReadCount {
  date: string;
  dayLabel: string;
  readCount: number;
}

export interface ActivityRankingUserSummary {
  username: string;
  displayName: string;
  affiliation: string | null;
  thisWeekReadCount: number;
  totalReadCount: number;
  activeBookCount: number;
  completedBookCount: number;
  bookCompletionCount: number;
  bibleCompletionCount: number;
  dailyGoalAchievementCount: number;
  dailyGoalAchievementDates: string[];
  dailyGoalStartedDate: string | null;
  weeklyReadCounts: ActivityWeekdayReadCount[];
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
const KOREAN_WEEKDAY_LABELS = [
  "일",
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
] as const;

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
  const dayOfWeek = koreanNow.getUTCDay();
  const koreanWeekStart = Date.UTC(
    koreanNow.getUTCFullYear(),
    koreanNow.getUTCMonth(),
    koreanNow.getUTCDate() - dayOfWeek,
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
    label: `${dateFormatter.format(startAt)}(일) ~ ${dateFormatter.format(
      new Date(endAt.getTime() - 1),
    )}(토)`,
  };
}

export function countReadingProgressInRange(
  progress: Json,
  range: ActivityWeekRange,
): number {
  return getReadingProgressDailyCounts(progress, range).reduce(
    (total, day) => total + day.readCount,
    0,
  );
}

function addCalendarDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function createWeekdayReadCounts(
  range: ActivityWeekRange,
): ActivityWeekdayReadCount[] {
  return KOREAN_WEEKDAY_LABELS.map((dayLabel, index) => ({
    date: addCalendarDays(range.startDate, index),
    dayLabel,
    readCount: 0,
  }));
}

export function getActivityWeekdayReadCounts(
  dailyCounts: unknown,
  range: ActivityWeekRange,
): ActivityWeekdayReadCount[] {
  const days = createWeekdayReadCounts(range);
  if (
    !dailyCounts ||
    typeof dailyCounts !== "object" ||
    Array.isArray(dailyCounts)
  ) {
    return days;
  }

  for (const day of days) {
    const value = (dailyCounts as Record<string, unknown>)[day.date];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      day.readCount = Math.floor(value);
    }
  }
  return days;
}

export function getReadingProgressDailyCounts(
  progress: Json,
  range: ActivityWeekRange,
): ActivityWeekdayReadCount[] {
  const days = createWeekdayReadCounts(range);

  if (
    !progress ||
    typeof progress !== "object" ||
    Array.isArray(progress) ||
    !Array.isArray(progress.completedVerseKeys) ||
    !progress.completedVerseDetails ||
    typeof progress.completedVerseDetails !== "object" ||
    Array.isArray(progress.completedVerseDetails)
  ) {
    return days;
  }

  const completedVerseKeys = new Set(
    progress.completedVerseKeys.filter(
      (verseKey): verseKey is string => typeof verseKey === "string",
    ),
  );
  const daysByDate = new Map(days.map((day) => [day.date, day]));

  Object.entries(progress.completedVerseDetails).forEach(
    ([verseKey, detail]) => {
      if (
        !completedVerseKeys.has(verseKey) ||
        !detail ||
        typeof detail !== "object" ||
        Array.isArray(detail)
      ) {
        return;
      }

      let completedDate: string | null = null;
      if (
        typeof detail.completedDate === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(detail.completedDate)
      ) {
        completedDate = detail.completedDate;
      } else if (typeof detail.completedAt === "string") {
        const completedAt = new Date(detail.completedAt);
        if (!Number.isNaN(completedAt.getTime())) {
          completedDate = formatKoreanCalendarDate(completedAt);
        }
      }

      if (!completedDate) return;
      const matchingDay = daysByDate.get(completedDate);
      if (matchingDay) matchingDay.readCount++;
    },
  );

  return days;
}
