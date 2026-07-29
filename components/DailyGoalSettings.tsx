"use client";

import { useMemo, useState } from "react";
import { useDailyGoal } from "@/components/DailyGoalProvider";
import { DailyGoalProgressBar } from "@/components/DailyGoalProgressBar";
import {
  DAILY_GOAL_MAX,
  DAILY_GOAL_MIN,
  DEFAULT_DAILY_GOAL_TARGET,
  getKoreanCalendarDate,
} from "@/lib/daily-goal";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function toCalendarDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getMonthCells(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day >= 1 && day <= lastDay ? day : null;
  });
}

export function DailyGoalSettings() {
  const {
    target,
    todayCount,
    achievedToday,
    achievedDates,
    goalStartedDate,
    loading,
    saving,
    error,
    saveTarget,
  } = useDailyGoal();
  const today = getKoreanCalendarDate();
  const todayParts = today.split("-").map(Number);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(todayParts[0], todayParts[1] - 1, 1),
  );
  const [targetInput, setTargetInput] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const cells = useMemo(() => getMonthCells(year, month), [month, year]);
  const progressPercentage = target
    ? Math.min(100, Math.round((todayCount / target) * 100))
    : 0;
  const goalCompletedToday = Boolean(
    target && (achievedToday || todayCount >= target),
  );

  const changeMonth = (offset: number) => {
    setVisibleMonth((current) => {
      const next = new Date(current);
      next.setMonth(next.getMonth() + offset);
      return next;
    });
  };

  const handleSave = async () => {
    const nextTarget = Number(
      targetInput ?? target ?? DEFAULT_DAILY_GOAL_TARGET,
    );
    setSavedMessage("");
    if (
      !Number.isInteger(nextTarget) ||
      nextTarget < DAILY_GOAL_MIN ||
      nextTarget > DAILY_GOAL_MAX
    ) {
      setSavedMessage(
        `${DAILY_GOAL_MIN}~${DAILY_GOAL_MAX}절 사이의 정수를 입력해 주세요.`,
      );
      return;
    }

    if (await saveTarget(nextTarget)) {
      setSavedMessage(`매일 ${nextTarget}절 읽기로 목표를 저장했습니다.`);
    }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
        <p className="text-center text-sm text-muted">
          일일 읽기 목표를 불러오고 있습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          Daily Goal
        </p>
        <h2 className="mt-1 font-serif text-xl font-bold text-foreground">
          일일 읽기 목표
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          하루에 읽을 절 수를 정하고 달성 기록을 이어가 보세요.
        </p>
      </div>

      <form
        className="mt-5 flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <label className="min-w-0 flex-1 text-sm font-semibold text-foreground">
          하루 목표
          <span className="mt-2 flex min-h-12 items-center rounded-xl border border-border bg-background px-4 focus-within:border-amber-700 focus-within:ring-2 focus-within:ring-amber-700/15">
            <input
              type="number"
              inputMode="numeric"
              min={DAILY_GOAL_MIN}
              max={DAILY_GOAL_MAX}
              value={targetInput ?? target ?? DEFAULT_DAILY_GOAL_TARGET}
              onChange={(event) => setTargetInput(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none"
              aria-label="하루 읽기 목표 절 수"
            />
            <span className="ml-2 text-sm text-muted">절</span>
          </span>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-900 disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? "저장 중…" : target ? "변경" : "설정"}
        </button>
      </form>

      {(savedMessage || error) && (
        <p
          role="status"
          className={`mt-3 rounded-xl px-4 py-3 text-sm ${
            error
              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
              : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
          }`}
        >
          {error || savedMessage}
        </p>
      )}

      <div className="mt-6 rounded-2xl bg-surface-muted p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted">오늘 읽은 말씀</p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {todayCount}절
              <span className="ml-1 text-sm font-medium text-muted">
                / {target ?? "-"}절
              </span>
            </p>
          </div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {target ? `${progressPercentage}%` : "목표를 설정해 주세요"}
          </p>
        </div>
        <div className="mt-3">
          <DailyGoalProgressBar
            value={todayCount}
            max={target ?? 0}
            completed={goalCompletedToday}
            label="오늘의 목표 진행률"
          />
        </div>
      </div>

      <div className="mt-7">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full text-xl text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="이전 달"
          >
            ‹
          </button>
          <h3 className="font-semibold text-foreground">
            {year}년 {month + 1}월
          </h3>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full text-xl text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="다음 달"
          >
            ›
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 text-center">
          {WEEKDAYS.map((weekday, index) => (
            <span
              key={weekday}
              className={`py-2 text-xs font-medium ${
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

            const date = toCalendarDate(year, month, day);
            const achieved = achievedDates.has(date);
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
                  className={`relative flex size-9 items-center justify-center rounded-full text-sm ${
                    achieved
                      ? "bg-emerald-500 font-bold text-white shadow-sm"
                      : tracked
                        ? "bg-stone-200 text-stone-500 dark:bg-stone-700 dark:text-stone-300"
                        : "text-muted"
                  } ${isToday ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-surface" : ""}`}
                >
                  {day}
                  {achieved && (
                    <span className="absolute -right-0.5 -bottom-0.5 flex size-3.5 items-center justify-center rounded-full bg-white text-[9px] font-black text-emerald-600 shadow">
                      ✓
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-center gap-5 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-500" />
            목표 달성
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-stone-300 dark:bg-stone-600" />
            미달성
          </span>
        </div>
      </div>
    </section>
  );
}
