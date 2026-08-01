import Link from "next/link";
import type { BibleBook } from "@/lib/bible-types";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ChevronIcons";

interface ChapterNavProps {
  book: BibleBook;
  chapter: number;
  className?: string;
}

export function ChapterNav({ book, chapter, className = "" }: ChapterNavProps) {
  const hasPrev = chapter > 1;
  const hasNext = chapter < book.chapters;

  const linkClassName =
    "inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 transition-colors hover:border-amber-300 hover:text-amber-900 sm:px-4";

  const spacerClassName = "w-10 sm:w-[5.5rem]";

  return (
    <nav
      className={`flex items-center justify-between gap-3 ${className}`.trim()}
    >
      {hasPrev ? (
        <Link
          href={`/read/${book.slug}/${chapter - 1}`}
          className={linkClassName}
          aria-label={`${chapter - 1}장`}
        >
          <ChevronLeftIcon />
          <span className="hidden sm:inline">{chapter - 1}장</span>
        </Link>
      ) : (
        <span className={spacerClassName} aria-hidden />
      )}

      <span className="text-center text-sm text-stone-500">
        {chapter} / {book.chapters}장
      </span>

      {hasNext ? (
        <Link
          href={`/read/${book.slug}/${chapter + 1}`}
          className={linkClassName}
          aria-label={`${chapter + 1}장`}
        >
          <span className="hidden sm:inline">{chapter + 1}장</span>
          <ChevronRightIcon />
        </Link>
      ) : (
        <span className={spacerClassName} aria-hidden />
      )}
    </nav>
  );
}
