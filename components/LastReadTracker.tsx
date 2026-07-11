"use client";

import { useEffect } from "react";
import { getVerseFromHash } from "@/lib/verse-hash";
import { saveLastReadChapter } from "@/lib/last-read";

interface LastReadTrackerProps {
  bookSlug: string;
  bookName: string;
  chapter: number;
  firstVerseText: string;
}

export function LastReadTracker({
  bookSlug,
  bookName,
  chapter,
  firstVerseText,
}: LastReadTrackerProps) {
  useEffect(() => {
    if (getVerseFromHash()) return;

    saveLastReadChapter(bookSlug, bookName, chapter, 1, firstVerseText);
  }, [bookSlug, bookName, chapter, firstVerseText]);

  return null;
}
