"use client";

import { useMemo, useState } from "react";
import { getKoreanCalendarDate } from "@/lib/daily-goal";

const CALENDAR_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function toCalendarDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getMonthCells(year: number, month: number) {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day >= 1 && day <= lastDay ? day : null;
  });
}

function getCurrentKoreanYearMonth() {
  const [year, month] = getKoreanCalendarDate().split("-").map(Number);
  return { year, month: month - 1 };
}

export function DailyGoalAchievementCalendar({
  achievementDates,
  goalStartedDate,
}: {
  achievementDates: ReadonlySet<string>;
  goalStartedDate: string | null;
}) {
  const [visibleMonth, setVisibleMonth] = useState(
    getCurrentKoreanYearMonth,
  );
  const cells = useMemo(
    () => getMonthCells(visibleMonth.year, visibleMonth.month),
    [visibleMonth],
  );
  const today = getKoreanCalendarDate();

  const changeMonth = (offset: number) => {
    setVisibleMonth((current) => {
      const nextMonth = new Date(
        Date.UTC(current.year, current.month + offset, 1),
      );
      return {
        year: nextMonth.getUTCFullYear(),
        month: nextMonth.getUTCMonth(),
      };
    });
  };

  return (
    <div className="mt-7 border-t border-border pt-6">
      <h3 className="text-base font-bold text-foreground">
        일일 목표 달성 달력
      </h3>
      <div className="mt-3 rounded-2xl bg-sky-50/55 py-2 dark:bg-sky-950/15">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full text-xl text-muted"
            aria-label="이전 달"
          >
            ‹
          </button>
          <p className="text-sm font-semibold text-foreground">
            {visibleMonth.year}년 {visibleMonth.month + 1}월
          </p>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full text-xl text-muted"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>

        <div className="mt-2 grid grid-cols-7 text-center">
          {CALENDAR_WEEKDAYS.map((weekday, index) => (
            <span
              key={weekday}
              className={`py-2 text-xs font-semibold ${
                index === 0
                  ? "text-rose-500"
                  : index === 6
                    ? "text-blue-500"
                    : "text-muted"
              }`}
            >
              {weekday}
            </span>
          ))}
          {cells.map((day, index) => {
            if (day === null) {
              return <span key={`empty-${index}`} className="aspect-square" />;
            }

            const date = toCalendarDate(
              visibleMonth.year,
              visibleMonth.month,
              day,
            );
            const achieved = achievementDates.has(date);
            const tracked =
              Boolean(goalStartedDate) &&
              date >= (goalStartedDate ?? "") &&
              date <= today;
            const isToday = date === today;

            return (
              <div
                key={date}
                className="flex aspect-square items-center justify-center p-0.5"
                title={
                  achieved
                    ? `${date} 목표 달성`
                    : tracked
                      ? `${date} 미달성`
                      : date
                }
              >
                <span
                  className={`flex size-9 items-center justify-center rounded-full text-sm ${
                    achieved
                      ? "bg-emerald-500 font-bold text-white"
                      : tracked
                        ? "bg-stone-100 text-stone-400 dark:bg-stone-800/70 dark:text-stone-500"
                        : "font-medium text-stone-600 dark:text-stone-300"
                  } ${
                    isToday
                      ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-white dark:ring-offset-stone-900"
                      : ""
                  }`}
                >
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-6 text-xs font-medium text-muted">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-emerald-500" />
          목표 달성
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-full bg-stone-200 dark:bg-stone-700" />
          미달성
        </span>
      </div>
    </div>
  );
}
