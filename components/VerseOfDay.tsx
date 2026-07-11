"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchVerseOfDay } from "@/lib/bible-api-browser";
import { resolveBookSlugSync } from "@/lib/bible-books";
import {
  featuredBodyClassName,
  featuredLabelClassName,
  featuredLinkClassName,
  featuredPanelClassName,
} from "@/lib/featured-panel";
import type { VerseOfDay } from "@/lib/verse-of-day";

const verseOfDaySectionClassName = `mb-13 ${featuredPanelClassName} p-6 sm:p-8`;

function VerseOfDaySkeleton() {
  return (
    <section className={verseOfDaySectionClassName}>
      <p className={`mb-3 uppercase tracking-wider ${featuredLabelClassName}`}>
        오늘의 말씀
      </p>
      <div className="h-16 animate-pulse rounded-lg bg-amber-100/60 dark:bg-stone-800/60" />
    </section>
  );
}

export function VerseOfDay() {
  const [verse, setVerse] = useState<VerseOfDay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerseOfDay()
      .then((data) => setVerse(data))
      .catch(() => setVerse(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <VerseOfDaySkeleton />;
  if (!verse) return null;

  const bookSlug = resolveBookSlugSync(verse.bookSlug) ?? verse.bookSlug;

  return (
    <section className={verseOfDaySectionClassName}>
      <p className={`mb-3 uppercase tracking-wider ${featuredLabelClassName}`}>
        오늘의 말씀
      </p>
      <blockquote className={`text-lg sm:text-xl ${featuredBodyClassName}`}>
        &ldquo;{verse.text}&rdquo;
      </blockquote>
      <footer className="mt-4 flex items-center justify-between">
        <cite className="not-italic text-sm font-medium text-stone-900">
          {verse.reference}
        </cite>
        <Link
          href={`/read/${bookSlug}/${verse.chapter}#verse-${verse.verse}`}
          className={featuredLinkClassName}
        >
          본문 보기
        </Link>
      </footer>
    </section>
  );
}
