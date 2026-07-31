"use client";

import Link from "next/link";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useDailyGoal } from "@/components/DailyGoalProvider";
import {
  getPronunciationProgressSnapshot,
  getRecentCompletedPronunciationVerses,
  getServerPronunciationProgressSnapshot,
  subscribeToPronunciationProgress,
} from "@/lib/pronunciation-progress";
import {
  getBiblePracticeHref,
  getNextUnreadBibleReadingPosition,
} from "@/lib/reading-navigation";
import { getBookSync } from "@/lib/bible-books";
import {
  homeSectionMetaLabelClassName,
  homeSectionTitleClassName,
} from "@/lib/featured-panel";
import { DailyGoalProgressBar } from "@/components/DailyGoalProgressBar";

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

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  );
}

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
    replayCelebration,
  } = useDailyGoal();

  if (authLoading || (user && goalLoading)) {
    return (
      <section
        className="h-40 animate-pulse bg-stone-100 dark:bg-stone-800/60"
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
  const startPosition = latestReadPosition
    ? getNextUnreadBibleReadingPosition(
        pronunciationProgress,
        latestReadPosition,
      )
    : {
        bookSlug: "genesis",
        chapter: 1,
        verseNum: 1,
      };
  const startHref = getBiblePracticeHref(startPosition);
  const startLabel = completed
    ? "계속 읽기"
    : todayCount > 0
      ? "이어서 읽기"
      : "읽기 시작";
  const startBookAbbreviation =
    getBookSync(startPosition.bookSlug)?.abbrev ?? startPosition.bookSlug;
  const startButtonLabel = `${startBookAbbreviation} ${startPosition.chapter}:${startPosition.verseNum} ${startLabel}`;
  const completedMessage = getDailyCompliment(user.id);
  const handleStartReading = () => {
    window.location.assign(startHref);
  };

  return (
    <section
      aria-labelledby="home-daily-goal-title"
      className="px-4 py-6 sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={homeSectionMetaLabelClassName}>{formatToday()}</p>
          <div className="flex items-center gap-1">
            <h2
              id="home-daily-goal-title"
              className={homeSectionTitleClassName}
            >
              일일 읽기 목표
            </h2>
            <Link
              href="/profile"
              aria-label="일일 읽기 목표 관리"
              title="일일 읽기 목표 관리"
              className="mt-1 flex size-7 cursor-pointer items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-500 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
            >
              <SettingsIcon />
            </Link>
          </div>
        </div>
        {completed ? (
          <button
            type="button"
            onClick={replayCelebration}
            aria-label="오늘 목표 달성 축하 다시 보기"
            title="목표 달성 축하 다시 보기"
            className="inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition-[background-color,transform] hover:scale-[1.03] hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
          >
            <Image
              src="/images/party-popper.png"
              alt=""
              aria-hidden
              width={16}
              height={16}
              className="size-4 object-contain"
            />
            오늘 목표 달성
          </button>
        ) : (
          <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            진행 중
          </span>
        )}
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
          <div className="mt-3">
            <DailyGoalProgressBar
              value={todayCount}
              max={target}
              completed={completed}
              label="오늘의 일일 읽기 목표 진행률"
              size="md"
              trackClassName="bg-stone-100 dark:bg-stone-800"
            />
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {completed
                ? completedMessage
                : `목표까지 ${Math.max(target - todayCount, 0)}절 남았어요.`}
            </p>
            <button
              type="button"
              onClick={handleStartReading}
              className="inline-flex shrink-0 cursor-pointer items-center rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
            >
              {startButtonLabel}
            </button>
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
              {startButtonLabel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
