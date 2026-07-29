"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useDailyGoal } from "@/components/DailyGoalProvider";
import {
  getPronunciationProgressSnapshot,
  getRecentCompletedPronunciationVerses,
  getServerPronunciationProgressSnapshot,
  subscribeToPronunciationProgress,
} from "@/lib/pronunciation-progress";
import { featuredLinkClassName } from "@/lib/featured-panel";

const DAILY_GOAL_COMPLIMENTS = [
  "오늘도 잘했어요!",
  "오늘도 멋지게 해냈어요!",
  "말씀과 함께한 오늘이 빛나요!",
  "꾸준한 실천이 정말 멋져요!",
  "오늘의 목표 달성을 축하해요!",
  "한 걸음 더 성장했어요!",
  "오늘도 말씀을 가까이했어요!",
  "귀한 습관을 잘 이어가고 있어요!",
  "끝까지 해낸 오늘을 칭찬해요!",
  "오늘도 참 잘했어요!",
] as const;

function formatToday() {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function getDailyCompliment(userId: string) {
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const seed = `${userId}:${dateKey}`;
  const index = Array.from(seed).reduce(
    (total, character) => total + (character.codePointAt(0) ?? 0),
    0,
  );
  return DAILY_GOAL_COMPLIMENTS[index % DAILY_GOAL_COMPLIMENTS.length];
}

export function HomeDailyGoalCard() {
  const { user, loading: authLoading } = useAuth();
  const pronunciationProgress = useSyncExternalStore(
    subscribeToPronunciationProgress,
    getPronunciationProgressSnapshot,
    getServerPronunciationProgressSnapshot,
  );
  const {
    target,
    todayCount,
    achievedToday,
    loading: goalLoading,
  } = useDailyGoal();

  if (authLoading || (user && goalLoading)) {
    return (
      <section
        className="mb-13 h-40 animate-pulse rounded-2xl border border-stone-200/80 bg-stone-100 dark:border-stone-800 dark:bg-stone-800/60"
        aria-label="일일 읽기 목표 현황을 불러오는 중"
      />
    );
  }

  if (!user) return null;

  const percentage = target
    ? Math.min(100, Math.round((todayCount / target) * 100))
    : 0;
  const completed = achievedToday || Boolean(target && todayCount >= target);
  const latestReadPosition = getRecentCompletedPronunciationVerses(
    pronunciationProgress,
    1,
  )[0];
  const startHref = latestReadPosition
    ? `/read/${latestReadPosition.bookSlug}/${latestReadPosition.chapter}?practice=1#verse-${latestReadPosition.verseNum}`
    : "/read/genesis/1?practice=1#verse-1";
  const startLabel = completed
    ? "계속 읽기"
    : todayCount > 0
      ? "이어서 읽기"
      : "읽기 시작";
  const completedMessage = getDailyCompliment(user.id);
  const handleStartReading = () => {
    window.location.assign(startHref);
  };

  return (
    <section
      aria-labelledby="home-daily-goal-title"
      className="mb-13 rounded-2xl border border-stone-200/80 bg-white px-4 py-6 dark:border-stone-800 dark:bg-stone-900/60 sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            {formatToday()}
          </p>
          <h2
            id="home-daily-goal-title"
            className="mt-1 font-serif text-base font-bold text-stone-900 dark:text-stone-100 sm:text-lg"
          >
            일일 읽기 목표
          </h2>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            completed
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
          }`}
        >
          {completed ? "오늘 목표 달성" : "진행 중"}
        </span>
      </div>

      {target ? (
        <>
          <div className="mt-6 flex items-end justify-between gap-4">
            <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {todayCount}
              <span className="ml-1 text-sm font-medium text-stone-500 dark:text-stone-400">
                / {target}절
              </span>
            </p>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {percentage}%
            </p>
          </div>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
            role="progressbar"
            aria-label="오늘의 일일 읽기 목표 진행률"
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={Math.min(todayCount, target)}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${
                completed ? "bg-emerald-500" : "bg-amber-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {completed
                ? completedMessage
                : `목표까지 ${Math.max(target - todayCount, 0)}절 남았어요.`}
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/profile"
                className={featuredLinkClassName}
              >
                목표 관리
              </Link>
              <button
                type="button"
                onClick={handleStartReading}
                className="inline-flex cursor-pointer items-center rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
              >
                {startLabel}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-stone-50 px-4 py-4 dark:bg-stone-800/60">
          <p className="text-sm text-stone-600 dark:text-stone-300">
            매일 읽을 목표 절 수를 설정해 보세요.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/profile"
              className="cursor-pointer rounded-lg border border-amber-800/25 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
            >
              목표 설정
            </Link>
            <button
              type="button"
              onClick={handleStartReading}
              className="inline-flex cursor-pointer items-center rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
            >
              {startLabel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
