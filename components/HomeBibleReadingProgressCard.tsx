"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DailyGoalProgressBar } from "@/components/DailyGoalProgressBar";
import { useReadingAchievements } from "@/components/ReadingAchievementProvider";
import { getBooksSync } from "@/lib/bible-books";
import {
  getBibleReadingRoundProgress,
} from "@/lib/reading-achievements";
import {
  getPronunciationProgressSnapshot,
  getServerPronunciationProgressSnapshot,
  subscribeToPronunciationProgress,
} from "@/lib/pronunciation-progress";

interface HomeBibleReadingProgressCardProps {
  bibleVerseCounts: Record<string, number>;
}

const BIBLE_BOOKS = getBooksSync();

export function HomeBibleReadingProgressCard({
  bibleVerseCounts,
}: HomeBibleReadingProgressCardProps) {
  const { user, loading: authLoading } = useAuth();
  const {
    bookCompletionCounts,
    bibleAchievements,
    loading: achievementLoading,
  } = useReadingAchievements();
  const pronunciationProgress = useSyncExternalStore(
    subscribeToPronunciationProgress,
    getPronunciationProgressSnapshot,
    getServerPronunciationProgressSnapshot,
  );
  const progress = useMemo(
    () =>
      getBibleReadingRoundProgress(
        pronunciationProgress,
        BIBLE_BOOKS,
        bibleVerseCounts,
        bookCompletionCounts,
        bibleAchievements,
      ),
    [
      bibleAchievements,
      bibleVerseCounts,
      bookCompletionCounts,
      pronunciationProgress,
    ],
  );

  if (authLoading || (user && achievementLoading)) {
    return (
      <section
        className="h-36 animate-pulse bg-stone-100 dark:bg-stone-800/60"
        aria-label="성경 통독 진행률을 불러오는 중"
      />
    );
  }

  if (!user || !progress.ready) return null;

  return (
    <section
      aria-labelledby="home-bible-reading-progress-title"
      className="px-4 py-6 sm:p-8"
    >
      <div>
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          통독 진행
        </p>
        <h2
          id="home-bible-reading-progress-title"
          className="mt-1 font-serif text-base font-bold text-stone-900 dark:text-stone-100 sm:text-lg"
        >
          성경 {progress.targetCompletionCount}독까지
        </h2>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
          {progress.remainingVerses.toLocaleString("ko-KR")}
          <span className="ml-1 text-sm font-medium text-stone-500 dark:text-stone-400">
            절 남았어요
          </span>
        </p>
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          {progress.percentage}%
        </p>
      </div>

      <div className="mt-3">
        <DailyGoalProgressBar
          value={progress.completedVerses}
          max={progress.totalVerses}
          completed={progress.remainingVerses === 0}
          label={`성경 ${progress.targetCompletionCount}독 진행률`}
          size="md"
          trackClassName="bg-stone-100 dark:bg-stone-800"
        />
      </div>

      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
        {progress.completedVerses.toLocaleString("ko-KR")} /{" "}
        {progress.totalVerses.toLocaleString("ko-KR")}절
      </p>
    </section>
  );
}
