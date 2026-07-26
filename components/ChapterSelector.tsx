"use client";

import Link from "next/link";
import type { BibleBook } from "@/lib/bible-api";
import {
  getChapterPronunciationProgress,
  type PronunciationProgressSnapshot,
} from "@/lib/pronunciation-progress";

interface ChapterSelectorProps {
  book: BibleBook;
  currentChapter: number;
  pronunciationProgress: PronunciationProgressSnapshot;
}

export function ChapterSelector({
  book,
  currentChapter,
  pronunciationProgress,
}: ChapterSelectorProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-2">
      {Array.from({ length: book.chapters }, (_, i) => i + 1).map((num) => {
        const isActive = num === currentChapter;
        const progress = getChapterPronunciationProgress(
          pronunciationProgress,
          book.slug,
          num,
        );
        return (
          <Link
            key={num}
            href={`/read/${book.slug}/${num}#verse-1`}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            aria-label={`${num}장, ${progress.completedVerses} / ${
              progress.totalVerses || "?"
            }절 읽기 완료`}
            className="group relative flex size-10 justify-self-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            <svg
              viewBox="0 0 40 40"
              className="absolute inset-0 size-full -rotate-90"
              aria-hidden
            >
              <circle
                cx="20"
                cy="20"
                r="17"
                fill="none"
                strokeWidth="3"
                className={
                  isActive
                    ? "stroke-amber-100 dark:stroke-amber-950"
                    : "stroke-stone-200/80 dark:stroke-stone-700"
                }
              />
              <circle
                cx="20"
                cy="20"
                r="17"
                fill="none"
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset={100 - progress.percentage}
                strokeLinecap="round"
                strokeWidth="3"
                className={`transition-[stroke-dashoffset,opacity] duration-500 ${
                  progress.percentage === 0
                    ? "opacity-0"
                    : progress.isComplete
                    ? "stroke-emerald-500"
                    : "stroke-amber-700"
                }`}
              />
            </svg>
            <span
              className={`absolute inset-[5px] flex items-center justify-center rounded-full font-medium leading-none transition-colors ${
                num >= 100 ? "text-[10px]" : "text-xs"
              } ${
                isActive && progress.isComplete
                  ? "bg-emerald-600 text-white"
                  : isActive
                    ? "bg-amber-800 text-white"
                    : "bg-white text-stone-600 group-hover:bg-amber-50 group-hover:text-amber-900"
              }`}
            >
              {num}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
