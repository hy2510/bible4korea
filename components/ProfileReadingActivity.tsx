"use client";

import {
  ActivitySummaryContent,
  ActivitySummarySkeleton,
} from "@/components/ActivitySummaryContent";
import { useActivityRankingUserSummary } from "@/components/useActivityRankingUserSummary";

export function ProfileReadingActivity({ username }: { username: string }) {
  const { summary, error } = useActivityRankingUserSummary(username);

  return (
    <section
      aria-labelledby="profile-reading-activity-title"
      className="rounded-2xl border border-border bg-surface p-5 sm:p-7"
    >
      <h2
        id="profile-reading-activity-title"
        className="font-serif text-xl font-bold text-foreground"
      >
        말씀 읽기 활동
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        이번주 읽기와 지금까지 쌓은 말씀 활동을 확인해 보세요.
      </p>

      <div className="mt-5">
        {!summary && !error && <ActivitySummarySkeleton />}
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-8 text-center text-sm leading-6 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
          >
            {error}
          </p>
        )}
        {summary && <ActivitySummaryContent summary={summary} />}
      </div>
    </section>
  );
}
