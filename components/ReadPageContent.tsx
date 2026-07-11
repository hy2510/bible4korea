"use client";

import { useEffect, useState } from "react";
import { BookSelector } from "@/components/BookSelector";
import { ChapterReader } from "@/components/ChapterReader";
import { ChapterSelector } from "@/components/ChapterSelector";
import { fetchChapter } from "@/lib/bible-api-browser";
import type { BibleBook, GreekWord, HebrewWord } from "@/lib/bible-api";
import type { ChapterVerse } from "@/lib/verse-types";

interface MorphologyResponse {
  hebrewWordVerses: HebrewWord[][] | null;
  greekWordVerses: GreekWord[][] | null;
}

interface ReadPageContentProps {
  books: BibleBook[];
  book: BibleBook;
  chapterNum: number;
  highlightStrongs?: string;
  jumpFromSearch?: boolean;
}

export function ReadPageContent({
  books,
  book,
  chapterNum,
  highlightStrongs,
  jumpFromSearch,
}: ReadPageContentProps) {
  const [verses, setVerses] = useState<ChapterVerse[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setVerses(null);
      setError(false);

      try {
        const chapterData = await fetchChapter(book.slug, chapterNum);

        let morphology: MorphologyResponse = {
          hebrewWordVerses: null,
          greekWordVerses: null,
        };

        try {
          const morphologyRes = await fetch(
            `/api/morphology/${book.slug}/${chapterNum}`,
          );
          if (morphologyRes.ok) {
            morphology = (await morphologyRes.json()) as MorphologyResponse;
          }
        } catch {
          // 원어 데이터 없이도 한글 본문은 표시합니다.
        }

        if (cancelled) return;

        setVerses(
          chapterData.verses.map((text: string, index: number) => ({
            verseNum: index + 1,
            korean: text,
            hebrewWords: morphology.hebrewWordVerses?.[index],
            greekWords: morphology.greekWordVerses?.[index],
          })),
        );
      } catch {
        if (!cancelled) setError(true);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [book.slug, chapterNum]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-nowrap items-center justify-between gap-3">
        <BookSelector books={books} currentBookSlug={book.slug} />
        <p className="shrink-0 whitespace-nowrap text-sm text-stone-500">
          {chapterNum} / {book.chapters}장
        </p>
      </div>

      <section className="mb-8">
        <ChapterSelector book={book} currentChapter={chapterNum} />
      </section>

      <article className="mb-[50vh] rounded-2xl border border-stone-200/80 bg-white py-6 px-4 sm:p-10">
        <header className="mb-8 border-b border-stone-100 pb-6 text-center">
          <h1 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
            {book.name}
          </h1>
          <p className="mt-1 text-lg text-amber-800">{chapterNum}장</p>
        </header>

        {error && (
          <p className="py-12 text-center text-stone-500">
            본문을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        )}

        {!error && !verses && (
          <p className="py-12 text-center text-stone-400">본문 불러오는 중…</p>
        )}

        {verses && (
          <ChapterReader
            book={book}
            bookSlug={book.slug}
            bookName={book.name}
            chapter={chapterNum}
            verses={verses}
            highlightStrongs={highlightStrongs}
            jumpFromSearch={jumpFromSearch}
          />
        )}
      </article>
    </div>
  );
}
