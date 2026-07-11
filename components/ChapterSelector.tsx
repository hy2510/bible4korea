"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BibleBook } from "@/lib/bible-api";

interface ChapterSelectorProps {
  book: BibleBook;
  currentChapter: number;
}

export function ChapterSelector({
  book,
  currentChapter,
}: ChapterSelectorProps) {
  const pathname = usePathname();

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1.5">
      {Array.from({ length: book.chapters }, (_, i) => i + 1).map((num) => {
        const isActive = num === currentChapter;
        return (
          <Link
            key={num}
            href={`/read/${book.slug}/${num}`}
            scroll={pathname !== `/read/${book.slug}/${num}`}
            className={`flex h-9 w-full min-w-0 items-center justify-center rounded-lg text-sm transition-colors ${
              isActive
                ? "bg-amber-800 font-medium text-white"
                : "border border-stone-200/80 bg-white text-stone-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
            }`}
          >
            {num}
          </Link>
        );
      })}
    </div>
  );
}
