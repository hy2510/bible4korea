"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { BookSelector } from "@/components/BookSelector";
import { ChapterReader } from "@/components/ChapterReader";
import { ChapterSelector } from "@/components/ChapterSelector";
import { fetchChapter } from "@/lib/bible-api-browser";
import type { BibleBook, GreekWord, HebrewWord } from "@/lib/bible-api";
import {
  getChapterPronunciationProgress,
  getPronunciationProgressSnapshot,
  getServerPronunciationProgressSnapshot,
  setPronunciationChapterVerseCount,
  subscribeToPronunciationProgress,
} from "@/lib/pronunciation-progress";
import type { ChapterVerse } from "@/lib/verse-types";
import {
  isElementAlignedBelowHeader,
} from "@/lib/reading-scroll";

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
  startAtTop?: boolean;
  openPronunciationPractice?: boolean;
}

export function ReadPageContent({
  books,
  book,
  chapterNum,
  highlightStrongs,
  jumpFromSearch,
  startAtTop = false,
  openPronunciationPractice = false,
}: ReadPageContentProps) {
  const [verses, setVerses] = useState<ChapterVerse[] | null>(null);
  const [error, setError] = useState(false);
  const [isAtReadingScrollPoint, setIsAtReadingScrollPoint] = useState(false);
  const readingArticleRef = useRef<HTMLElement>(null);
  const pronunciationProgressSnapshot = useSyncExternalStore(
    subscribeToPronunciationProgress,
    getPronunciationProgressSnapshot,
    getServerPronunciationProgressSnapshot,
  );
  const currentChapterProgress = getChapterPronunciationProgress(
    pronunciationProgressSnapshot,
    book.slug,
    chapterNum,
  );

  useEffect(() => {
    let frameId: number | null = null;

    const updateReadingScrollPoint = () => {
      frameId = null;
      const article = readingArticleRef.current;
      if (!article) return;

      const isAligned = isElementAlignedBelowHeader(article);
      setIsAtReadingScrollPoint((current) =>
        current === isAligned ? current : isAligned,
      );
    };

    const scheduleUpdate = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(updateReadingScrollPoint);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  useLayoutEffect(() => {
    if (!startAtTop) return;

    window.scrollTo({ top: 0, behavior: "instant" });

    const url = new URL(window.location.href);
    url.searchParams.delete("from");
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [startAtTop, book.slug, chapterNum]);

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

        setPronunciationChapterVerseCount(
          book.slug,
          chapterNum,
          chapterData.verses.length,
        );
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
        <ChapterSelector
          book={book}
          currentChapter={chapterNum}
          pronunciationProgress={pronunciationProgressSnapshot}
        />
      </section>

      <article
        ref={readingArticleRef}
        data-chapter-reading-scroll-point
        className={`mb-[50vh] border border-stone-200/80 bg-white px-4 py-6 transition-[border-radius] duration-200 sm:p-10 ${
          isAtReadingScrollPoint
            ? "rounded-b-2xl rounded-t-none"
            : "rounded-2xl"
        }`}
      >
        <header
          data-chapter-reading-header
          className="mb-8 border-b border-stone-100 pb-6 text-center"
        >
          <h1 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
            {book.name}
          </h1>
          <p className="mt-1 text-lg text-amber-800">{chapterNum}장</p>
          {book.slug === "genesis" ? (
            <p className="mt-1 text-xs font-medium text-stone-400">새번역</p>
          ) : null}
          {currentChapterProgress.totalVerses > 0 && (
            <div
              data-chapter-pronunciation-progress
              className="mx-auto mt-3 max-w-48"
            >
              <div
                role="progressbar"
                aria-label={`${book.name} ${chapterNum}장 읽기 진행률`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={currentChapterProgress.percentage}
                className="h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${
                    currentChapterProgress.isComplete
                      ? "bg-emerald-500"
                      : "bg-amber-700"
                  }`}
                  style={{ width: `${currentChapterProgress.percentage}%` }}
                />
              </div>
              <div className="mt-1.5 text-center text-[11px] text-stone-400">
                <span>소리 내어 읽기 {currentChapterProgress.percentage}%</span>
                {currentChapterProgress.isComplete && (
                  <span className="ml-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                    ✓ 읽기 완료
                  </span>
                )}
              </div>
            </div>
          )}
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
            suppressInitialVerseScroll={startAtTop}
            openPronunciationPractice={openPronunciationPractice}
          />
        )}
      </article>
    </div>
  );
}
