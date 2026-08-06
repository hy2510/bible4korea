"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ChevronRightIcon } from "@/components/ChevronIcons";
import {
  featuredBodyClassName,
  featuredLabelClassName,
  featuredPanelClassName,
  homeSectionTitleClassName,
} from "@/lib/featured-panel";
import { stripKoreanBibleQuotes } from "@/lib/korean-verse-text";
import {
  formatLastReadReference,
  getLastReadChapters,
  getLastReadHref,
  getServerLastReadChapters,
  subscribeToLastReadChapters,
  type LastReadChapter,
} from "@/lib/last-read";

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
        로그인하면 살펴본 말씀 기록을 확인하고 동기화할 수 있습니다.
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
        살펴본 말씀 기록이 없습니다.
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

export function LastReadCard() {
  const { user, loading } = useAuth();
  const lastReadList = useSyncExternalStore(
    subscribeToLastReadChapters,
    getLastReadChapters,
    getServerLastReadChapters,
  );

  if (loading) return null;

  return (
    <section className="mb-13 rounded-2xl border border-stone-200/80 bg-white py-6 px-4 dark:border-stone-800 dark:bg-stone-900/60 sm:p-8">
      <h2 className={`mb-5 ${homeSectionTitleClassName}`}>
        살펴본 말씀
      </h2>
      {user ? renderViewedHistory(lastReadList) : <LoggedOutHistoryPrompt />}
    </section>
  );
}
