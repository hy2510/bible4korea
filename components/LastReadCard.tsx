"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ChevronRightIcon } from "@/components/ChevronIcons";
import {
  featuredBodyClassName,
  featuredLabelClassName,
  featuredPanelClassName,
} from "@/lib/featured-panel";
import { getBookSync } from "@/lib/bible-books";
import { stripKoreanBibleQuotes } from "@/lib/korean-verse-text";
import {
  formatLastReadReference,
  getLastReadChapters,
  getLastReadHref,
  getServerLastReadChapters,
  subscribeToLastReadChapters,
  type LastReadChapter,
} from "@/lib/last-read";
import {
  getPronunciationProgressSnapshot,
  getRecentCompletedPronunciationVerses,
  getServerPronunciationProgressSnapshot,
  subscribeToPronunciationProgress,
  type CompletedPronunciationVerse,
} from "@/lib/pronunciation-progress";

type HistoryTab = "viewed" | "read";

function getReference(record: CompletedPronunciationVerse): string {
  const bookName = getBookSync(record.bookSlug)?.name ?? record.bookSlug;
  return `${bookName} ${record.chapter}장 ${record.verseNum}절`;
}

function getHref(record: CompletedPronunciationVerse): string {
  return `/read/${record.bookSlug}/${record.chapter}#verse-${record.verseNum}`;
}

function formatViewedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function LoggedOutHistoryPrompt() {
  return (
    <div className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center dark:border-stone-700">
      <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        로그인하면 최근 본 말씀과 최근 읽은 말씀 기록을 확인하고 동기화할 수
        있습니다.
      </p>
      <Link
        href="/login"
        className="mt-4 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-900"
      >
        로그인
      </Link>
    </div>
  );
}

function renderViewedHistory(lastReadList: LastReadChapter[]) {
  if (lastReadList.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
        최근 본 말씀 기록이 없습니다.
      </p>
    );
  }

  const [latest, ...rest] = lastReadList;

  return (
    <>
      <div className={`${featuredPanelClassName} py-5 px-4 sm:p-5`}>
        <p className={`${featuredLabelClassName} uppercase tracking-wider`}>
          가장 최근
        </p>
        <h2 className="mt-1 font-serif text-xl font-bold text-stone-900 dark:text-stone-100 sm:text-2xl">
          {formatLastReadReference(latest)}
        </h2>
        {latest.koreanText && (
          <blockquote
            className={`mt-3 text-base sm:text-lg ${featuredBodyClassName}`}
          >
            &ldquo;{stripKoreanBibleQuotes(latest.koreanText)}&rdquo;
          </blockquote>
        )}
        {latest.readAt && (
          <p className="mt-2 text-sm text-stone-500">
            {formatViewedAt(latest.readAt)}
          </p>
        )}
        <Link
          href={getLastReadHref(latest)}
          className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
        >
          이어서 보기
        </Link>
      </div>

      {rest.length > 0 && (
        <ul className="mt-4">
          {rest.map((item, index) => (
            <li
              key={`${item.bookSlug}-${item.chapter}`}
              className={
                index === 0 ? undefined : "last-read-item-divider border-t"
              }
            >
              <Link
                href={getLastReadHref(item)}
                className="block cursor-pointer py-3 transition-colors hover:text-amber-900 dark:hover:text-amber-400"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1 font-medium text-stone-800 dark:text-stone-200">
                    {formatLastReadReference(item)}
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400" />
                  </span>
                  <span className="shrink-0 text-xs text-stone-400">
                    {formatViewedAt(item.readAt)}
                  </span>
                </div>
                {item.koreanText && (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-stone-500">
                    {stripKoreanBibleQuotes(item.koreanText)}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function renderReadHistory(recentReadVerses: CompletedPronunciationVerse[]) {
  if (recentReadVerses.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
        소리 내어 읽기를 완료한 말씀이 없습니다.
      </p>
    );
  }

  const [latest, ...rest] = recentReadVerses;

  return (
    <>
      <div className={`${featuredPanelClassName} py-5 px-4 sm:p-5`}>
        <p className={`${featuredLabelClassName} uppercase tracking-wider`}>
          가장 최근
        </p>
        <h2 className="mt-1 font-serif text-xl font-bold text-stone-900 dark:text-stone-100 sm:text-2xl">
          {getReference(latest)}
        </h2>
        {latest.koreanText && (
          <blockquote
            className={`mt-3 text-base sm:text-lg ${featuredBodyClassName}`}
          >
            &ldquo;{stripKoreanBibleQuotes(latest.koreanText)}&rdquo;
          </blockquote>
        )}
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {latest.completedAt
              ? formatViewedAt(latest.completedAt)
              : "이전 완료 기록"}
          </p>
          <p className="shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            ✓ 소리 내어 읽기 완료
          </p>
        </div>
        <Link
          href={getHref(latest)}
          className="mt-4 inline-flex cursor-pointer items-center rounded-xl bg-amber-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-900"
        >
          말씀 보기
        </Link>
      </div>

      {rest.length > 0 && (
        <ul className="mt-4">
          {rest.map((item, index) => (
            <li
              key={`${item.bookSlug}-${item.chapter}-${item.verseNum}`}
              className={
                index === 0 ? undefined : "last-read-item-divider border-t"
              }
            >
              <Link
                href={getHref(item)}
                className="block cursor-pointer py-3 transition-colors hover:text-amber-900 dark:hover:text-amber-400"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="inline-flex items-center gap-1 font-medium text-stone-800 dark:text-stone-200">
                    {getReference(item)}
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400" />
                  </span>
                  <span className="shrink-0 text-xs text-stone-400">
                    {item.completedAt
                      ? formatViewedAt(item.completedAt)
                      : "이전 완료 기록"}
                  </span>
                </div>
                {item.koreanText && (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                    {stripKoreanBibleQuotes(item.koreanText)}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function LastReadCard() {
  const { user, loading } = useAuth();
  const lastReadList = useSyncExternalStore(
    subscribeToLastReadChapters,
    getLastReadChapters,
    getServerLastReadChapters,
  );
  const pronunciationProgress = useSyncExternalStore(
    subscribeToPronunciationProgress,
    getPronunciationProgressSnapshot,
    getServerPronunciationProgressSnapshot,
  );
  const recentReadVerses = getRecentCompletedPronunciationVerses(
    pronunciationProgress,
  );
  const [selectedTab, setSelectedTab] = useState<HistoryTab>("viewed");

  if (loading) return null;

  return (
    <section className="mb-13 rounded-2xl border border-stone-200/80 bg-white py-6 px-4 dark:border-stone-800 dark:bg-stone-900/60 sm:p-8">
      <div
        role="tablist"
        aria-label="말씀 기록"
        className="mb-5 grid grid-cols-2 rounded-xl bg-stone-100 p-1 dark:bg-stone-950/50"
      >
        <button
          type="button"
          role="tab"
          id="history-tab-viewed"
          aria-selected={selectedTab === "viewed"}
          aria-controls="history-panel-viewed"
          onClick={() => setSelectedTab("viewed")}
          className={`min-h-10 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            selectedTab === "viewed"
              ? "bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-100"
              : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
          }`}
        >
          최근 본 말씀
        </button>
        <button
          type="button"
          role="tab"
          id="history-tab-read"
          aria-selected={selectedTab === "read"}
          aria-controls="history-panel-read"
          onClick={() => setSelectedTab("read")}
          className={`min-h-10 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            selectedTab === "read"
              ? "bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-100"
              : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
          }`}
        >
          최근 읽은 말씀
        </button>
      </div>

      <div
        role="tabpanel"
        id="history-panel-viewed"
        aria-labelledby="history-tab-viewed"
        hidden={selectedTab !== "viewed"}
        tabIndex={0}
      >
        {user ? renderViewedHistory(lastReadList) : <LoggedOutHistoryPrompt />}
      </div>
      <div
        role="tabpanel"
        id="history-panel-read"
        aria-labelledby="history-tab-read"
        hidden={selectedTab !== "read"}
        tabIndex={0}
      >
        {user ? renderReadHistory(recentReadVerses) : <LoggedOutHistoryPrompt />}
      </div>
    </section>
  );
}
