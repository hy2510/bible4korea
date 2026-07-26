const STORAGE_KEY = "bible4korea:pronunciation-progress";

interface StoredPronunciationProgress {
  completedVerseKeys: string[];
  chapterVerseCounts: Record<string, number>;
  completedVerseDetails?: Record<string, CompletedPronunciationVerseDetail>;
}

interface CompletedPronunciationVerseDetail {
  completedAt: string;
  koreanText?: string;
}

export interface PronunciationProgressSnapshot {
  completedVerseKeys: ReadonlySet<string>;
  chapterVerseCounts: Readonly<Record<string, number>>;
  completedVerseDetails: Readonly<
    Record<string, CompletedPronunciationVerseDetail>
  >;
}

export interface ChapterPronunciationProgress {
  completedVerses: number;
  totalVerses: number;
  percentage: number;
  isComplete: boolean;
}

export type BookPronunciationProgress = ChapterPronunciationProgress;

export interface CompletedPronunciationVerse {
  bookSlug: string;
  chapter: number;
  verseNum: number;
  completedAt?: string;
  koreanText?: string;
}

const EMPTY_SNAPSHOT: PronunciationProgressSnapshot = {
  completedVerseKeys: new Set(),
  chapterVerseCounts: {},
  completedVerseDetails: {},
};

const listeners = new Set<() => void>();
let cachedSerialized: string | null | undefined;
let cachedSnapshot = EMPTY_SNAPSHOT;
let storageListenerAttached = false;

function getChapterKey(bookSlug: string, chapter: number): string {
  return `${bookSlug}:${chapter}`;
}

function getVerseKey(
  bookSlug: string,
  chapter: number,
  verseNum: number,
): string {
  return `${getChapterKey(bookSlug, chapter)}:${verseNum}`;
}

function parseSnapshot(serialized: string | null): PronunciationProgressSnapshot {
  if (!serialized) return EMPTY_SNAPSHOT;

  try {
    const stored = JSON.parse(serialized) as Partial<StoredPronunciationProgress>;
    const completedVerseKeys = Array.isArray(stored.completedVerseKeys)
      ? stored.completedVerseKeys.filter(
          (verseKey): verseKey is string => typeof verseKey === "string",
        )
      : [];
    const chapterVerseCounts =
      stored.chapterVerseCounts &&
      typeof stored.chapterVerseCounts === "object"
        ? Object.fromEntries(
            Object.entries(stored.chapterVerseCounts).filter(
              ([, verseCount]) =>
                Number.isInteger(verseCount) && verseCount > 0,
            ),
          )
        : {};
    const completedVerseDetails =
      stored.completedVerseDetails &&
      typeof stored.completedVerseDetails === "object"
        ? Object.fromEntries(
            Object.entries(stored.completedVerseDetails).flatMap(
              ([verseKey, detail]) => {
                if (
                  !detail ||
                  typeof detail !== "object" ||
                  typeof detail.completedAt !== "string" ||
                  Number.isNaN(new Date(detail.completedAt).getTime())
                ) {
                  return [];
                }

                return [
                  [
                    verseKey,
                    {
                      completedAt: detail.completedAt,
                      koreanText:
                        typeof detail.koreanText === "string"
                          ? detail.koreanText.trim() || undefined
                          : undefined,
                    },
                  ],
                ];
              },
            ),
          )
        : {};

    return {
      completedVerseKeys: new Set(completedVerseKeys),
      chapterVerseCounts,
      completedVerseDetails,
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

function persistSnapshot(snapshot: PronunciationProgressSnapshot) {
  const serialized = JSON.stringify({
    completedVerseKeys: Array.from(snapshot.completedVerseKeys),
    chapterVerseCounts: snapshot.chapterVerseCounts,
    completedVerseDetails: snapshot.completedVerseDetails,
  } satisfies StoredPronunciationProgress);

  cachedSerialized = serialized;
  cachedSnapshot = snapshot;

  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // 저장 공간을 사용할 수 없어도 현재 화면의 진행 상태는 유지합니다.
  }

  emitChange();
}

export function subscribeToPronunciationProgress(
  listener: () => void,
): () => void {
  listeners.add(listener);

  if (!storageListenerAttached && typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY) return;
      cachedSerialized = undefined;
      cachedSnapshot = EMPTY_SNAPSHOT;
      emitChange();
    });
    storageListenerAttached = true;
  }

  return () => listeners.delete(listener);
}

export function getPronunciationProgressSnapshot(): PronunciationProgressSnapshot {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;

  let serialized: string | null;
  try {
    serialized = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    serialized = null;
  }

  if (serialized === cachedSerialized) return cachedSnapshot;

  cachedSerialized = serialized;
  cachedSnapshot = parseSnapshot(serialized);
  return cachedSnapshot;
}

export function getServerPronunciationProgressSnapshot(): PronunciationProgressSnapshot {
  return EMPTY_SNAPSHOT;
}

export function clearPronunciationProgress(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장 공간에 접근할 수 없어도 현재 화면의 진행 상태는 비웁니다.
  }

  cachedSerialized = null;
  cachedSnapshot = EMPTY_SNAPSHOT;
  emitChange();
}

export function deletePronunciationProgressByBooks(
  bookSlugs: ReadonlySet<string>,
): void {
  if (typeof window === "undefined" || bookSlugs.size === 0) return;

  const current = getPronunciationProgressSnapshot();
  const belongsToSelectedBook = (key: string) => {
    const separatorIndex = key.indexOf(":");
    return (
      separatorIndex > 0 && bookSlugs.has(key.slice(0, separatorIndex))
    );
  };
  const completedVerseKeys = new Set(
    Array.from(current.completedVerseKeys).filter(
      (verseKey) => !belongsToSelectedBook(verseKey),
    ),
  );
  const chapterVerseCounts = Object.fromEntries(
    Object.entries(current.chapterVerseCounts).filter(
      ([chapterKey]) => !belongsToSelectedBook(chapterKey),
    ),
  );
  const completedVerseDetails = Object.fromEntries(
    Object.entries(current.completedVerseDetails).filter(
      ([verseKey]) => !belongsToSelectedBook(verseKey),
    ),
  );

  if (
    completedVerseKeys.size === current.completedVerseKeys.size &&
    Object.keys(chapterVerseCounts).length ===
      Object.keys(current.chapterVerseCounts).length &&
    Object.keys(completedVerseDetails).length ===
      Object.keys(current.completedVerseDetails).length
  ) {
    return;
  }

  persistSnapshot({
    completedVerseKeys,
    chapterVerseCounts,
    completedVerseDetails,
  });
}

export function setPronunciationChapterVerseCount(
  bookSlug: string,
  chapter: number,
  totalVerses: number,
) {
  if (!Number.isInteger(totalVerses) || totalVerses < 1) return;

  const current = getPronunciationProgressSnapshot();
  const chapterKey = getChapterKey(bookSlug, chapter);
  if (current.chapterVerseCounts[chapterKey] === totalVerses) return;

  persistSnapshot({
    completedVerseKeys: current.completedVerseKeys,
    chapterVerseCounts: {
      ...current.chapterVerseCounts,
      [chapterKey]: totalVerses,
    },
    completedVerseDetails: current.completedVerseDetails,
  });
}

export function setPronunciationVerseCompleted(
  bookSlug: string,
  chapter: number,
  verseNum: number,
  completed: boolean,
  koreanText?: string,
) {
  const current = getPronunciationProgressSnapshot();
  const verseKey = getVerseKey(bookSlug, chapter, verseNum);
  const currentlyCompleted = current.completedVerseKeys.has(verseKey);
  if (currentlyCompleted === completed && !completed) return;

  const nextCompletedVerseKeys = new Set(current.completedVerseKeys);
  if (completed) {
    nextCompletedVerseKeys.delete(verseKey);
    nextCompletedVerseKeys.add(verseKey);
  } else {
    nextCompletedVerseKeys.delete(verseKey);
  }
  const nextCompletedVerseDetails = {
    ...current.completedVerseDetails,
  };
  if (completed) {
    nextCompletedVerseDetails[verseKey] = {
      completedAt: new Date().toISOString(),
      koreanText: koreanText?.trim() || undefined,
    };
  } else {
    delete nextCompletedVerseDetails[verseKey];
  }

  persistSnapshot({
    completedVerseKeys: nextCompletedVerseKeys,
    chapterVerseCounts: current.chapterVerseCounts,
    completedVerseDetails: nextCompletedVerseDetails,
  });
}

export function getRecentCompletedPronunciationVerses(
  snapshot: PronunciationProgressSnapshot,
  limit = 10,
): CompletedPronunciationVerse[] {
  if (!Number.isInteger(limit) || limit < 1) return [];

  return Array.from(snapshot.completedVerseKeys)
    .reverse()
    .flatMap((verseKey) => {
      const [bookSlug, chapterText, verseText] = verseKey.split(":");
      const chapter = Number(chapterText);
      const verseNum = Number(verseText);

      if (
        !bookSlug ||
        !Number.isInteger(chapter) ||
        chapter < 1 ||
        !Number.isInteger(verseNum) ||
        verseNum < 1
      ) {
        return [];
      }

      const detail = snapshot.completedVerseDetails[verseKey];
      return [
        {
          bookSlug,
          chapter,
          verseNum,
          completedAt: detail?.completedAt,
          koreanText: detail?.koreanText,
        },
      ];
    })
    .slice(0, limit);
}

export function isPronunciationVerseCompleted(
  snapshot: PronunciationProgressSnapshot,
  bookSlug: string,
  chapter: number,
  verseNum: number,
): boolean {
  return snapshot.completedVerseKeys.has(
    getVerseKey(bookSlug, chapter, verseNum),
  );
}

export function getChapterPronunciationProgress(
  snapshot: PronunciationProgressSnapshot,
  bookSlug: string,
  chapter: number,
): ChapterPronunciationProgress {
  const chapterKey = getChapterKey(bookSlug, chapter);
  const verseKeyPrefix = `${chapterKey}:`;
  const totalVerses = snapshot.chapterVerseCounts[chapterKey] ?? 0;
  let completedVerses = 0;

  snapshot.completedVerseKeys.forEach((verseKey) => {
    if (verseKey.startsWith(verseKeyPrefix)) completedVerses++;
  });

  const boundedCompletedVerses =
    totalVerses > 0 ? Math.min(completedVerses, totalVerses) : completedVerses;
  const percentage =
    totalVerses > 0
      ? Math.round((boundedCompletedVerses / totalVerses) * 100)
      : 0;

  return {
    completedVerses: boundedCompletedVerses,
    totalVerses,
    percentage,
    isComplete: totalVerses > 0 && boundedCompletedVerses === totalVerses,
  };
}

export function getBookPronunciationProgress(
  snapshot: PronunciationProgressSnapshot,
  bookSlug: string,
  totalVerses: number,
): BookPronunciationProgress {
  const verseKeyPrefix = `${bookSlug}:`;
  let completedVerses = 0;

  snapshot.completedVerseKeys.forEach((verseKey) => {
    if (verseKey.startsWith(verseKeyPrefix)) completedVerses++;
  });

  const boundedCompletedVerses =
    totalVerses > 0 ? Math.min(completedVerses, totalVerses) : completedVerses;
  const percentage =
    totalVerses > 0
      ? Math.round((boundedCompletedVerses / totalVerses) * 100)
      : 0;

  return {
    completedVerses: boundedCompletedVerses,
    totalVerses,
    percentage,
    isComplete: totalVerses > 0 && boundedCompletedVerses === totalVerses,
  };
}
