"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import type { BibleBook } from "@/lib/bible-api";
import {
  getBookPronunciationProgress,
  getPronunciationProgressSnapshot,
  getServerPronunciationProgressSnapshot,
  subscribeToPronunciationProgress,
} from "@/lib/pronunciation-progress";

interface BookGridProps {
  books: BibleBook[];
  bibleVerseCounts: Record<string, number>;
  title: string;
}

export function BookGrid({
  books,
  bibleVerseCounts,
  title,
}: BookGridProps) {
  const { user } = useAuth();
  const pronunciationProgress = useSyncExternalStore(
    subscribeToPronunciationProgress,
    getPronunciationProgressSnapshot,
    getServerPronunciationProgressSnapshot,
  );

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-stone-500 dark:text-stone-400">
        {title}
      </h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {books.map((book) => {
          const progress = getBookPronunciationProgress(
            pronunciationProgress,
            book.slug,
            bibleVerseCounts[book.slug] ?? 0,
          );

          return (
            <Link
              key={book.id}
              href={`/read/${book.slug}/1?from=book-list`}
              scroll={false}
              aria-label={
                user
                  ? `${book.name}, 소리 내어 읽기 ${progress.percentage}%`
                  : book.name
              }
              className="group flex cursor-pointer flex-col items-center rounded-xl border border-stone-200/80 bg-white px-2 py-3 transition-all hover:border-amber-300 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900/60 dark:hover:border-amber-700"
            >
              <span className="text-base font-semibold text-stone-800 group-hover:text-amber-900 dark:text-stone-100 dark:group-hover:text-amber-300">
                {book.abbrev}
              </span>
              <span className="mt-0.5 truncate text-[11px] text-stone-500 dark:text-stone-400">
                {book.name}
              </span>
              {user && (
                <span className="mt-2 block w-full max-w-20">
                  <span
                    role="progressbar"
                    aria-label={`${book.name} 소리 내어 읽기 진행률`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress.percentage}
                    className="block h-1 overflow-hidden rounded-full bg-stone-100 dark:bg-black/40"
                  >
                    <span
                      className={`block h-full rounded-full transition-[width] duration-500 ${
                        progress.isComplete
                          ? "bg-emerald-500"
                          : "bg-amber-700"
                      }`}
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </span>
                  <span
                    className={`mt-1 block text-center text-[10px] tabular-nums ${
                      progress.isComplete
                        ? "font-semibold text-emerald-700 dark:text-emerald-400"
                        : "text-stone-400 dark:text-stone-500"
                    }`}
                  >
                    읽기 {progress.percentage}%
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
