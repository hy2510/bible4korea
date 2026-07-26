"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { saveLastReadChapter } from "@/lib/last-read";
import type { BibleBook } from "@/lib/bible-api";
import {
  getPronunciationProgressSnapshot,
  getServerPronunciationProgressSnapshot,
  isPronunciationVerseCompleted,
  setPronunciationVerseCompleted,
  subscribeToPronunciationProgress,
} from "@/lib/pronunciation-progress";
import type { ChapterVerse } from "@/lib/verse-types";
import {
  getStoredVerseViewMode,
  setStoredVerseViewMode,
  type VerseViewMode,
} from "@/lib/verse-view-mode";
import { getVerseFromHash } from "@/lib/verse-hash";
import {
  highlightAndScrollToVerse,
  runWhenVerseElementReady,
} from "@/lib/verse-jump";
import { ChapterNav } from "@/components/ChapterNav";
import { SefariaCommentaryModal } from "@/components/SefariaCommentaryModal";
import { VerseDisplay } from "@/components/VerseDisplay";
import { VerseNav } from "@/components/VerseNav";
import { VersePronunciationPractice } from "@/components/VersePronunciationPractice";

function subscribeToHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  window.addEventListener("popstate", onStoreChange);
  return () => {
    window.removeEventListener("hashchange", onStoreChange);
    window.removeEventListener("popstate", onStoreChange);
  };
}

function getHashSnapshot() {
  return window.location.hash;
}

function getServerHashSnapshot() {
  return "";
}

interface ChapterReaderProps {
  book: BibleBook;
  bookSlug: string;
  bookName: string;
  chapter: number;
  verses: ChapterVerse[];
  highlightStrongs?: string;
  jumpFromSearch?: boolean;
}

function clampVerse(verse: number, total: number): number {
  if (!Number.isInteger(verse) || verse < 1) return 1;
  if (verse > total) return total;
  return verse;
}

export function ChapterReader({
  book,
  bookSlug,
  bookName,
  chapter,
  verses,
  highlightStrongs,
  jumpFromSearch = false,
}: ChapterReaderProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<VerseViewMode>(() =>
    getStoredVerseViewMode(),
  );
  const [sefariaCommentaryVerses, setSefariaCommentaryVerses] = useState<
    Set<number>
  >(() => new Set());
  const [sefariaModalVerse, setSefariaModalVerse] = useState<number | null>(
    null,
  );
  const [currentVerse, setCurrentVerse] = useState(() => {
    const hashVerse = getVerseFromHash();
    return hashVerse ?? 1;
  });
  const [pronunciationProgress, setPronunciationProgress] = useState<{
    bookSlug: string;
    chapter: number;
    verseNum: number;
    characterCount: number;
  } | null>(null);
  const [pronunciationPanelOpen, setPronunciationPanelOpen] = useState(false);
  const [pronunciationAutoStartVerse, setPronunciationAutoStartVerse] =
    useState<number | null>(null);
  const topVerseNavRef = useRef<HTMLDivElement>(null);
  const scrollToTopNavOnVerseChange = useRef(false);
  const pendingPronunciationScrollVerseRef = useRef<number | null>(null);
  const fullHashJumpCleanupRef = useRef<(() => void) | null>(null);
  const pendingInternalHashRef = useRef<string | null>(null);
  const hash = useSyncExternalStore(
    subscribeToHash,
    getHashSnapshot,
    getServerHashSnapshot,
  );
  const pronunciationProgressSnapshot = useSyncExternalStore(
    subscribeToPronunciationProgress,
    getPronunciationProgressSnapshot,
    getServerPronunciationProgressSnapshot,
  );
  const jumpBehavior: ScrollBehavior =
    jumpFromSearch || getVerseFromHash() ? "instant" : "smooth";

  useEffect(() => {
    let cancelled = false;

    setSefariaCommentaryVerses(new Set());
    setSefariaModalVerse(null);

    fetch(`/api/sefaria/${bookSlug}/${chapter}`)
      .then(async (response) => {
        if (!response.ok) return { verses: [] as number[] };
        return response.json() as Promise<{ verses: number[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setSefariaCommentaryVerses(new Set(data.verses));
      })
      .catch(() => {
        if (!cancelled) setSefariaCommentaryVerses(new Set());
      });

    return () => {
      cancelled = true;
    };
  }, [bookSlug, chapter]);

  useEffect(() => {
    const hashVerse = getVerseFromHash();
    setCurrentVerse(clampVerse(hashVerse ?? 1, verses.length));
  }, [bookSlug, chapter, verses.length]);

  useEffect(() => {
    if (viewMode !== "single") return;

    if (pendingInternalHashRef.current) {
      if (hash === pendingInternalHashRef.current) {
        pendingInternalHashRef.current = null;
      }
      return;
    }

    const hashVerse = getVerseFromHash();
    if (!hashVerse) return;

    const next = clampVerse(hashVerse, verses.length);
    setCurrentVerse((prev) => (prev === next ? prev : next));
  }, [viewMode, verses.length, hash]);

  useEffect(() => {
    if (viewMode !== "full") return;
    if (getVerseFromHash()) return;

    const first = verses[0];
    if (!first) return;

    saveLastReadChapter(bookSlug, bookName, chapter, 1, first.korean);
  }, [viewMode, bookSlug, bookName, chapter, verses.length, verses[0]?.korean]);

  useEffect(() => {
    if (viewMode !== "single") return;

    const verse = verses[currentVerse - 1];
    if (!verse) return;

    const newHash = `#verse-${currentVerse}`;
    if (window.location.hash !== newHash) {
      pendingInternalHashRef.current = newHash;
      const url = new URL(window.location.href);
      url.hash = `verse-${currentVerse}`;
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }, [viewMode, currentVerse, verses]);

  useEffect(() => {
    if (viewMode !== "single") return;

    const verse = verses[currentVerse - 1];
    if (!verse) return;

    const timeoutId = window.setTimeout(() => {
      saveLastReadChapter(
        bookSlug,
        bookName,
        chapter,
        currentVerse,
        verse.korean,
      );
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [viewMode, currentVerse, bookSlug, bookName, chapter, verses]);

  useEffect(() => {
    if (viewMode !== "single") return;
    if (!scrollToTopNavOnVerseChange.current) return;

    scrollToTopNavOnVerseChange.current = false;
    topVerseNavRef.current?.scrollIntoView({
      block: "start",
      behavior: "smooth",
    });
  }, [currentVerse, viewMode]);

  useLayoutEffect(() => {
    if (
      viewMode !== "single" ||
      pendingPronunciationScrollVerseRef.current !== null
    ) {
      return;
    }

    const hashVerse = getVerseFromHash();
    if (!hashVerse) return;

    const verseNum = clampVerse(hashVerse, verses.length);
    if (verseNum !== currentVerse || !verses[verseNum - 1]) return;

    scrollToTopNavOnVerseChange.current = false;
    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(`verse-${verseNum}`)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [viewMode, currentVerse, verses, bookSlug, chapter, hash]);

  useLayoutEffect(() => {
    const verseNum = pendingPronunciationScrollVerseRef.current;
    if (
      viewMode !== "single" ||
      !pronunciationPanelOpen ||
      verseNum === null ||
      verseNum !== currentVerse
    ) {
      return;
    }

    pendingPronunciationScrollVerseRef.current = null;
    scrollToTopNavOnVerseChange.current = false;

    const frameId = window.requestAnimationFrame(() => {
      document.getElementById(`verse-${verseNum}`)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [viewMode, currentVerse, pronunciationPanelOpen]);

  useLayoutEffect(() => {
    if (viewMode !== "full") return;

    const hashVerse = getVerseFromHash();
    if (!hashVerse) return;

    const verse = clampVerse(hashVerse, verses.length);
    if (!verses[verse - 1]) return;

    fullHashJumpCleanupRef.current?.();
    fullHashJumpCleanupRef.current = null;

    const options = { behavior: jumpBehavior };
    const cleanup = highlightAndScrollToVerse(verse, options);
    if (cleanup) {
      fullHashJumpCleanupRef.current = cleanup;
      return () => {
        fullHashJumpCleanupRef.current?.();
        fullHashJumpCleanupRef.current = null;
      };
    }

    const cancel = runWhenVerseElementReady(
      verse,
      (readyCleanup) => {
        fullHashJumpCleanupRef.current = readyCleanup;
      },
      options,
    );

    return () => {
      cancel();
      fullHashJumpCleanupRef.current?.();
      fullHashJumpCleanupRef.current = null;
    };
  }, [viewMode, verses.length, bookSlug, chapter, hash, jumpBehavior]);

  const handleViewModeChange = (mode: VerseViewMode) => {
    setViewMode(mode);
    setStoredVerseViewMode(mode);

    if (mode === "single") {
      const hashVerse = getVerseFromHash();
      if (hashVerse) {
        setCurrentVerse(clampVerse(hashVerse, verses.length));
      }
    }
  };

  const goToVerse = (verseNum: number) => {
    const next = clampVerse(verseNum, verses.length);
    if (next === currentVerse) return;

    pendingInternalHashRef.current = `#verse-${next}`;
    scrollToTopNavOnVerseChange.current = window.matchMedia(
      "(max-width: 639px)",
    ).matches;
    setCurrentVerse(next);
  };

  const handleVerseSelect = (verseNum: number) => {
    setViewMode("single");
    setStoredVerseViewMode("single");
    goToVerse(verseNum);
  };

  const handleOpenPronunciationPractice = (verseNum: number) => {
    pendingPronunciationScrollVerseRef.current = verseNum;
    setPronunciationAutoStartVerse(null);
    setPronunciationPanelOpen(true);

    if (viewMode === "full") {
      setViewMode("single");
      setStoredVerseViewMode("single");
    }

    goToVerse(verseNum);
    scrollToTopNavOnVerseChange.current = false;
  };

  const currentVerseData = verses[currentVerse - 1];
  const isSingle = viewMode === "single";
  const handlePronunciationCharacterProgressChange = useCallback(
    (characterCount: number | null) => {
      setPronunciationProgress(
        characterCount === null
          ? null
          : {
              bookSlug,
              chapter,
              verseNum: currentVerse,
              characterCount,
            },
      );
    },
    [bookSlug, chapter, currentVerse],
  );
  const handlePronunciationCompletionChange = useCallback(
    (verseNum: number, completed: boolean, koreanText: string) => {
      setPronunciationVerseCompleted(
        bookSlug,
        chapter,
        verseNum,
        completed,
        koreanText,
      );
    },
    [bookSlug, chapter],
  );

  const sefariaProps = {
    hasSefariaCommentary: (verseNum: number) =>
      sefariaCommentaryVerses.has(verseNum),
    onOpenSefariaCommentary: (verseNum: number) =>
      setSefariaModalVerse(verseNum),
  };

  return (
    <>
      <div className="mb-6 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <div className="flex w-full rounded-xl border border-stone-200 bg-stone-50 p-1 sm:inline-flex sm:w-auto">
          <button
            type="button"
            onClick={() => handleViewModeChange("full")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-initial ${
              viewMode === "full"
                ? "bg-white text-amber-900 shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            전체 보기
          </button>
          <button
            type="button"
            onClick={() => handleViewModeChange("single")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-initial ${
              viewMode === "single"
                ? "bg-white text-amber-900 shadow-sm"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            1절씩 보기
          </button>
        </div>
      </div>

      {isSingle && (
        <div ref={topVerseNavRef} className="scroll-mt-24">
          <VerseNav
            className="mb-4"
            currentVerse={currentVerse}
            totalVerses={verses.length}
            onPrev={() => goToVerse(currentVerse - 1)}
            onNext={() => goToVerse(currentVerse + 1)}
          />
        </div>
      )}

      {!isSingle && (
        <ChapterNav book={book} chapter={chapter} className="mb-4" />
      )}

      <div className="space-y-1">
        {isSingle && currentVerseData ? (
          <>
            <VerseDisplay
              key={currentVerseData.verseNum}
              {...currentVerseData}
              highlightStrongs={highlightStrongs}
              pronunciationCharacterCount={
                pronunciationProgress?.bookSlug === bookSlug &&
                pronunciationProgress.chapter === chapter &&
                pronunciationProgress.verseNum === currentVerseData.verseNum
                  ? pronunciationProgress.characterCount
                  : 0
              }
              pronunciationCompleted={isPronunciationVerseCompleted(
                pronunciationProgressSnapshot,
                bookSlug,
                chapter,
                currentVerseData.verseNum,
              )}
              pronunciationPanelOpen={pronunciationPanelOpen}
              onOpenPronunciationPractice={handleOpenPronunciationPractice}
              hasSefariaCommentary={sefariaProps.hasSefariaCommentary(
                currentVerseData.verseNum,
              )}
              onOpenSefariaCommentary={sefariaProps.onOpenSefariaCommentary}
            />
          </>
        ) : (
          verses.map((verse) => (
            <VerseDisplay
              key={verse.verseNum}
              {...verse}
              highlightStrongs={highlightStrongs}
              onVerseSelect={handleVerseSelect}
              pronunciationCompleted={isPronunciationVerseCompleted(
                pronunciationProgressSnapshot,
                bookSlug,
                chapter,
                verse.verseNum,
              )}
              onOpenPronunciationPractice={handleOpenPronunciationPractice}
              hasSefariaCommentary={sefariaProps.hasSefariaCommentary(
                verse.verseNum,
              )}
              onOpenSefariaCommentary={sefariaProps.onOpenSefariaCommentary}
            />
          ))
        )}
      </div>

      {isSingle &&
        currentVerseData &&
        pronunciationPanelOpen && (
          <VersePronunciationPractice
            key={`${bookSlug}-${chapter}-${currentVerseData.verseNum}`}
            bookName={bookName}
            chapter={chapter}
            verseNum={currentVerseData.verseNum}
            text={currentVerseData.korean}
            onCharacterProgressChange={
              handlePronunciationCharacterProgressChange
            }
            onCompletionChange={(completed) =>
              handlePronunciationCompletionChange(
                currentVerseData.verseNum,
                completed,
                currentVerseData.korean,
              )
            }
            onClose={() => setPronunciationPanelOpen(false)}
            hasNextVerse={currentVerse < verses.length}
            onNextVerse={() => {
              const nextVerse = currentVerse + 1;
              setPronunciationAutoStartVerse(nextVerse);
              goToVerse(nextVerse);
            }}
            hasNextChapter={chapter < book.chapters}
            onNextChapter={() => {
              setPronunciationAutoStartVerse(null);
              router.push(`/read/${bookSlug}/${chapter + 1}#verse-1`, {
                scroll: false,
              });
            }}
            autoStart={pronunciationAutoStartVerse === currentVerse}
            onAutoStartHandled={() => setPronunciationAutoStartVerse(null)}
          />
        )}

      {isSingle && (
        <VerseNav
          className="mt-6 border-t border-stone-200/80 pt-6"
          currentVerse={currentVerse}
          totalVerses={verses.length}
          onPrev={() => goToVerse(currentVerse - 1)}
          onNext={() => goToVerse(currentVerse + 1)}
        />
      )}

      {!isSingle && (
        <ChapterNav
          book={book}
          chapter={chapter}
          className="mt-6 border-t border-stone-200/80 pt-6"
        />
      )}

      <SefariaCommentaryModal
        open={sefariaModalVerse !== null}
        bookName={bookName}
        bookSlug={bookSlug}
        chapter={chapter}
        verse={sefariaModalVerse ?? 1}
        onClose={() => setSefariaModalVerse(null)}
      />
    </>
  );
}
