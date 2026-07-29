export const PRONUNCIATION_PROGRESS_STORAGE_KEY =
  "bible4korea:pronunciation-progress";

export interface SerializedPronunciationProgress {
  completedVerseKeys: string[];
  chapterVerseCounts: Record<string, number>;
  completedVerseDetails?: Record<string, CompletedPronunciationVerseDetail>;
}

export interface CompletedPronunciationVerseDetail {
  completedAt: string;
  completedDate: string;
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

function getKoreanCalendarDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

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

function isValidVerseKey(verseKey: string): boolean {
  const [bookSlug, chapterText, verseText, ...rest] = verseKey.split(":");
  const chapter = Number(chapterText);
  const verse = Number(verseText);
  return (
    rest.length === 0 &&
    Boolean(bookSlug) &&
    Number.isInteger(chapter) &&
    chapter > 0 &&
    Number.isInteger(verse) &&
    verse > 0
  );
}

export function normalizePronunciationProgress(
  value: unknown,
): PronunciationProgressSnapshot {
  if (!value || typeof value !== "object") return EMPTY_SNAPSHOT;

  try {
    const stored = value as Partial<SerializedPronunciationProgress>;
    const completedVerseKeys = Array.isArray(stored.completedVerseKeys)
      ? stored.completedVerseKeys.filter(
          (verseKey): verseKey is string =>
            typeof verseKey === "string" && isValidVerseKey(verseKey),
        )
      : [];
    const completedVerseKeySet = new Set(completedVerseKeys);
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
                  !completedVerseKeySet.has(verseKey) ||
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
                      completedDate:
                        typeof detail.completedDate === "string" &&
                        /^\d{4}-\d{2}-\d{2}$/.test(detail.completedDate)
                          ? detail.completedDate
                          : getKoreanCalendarDate(detail.completedAt),
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
      completedVerseKeys: completedVerseKeySet,
      chapterVerseCounts,
      completedVerseDetails,
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

function parseSnapshot(serialized: string | null): PronunciationProgressSnapshot {
  if (!serialized) return EMPTY_SNAPSHOT;

  try {
    return normalizePronunciationProgress(JSON.parse(serialized) as unknown);
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function serializePronunciationProgressSnapshot(
  snapshot: PronunciationProgressSnapshot,
): SerializedPronunciationProgress {
  return {
    completedVerseKeys: Array.from(snapshot.completedVerseKeys),
    chapterVerseCounts: { ...snapshot.chapterVerseCounts },
    completedVerseDetails: { ...snapshot.completedVerseDetails },
  };
}

function persistSnapshot(snapshot: PronunciationProgressSnapshot) {
  const serialized = JSON.stringify(
    serializePronunciationProgressSnapshot(snapshot),
  );

  cachedSerialized = serialized;
  cachedSnapshot = snapshot;

  try {
    window.localStorage.setItem(
      PRONUNCIATION_PROGRESS_STORAGE_KEY,
      serialized,
    );
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
      if (event.key !== PRONUNCIATION_PROGRESS_STORAGE_KEY) return;
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
    serialized = window.localStorage.getItem(
      PRONUNCIATION_PROGRESS_STORAGE_KEY,
    );
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
    window.localStorage.removeItem(PRONUNCIATION_PROGRESS_STORAGE_KEY);
  } catch {
    // 저장 공간에 접근할 수 없어도 현재 화면의 진행 상태는 비웁니다.
  }

  cachedSerialized = null;
  cachedSnapshot = EMPTY_SNAPSHOT;
  emitChange();
}

export function replacePronunciationProgress(
  value: unknown,
): PronunciationProgressSnapshot {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;

  const snapshot = normalizePronunciationProgress(value);
  persistSnapshot(snapshot);
  return snapshot;
}

export function mergePronunciationProgress(
  localValue: unknown,
  remoteValue: unknown,
): PronunciationProgressSnapshot {
  const local = normalizePronunciationProgress(localValue);
  const remote = normalizePronunciationProgress(remoteValue);
  const detailEntries = new Map<string, CompletedPronunciationVerseDetail>();

  for (const snapshot of [remote, local]) {
    for (const [verseKey, detail] of Object.entries(
      snapshot.completedVerseDetails,
    )) {
      const current = detailEntries.get(verseKey);
      if (
        !current ||
        new Date(detail.completedAt).getTime() >
          new Date(current.completedAt).getTime()
      ) {
        detailEntries.set(verseKey, detail);
      }
    }
  }

  const insertionOrder = new Map<string, number>();
  let insertionIndex = 0;
  for (const verseKey of [
    ...remote.completedVerseKeys,
    ...local.completedVerseKeys,
  ]) {
    insertionOrder.set(verseKey, insertionIndex++);
  }
  const completedVerseKeys = new Set(
    Array.from(insertionOrder.keys()).sort((left, right) => {
      const leftTime = detailEntries.get(left)?.completedAt;
      const rightTime = detailEntries.get(right)?.completedAt;
      const dateDifference =
        (leftTime ? new Date(leftTime).getTime() : 0) -
        (rightTime ? new Date(rightTime).getTime() : 0);
      return (
        dateDifference ||
        (insertionOrder.get(left) ?? 0) -
          (insertionOrder.get(right) ?? 0)
      );
    }),
  );
  const chapterVerseCounts: Record<string, number> = {
    ...remote.chapterVerseCounts,
  };
  for (const [chapterKey, count] of Object.entries(
    local.chapterVerseCounts,
  )) {
    chapterVerseCounts[chapterKey] = Math.max(
      chapterVerseCounts[chapterKey] ?? 0,
      count,
    );
  }

  return {
    completedVerseKeys,
    chapterVerseCounts,
    completedVerseDetails: Object.fromEntries(detailEntries),
  };
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
    const completedAt = new Date();
    nextCompletedVerseDetails[verseKey] = {
      completedAt: completedAt.toISOString(),
      completedDate: getKoreanCalendarDate(completedAt),
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
