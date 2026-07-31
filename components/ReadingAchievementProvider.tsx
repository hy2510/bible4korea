"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { MedalIcon, TrophyIcon } from "@/components/AchievementIcons";
import { useAuth } from "@/components/AuthProvider";
import { useDailyGoal } from "@/components/DailyGoalProvider";
import { getBooksSync } from "@/lib/bible-books";
import {
  BIBLE_CELEBRATION_MESSAGES,
  BOOK_CELEBRATION_MESSAGES,
  formatAchievementDate,
  getBookAchievementCounts,
  isBookReadingComplete,
  type BibleReadingAchievement,
  type BookReadingAchievement,
  type ReadingAchievementCelebration,
} from "@/lib/reading-achievements";
import {
  getPronunciationProgressSnapshot,
  getServerPronunciationProgressSnapshot,
  subscribeToPronunciationProgress,
} from "@/lib/pronunciation-progress";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AchievementHistoryKind = "book" | "bible";
type QueuedReadingAchievementCelebration =
  ReadingAchievementCelebration & { replay?: boolean };

interface ReadingAchievementContextValue {
  bookAchievements: readonly BookReadingAchievement[];
  bibleAchievements: readonly BibleReadingAchievement[];
  bookCompletionCounts: Readonly<Record<string, number>>;
  loading: boolean;
  error: string;
  openBookAchievementHistory: () => void;
  openBibleAchievementHistory: () => void;
}

const ReadingAchievementContext =
  createContext<ReadingAchievementContextValue | null>(null);

const BIBLE_BOOKS = getBooksSync();
const BOOK_BY_SLUG = new Map(
  BIBLE_BOOKS.map((book) => [book.slug, book]),
);

function sortNewestFirst<T extends { completedAt: string }>(
  achievements: readonly T[],
): T[] {
  return [...achievements].sort(
    (left, right) =>
      new Date(right.completedAt).getTime() -
      new Date(left.completedAt).getTime(),
  );
}

function ReadingAchievementCelebrationModal({
  celebration,
  onClose,
}: {
  celebration: ReadingAchievementCelebration | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!celebration) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [celebration, onClose]);

  if (!celebration || typeof document === "undefined") return null;

  const isBook = celebration.kind === "book";
  const achievement = celebration.achievement;
  const messages = isBook
    ? BOOK_CELEBRATION_MESSAGES
    : BIBLE_CELEBRATION_MESSAGES;
  const message =
    messages[(achievement.completionCount - 1) % messages.length];
  const title = isBook
    ? `${celebration.achievement.bookTitle} ${achievement.completionCount}독을 완독했어요!`
    : `성경 ${achievement.completionCount}독을 완주했어요!`;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-hidden bg-black p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <iframe
        title={isBook ? "성경 한 권 완독 축하 폭죽" : "성경 통독 축하 폭죽"}
        aria-hidden="true"
        src="/vendor/firework-simulator/index.html"
        className="pointer-events-none absolute inset-0 z-0 size-full border-0"
        sandbox="allow-scripts allow-same-origin"
        tabIndex={-1}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reading-achievement-celebration-title"
        className="dark relative z-10 w-full max-w-sm overflow-hidden break-words rounded-3xl border border-amber-800/50 bg-surface/75 px-6 py-8 text-center text-foreground shadow-2xl backdrop-blur-xl [word-break:keep-all]"
      >
        <div className="mx-auto flex size-20 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/15 shadow-[0_0_36px_rgba(251,191,36,0.3)]">
          {isBook ? (
            <MedalIcon className="size-12" />
          ) : (
            <TrophyIcon className="size-12" />
          )}
        </div>
        <p className="mt-4 text-sm font-medium text-amber-300">
          {formatAchievementDate(achievement.completedAt)}
        </p>
        <h2
          id="reading-achievement-celebration-title"
          className="mt-4 font-serif text-2xl font-bold text-foreground"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="mt-6 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-amber-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-900"
        >
          확인
        </button>
      </div>
    </div>,
    document.body,
  );
}

function AchievementHistoryModal({
  kind,
  bookAchievements,
  bibleAchievements,
  onClose,
  onReplay,
}: {
  kind: AchievementHistoryKind | null;
  bookAchievements: readonly BookReadingAchievement[];
  bibleAchievements: readonly BibleReadingAchievement[];
  onClose: () => void;
  onReplay: (celebration: ReadingAchievementCelebration) => void;
}) {
  useEffect(() => {
    if (!kind) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [kind, onClose]);

  if (!kind || typeof document === "undefined") return null;

  const isBook = kind === "book";
  const hasAchievements = isBook
    ? bookAchievements.length > 0
    : bibleAchievements.length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[105] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-history-title"
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2
              id="achievement-history-title"
              className="font-serif text-lg font-bold text-foreground"
            >
              {isBook ? "성경 완독 메달" : "성경 통독 트로피"}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              항목을 누르면 축하 화면을 다시 볼 수 있어요.
            </p>
          </div>
          <button
            type="button"
            aria-label="성취 기록 닫기"
            onClick={onClose}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-2xl leading-none text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="max-h-[min(60vh,30rem)] overflow-y-auto p-3">
          {!hasAchievements ? (
            <p className="px-3 py-10 text-center text-sm text-muted">
              아직 받은 {isBook ? "완독 메달" : "통독 트로피"}이 없습니다.
            </p>
          ) : isBook ? (
            <ul className="space-y-2">
              {bookAchievements.map((achievement) => (
                <li
                  key={`${achievement.bookSlug}-${achievement.completionCount}-${achievement.completedAt}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onReplay({ kind: "book", achievement })
                    }
                    className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-amber-200 hover:bg-amber-50 dark:hover:border-amber-900/60 dark:hover:bg-amber-950/30"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
                      <MedalIcon className="size-7" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-foreground">
                        {achievement.bookTitle}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {formatAchievementDate(achievement.completedAt)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-amber-800 px-2.5 py-1 text-xs font-bold text-white">
                      {achievement.completionCount}독
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {bibleAchievements.map((achievement) => (
                <li
                  key={`${achievement.completionCount}-${achievement.completedAt}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onReplay({ kind: "bible", achievement })
                    }
                    className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left transition-colors hover:border-amber-200 hover:bg-amber-50 dark:hover:border-amber-900/60 dark:hover:bg-amber-950/30"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60">
                      <TrophyIcon className="size-7" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-foreground">
                        성경 전체 {achievement.completionCount}독 완주
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {formatAchievementDate(achievement.completedAt)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-amber-800 px-2.5 py-1 text-xs font-bold text-white">
                      {achievement.completionCount}독
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ReadingAchievementAccountProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const { syncStatus } = useAuth();
  const pathname = usePathname();
  const isBibleReadingPage = pathname.startsWith("/read/");
  const { celebrationBlocking: dailyGoalCelebrationBlocking } =
    useDailyGoal();
  const progress = useSyncExternalStore(
    subscribeToPronunciationProgress,
    getPronunciationProgressSnapshot,
    getServerPronunciationProgressSnapshot,
  );
  const [realBookAchievements, setRealBookAchievements] = useState<
    BookReadingAchievement[]
  >([]);
  const [realBibleAchievements, setRealBibleAchievements] = useState<
    BibleReadingAchievement[]
  >([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [storageReady, setStorageReady] = useState(false);
  const [error, setError] = useState("");
  const [historyKind, setHistoryKind] =
    useState<AchievementHistoryKind | null>(null);
  const [celebrationQueue, setCelebrationQueue] = useState<
    QueuedReadingAchievementCelebration[]
  >([]);
  const initializedProgressRef = useRef(false);
  const armedBookSlugsRef = useRef(new Set<string>());
  const pendingBookSlugsRef = useRef(new Set<string>());
  const trophyPendingRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      const timeoutId = window.setTimeout(() => {
        setError("완독 기록 저장소 설정을 확인해 주세요.");
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    let active = true;
    void Promise.all([
      supabase
        .from("user_book_reading_achievements")
        .select("book_slug, completion_count, completed_at")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false }),
      supabase
        .from("user_bible_reading_achievements")
        .select("completion_count, completed_at")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false }),
    ]).then(([bookResult, bibleResult]) => {
      if (!active) return;

      if (bookResult.error || bibleResult.error) {
        setError("완독 기록 저장소를 불러오지 못했습니다.");
      } else {
        setRealBookAchievements(
          (bookResult.data ?? []).flatMap((row) => {
            const book = BOOK_BY_SLUG.get(row.book_slug);
            return book
              ? [
                  {
                    bookSlug: row.book_slug,
                    bookTitle: book.name,
                    completionCount: row.completion_count,
                    completedAt: row.completed_at,
                  },
                ]
              : [];
          }),
        );
        setRealBibleAchievements(
          (bibleResult.data ?? []).map((row) => ({
            completionCount: row.completion_count,
            completedAt: row.completed_at,
          })),
        );
        setStorageReady(true);
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  const realBookCounts = useMemo(
    () => getBookAchievementCounts(realBookAchievements),
    [realBookAchievements],
  );

  useEffect(() => {
    if (
      !userId ||
      !storageReady ||
      loading ||
      syncStatus !== "synced"
    ) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const completionBySlug = new Map(
      BIBLE_BOOKS.map((book) => [
        book.slug,
        isBookReadingComplete(progress, book),
      ]),
    );
    const candidates: Array<{
      bookSlug: string;
      bookTitle: string;
      completionCount: number;
    }> = [];

    if (!initializedProgressRef.current) {
      initializedProgressRef.current = true;
      for (const book of BIBLE_BOOKS) {
        const completed = completionBySlug.get(book.slug) ?? false;
        const count = realBookCounts[book.slug] ?? 0;
        if (!completed && count > 0) {
          armedBookSlugsRef.current.add(book.slug);
        } else if (completed && count === 0) {
          candidates.push({
            bookSlug: book.slug,
            bookTitle: book.name,
            completionCount: 1,
          });
        }
      }
    } else {
      for (const book of BIBLE_BOOKS) {
        const completed = completionBySlug.get(book.slug) ?? false;
        const count = realBookCounts[book.slug] ?? 0;

        if (!completed) {
          if (count > 0) armedBookSlugsRef.current.add(book.slug);
          continue;
        }
        if (
          count === 0 ||
          armedBookSlugsRef.current.has(book.slug)
        ) {
          candidates.push({
            bookSlug: book.slug,
            bookTitle: book.name,
            completionCount: count + 1,
          });
        }
      }
    }

    const pendingCandidates = candidates.filter(
      ({ bookSlug }) => !pendingBookSlugsRef.current.has(bookSlug),
    );
    if (pendingCandidates.length === 0) return;

    pendingCandidates.forEach(({ bookSlug }) => {
      pendingBookSlugsRef.current.add(bookSlug);
    });

    void Promise.all(
      pendingCandidates.map(async (candidate) => {
        const completedAt = new Date().toISOString();
        const { data, error: insertError } = await supabase
          .from("user_book_reading_achievements")
          .insert({
            user_id: userId,
            book_slug: candidate.bookSlug,
            completion_count: candidate.completionCount,
            completed_at: completedAt,
          })
          .select("book_slug, completion_count, completed_at")
          .single();

        pendingBookSlugsRef.current.delete(candidate.bookSlug);
        if (insertError || !data) return null;
        armedBookSlugsRef.current.delete(candidate.bookSlug);
        return {
          bookSlug: data.book_slug,
          bookTitle: candidate.bookTitle,
          completionCount: data.completion_count,
          completedAt: data.completed_at,
        } satisfies BookReadingAchievement;
      }),
    ).then((inserted) => {
      const achievements = inserted.filter(
        (achievement): achievement is BookReadingAchievement =>
          achievement !== null,
      );
      if (achievements.length === 0) {
        setError("완독 메달을 저장하지 못했습니다.");
        return;
      }

      setRealBookAchievements((current) =>
        sortNewestFirst([...current, ...achievements]),
      );
      if (window.location.pathname.startsWith("/read/")) {
        setCelebrationQueue((current) => [
          ...current,
          ...achievements.map(
            (achievement) =>
              ({
                kind: "book",
                achievement,
              }) satisfies QueuedReadingAchievementCelebration,
          ),
        ]);
      }
    });
  }, [
    loading,
    progress,
    realBookCounts,
    storageReady,
    syncStatus,
    userId,
  ]);

  useEffect(() => {
    if (!userId || !storageReady || loading || trophyPendingRef.current) {
      return;
    }

    const completedRounds = Math.min(
      ...BIBLE_BOOKS.map((book) => realBookCounts[book.slug] ?? 0),
    );
    const recordedRounds = realBibleAchievements.reduce(
      (highest, achievement) =>
        Math.max(highest, achievement.completionCount),
      0,
    );
    if (completedRounds <= recordedRounds) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    trophyPendingRef.current = true;
    const completionCount = recordedRounds + 1;

    void supabase
      .from("user_bible_reading_achievements")
      .insert({
        user_id: userId,
        completion_count: completionCount,
        completed_at: new Date().toISOString(),
      })
      .select("completion_count, completed_at")
      .single()
      .then(({ data, error: insertError }) => {
        trophyPendingRef.current = false;
        if (insertError || !data) {
          setError("성경 통독 트로피를 저장하지 못했습니다.");
          return;
        }

        const achievement: BibleReadingAchievement = {
          completionCount: data.completion_count,
          completedAt: data.completed_at,
        };
        setRealBibleAchievements((current) =>
          sortNewestFirst([...current, achievement]),
        );
        if (window.location.pathname.startsWith("/read/")) {
          setCelebrationQueue((current) => [
            ...current,
            { kind: "bible", achievement },
          ]);
        }
      });
  }, [
    loading,
    realBibleAchievements,
    realBookCounts,
    storageReady,
    userId,
  ]);

  const bookCompletionCounts = useMemo(
    () => getBookAchievementCounts(realBookAchievements),
    [realBookAchievements],
  );
  const closeHistory = useCallback(() => setHistoryKind(null), []);
  const closeCelebration = useCallback(
    () => setCelebrationQueue((current) => current.slice(1)),
    [],
  );
  const replayCelebration = useCallback(
    (celebration: ReadingAchievementCelebration) => {
      setHistoryKind(null);
      setCelebrationQueue([{ ...celebration, replay: true }]);
    },
    [],
  );
  const queuedCelebration = celebrationQueue[0] ?? null;
  const visibleCelebration =
    queuedCelebration &&
    !dailyGoalCelebrationBlocking &&
    (isBibleReadingPage || queuedCelebration.replay)
      ? queuedCelebration
      : null;

  const value = useMemo<ReadingAchievementContextValue>(
    () => ({
      bookAchievements: realBookAchievements,
      bibleAchievements: realBibleAchievements,
      bookCompletionCounts,
      loading,
      error,
      openBookAchievementHistory: () => setHistoryKind("book"),
      openBibleAchievementHistory: () => setHistoryKind("bible"),
    }),
    [
      bookCompletionCounts,
      error,
      loading,
      realBibleAchievements,
      realBookAchievements,
    ],
  );

  return (
    <ReadingAchievementContext.Provider value={value}>
      {children}
      <AchievementHistoryModal
        kind={historyKind}
        bookAchievements={realBookAchievements}
        bibleAchievements={realBibleAchievements}
        onClose={closeHistory}
        onReplay={replayCelebration}
      />
      <ReadingAchievementCelebrationModal
        celebration={visibleCelebration}
        onClose={closeCelebration}
      />
    </ReadingAchievementContext.Provider>
  );
}

export function ReadingAchievementProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  return (
    <ReadingAchievementAccountProvider
      key={user?.id ?? "guest"}
      userId={user?.id ?? null}
    >
      {children}
    </ReadingAchievementAccountProvider>
  );
}

export function useReadingAchievements(): ReadingAchievementContextValue {
  const context = useContext(ReadingAchievementContext);
  if (!context) {
    throw new Error(
      "useReadingAchievements must be used within ReadingAchievementProvider",
    );
  }
  return context;
}
