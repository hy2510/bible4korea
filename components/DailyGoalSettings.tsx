"use client";

import { useState } from "react";
import { DailyGoalAchievementCalendar } from "@/components/DailyGoalAchievementCalendar";
import { useDailyGoal } from "@/components/DailyGoalProvider";
import { DailyGoalProgressBar } from "@/components/DailyGoalProgressBar";
import {
  DAILY_GOAL_MAX,
  DAILY_GOAL_MIN,
  DEFAULT_DAILY_GOAL_TARGET,
} from "@/lib/daily-goal";

export function DailyGoalSettings() {
  const {
    target,
    todayCount,
    achievedDates,
    achievedToday,
    goalStartedDate,
    loading,
    saving,
    error,
    saveTarget,
  } = useDailyGoal();
  const [targetInput, setTargetInput] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const progressPercentage = target
    ? Math.min(100, Math.round((todayCount / target) * 100))
    : 0;
  const goalCompletedToday = Boolean(
    target && (achievedToday || todayCount >= target),
  );

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
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <p className="text-center text-sm text-muted">
          일일 읽기 목표를 불러오고 있습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
      <div>
        <h2 className="font-serif text-xl font-bold text-foreground">
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

      <DailyGoalAchievementCalendar
        achievementDates={achievedDates}
        goalStartedDate={goalStartedDate}
      />
    </section>
  );
}
