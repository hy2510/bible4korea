export const LAST_READ_STORAGE_KEY = "bible4korea:last-read-chapter";
export const LAST_READ_UPDATED_EVENT = "bible4korea:last-read-updated";
export const MAX_LAST_READ_COUNT = 10;

export interface LastReadChapter {
  bookSlug: string;
  bookName: string;
  chapter: number;
  verse: number;
  koreanText?: string;
  readAt: string;
}

const EMPTY_LAST_READ_CHAPTERS: LastReadChapter[] = [];
let cachedEntries: LastReadChapter[] | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === LAST_READ_STORAGE_KEY) {
      cachedEntries = null;
    }
  });
}

function isValidEntry(entry: unknown): entry is LastReadChapter {
  if (!entry || typeof entry !== "object") return false;

  const item = entry as LastReadChapter;
  const verse = item.verse ?? 1;

  return (
    Boolean(item.bookSlug) &&
    Boolean(item.bookName) &&
    Number.isInteger(item.chapter) &&
    item.chapter >= 1 &&
    Number.isInteger(verse) &&
    verse >= 1 &&
    typeof item.readAt === "string" &&
    !Number.isNaN(new Date(item.readAt).getTime())
  );
}

function normalizeEntry(entry: LastReadChapter): LastReadChapter {
  return {
    ...entry,
    verse: entry.verse ?? 1,
    koreanText: entry.koreanText?.trim() || undefined,
  };
}

function dedupeByChapter(entries: LastReadChapter[]): LastReadChapter[] {
  const byChapter = new Map<string, LastReadChapter>();

  for (const entry of entries) {
    const key = `${entry.bookSlug}:${entry.chapter}`;
    const current = byChapter.get(key);

    if (!current || new Date(entry.readAt) > new Date(current.readAt)) {
      byChapter.set(key, entry);
    }
  }

  return [...byChapter.values()].sort(
    (a, b) => new Date(b.readAt).getTime() - new Date(a.readAt).getTime(),
  );
}

export function normalizeLastReadChapters(
  value: unknown,
): LastReadChapter[] {
  if (Array.isArray(value)) {
    return dedupeByChapter(
      value.filter(isValidEntry).map(normalizeEntry),
    ).slice(0, MAX_LAST_READ_COUNT);
  }

  if (isValidEntry(value)) {
    return [normalizeEntry(value)];
  }

  return [];
}

function parseStoredEntries(raw: string): LastReadChapter[] {
  return normalizeLastReadChapters(JSON.parse(raw) as unknown);
}

function readStoredEntries(): LastReadChapter[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(LAST_READ_STORAGE_KEY);
    if (!raw) {
      cachedEntries = [];
      return [];
    }

    cachedEntries = parseStoredEntries(raw);
    return cachedEntries;
  } catch {
    cachedEntries = [];
    return [];
  }
}

export function getLastReadChapters(): LastReadChapter[] {
  if (typeof window === "undefined") return [];
  if (cachedEntries) return cachedEntries;
  return readStoredEntries();
}

export function getServerLastReadChapters(): LastReadChapter[] {
  return EMPTY_LAST_READ_CHAPTERS;
}

export function subscribeToLastReadChapters(
  listener: () => void,
): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === LAST_READ_STORAGE_KEY) listener();
  };

  window.addEventListener(LAST_READ_UPDATED_EVENT, listener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(LAST_READ_UPDATED_EVENT, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function clearLastReadChapters(): void {
  if (typeof window === "undefined") return;

  cachedEntries = [];

  try {
    localStorage.removeItem(LAST_READ_STORAGE_KEY);
  } catch {
    // 저장 공간에 접근할 수 없어도 현재 화면의 기록은 비웁니다.
  }

  notifyLastReadUpdated();
}

export function replaceLastReadChapters(entries: unknown): LastReadChapter[] {
  if (typeof window === "undefined") return [];

  const normalized = normalizeLastReadChapters(entries);
  cachedEntries = normalized;

  try {
    if (normalized.length === 0) {
      localStorage.removeItem(LAST_READ_STORAGE_KEY);
    } else {
      localStorage.setItem(
        LAST_READ_STORAGE_KEY,
        JSON.stringify(normalized),
      );
    }
  } catch {
    // 저장 공간에 접근할 수 없어도 현재 화면에서는 교체된 기록을 사용합니다.
  }

  notifyLastReadUpdated();
  return normalized;
}

export function mergeLastReadChapters(
  localEntries: unknown,
  remoteEntries: unknown,
): LastReadChapter[] {
  return normalizeLastReadChapters([
    ...normalizeLastReadChapters(localEntries),
    ...normalizeLastReadChapters(remoteEntries),
  ]);
}

export function deleteLastReadBooks(bookSlugs: ReadonlySet<string>): void {
  if (typeof window === "undefined" || bookSlugs.size === 0) return;

  const current = getLastReadChapters();
  const remaining = current.filter(
    (entry) => !bookSlugs.has(entry.bookSlug),
  );
  if (remaining.length === current.length) return;

  cachedEntries = remaining;

  try {
    if (remaining.length === 0) {
      localStorage.removeItem(LAST_READ_STORAGE_KEY);
    } else {
      localStorage.setItem(LAST_READ_STORAGE_KEY, JSON.stringify(remaining));
    }
  } catch {
    // 저장 공간에 접근할 수 없어도 현재 화면에서는 선택한 기록을 제외합니다.
  }

  notifyLastReadUpdated();
}

export function getLastReadHref(item: LastReadChapter): string {
  const verse = item.verse ?? 1;
  return `/read/${item.bookSlug}/${item.chapter}#verse-${verse}`;
}

export function formatLastReadReference(item: LastReadChapter): string {
  const verse = item.verse ?? 1;
  return `${item.bookName} ${item.chapter}장 ${verse}절`;
}

function notifyLastReadUpdated(): void {
  window.dispatchEvent(new Event(LAST_READ_UPDATED_EVENT));
}

function isSameReadPosition(
  left: LastReadChapter,
  right: LastReadChapter,
): boolean {
  return (
    left.bookSlug === right.bookSlug &&
    left.chapter === right.chapter &&
    left.verse === right.verse &&
    left.koreanText === right.koreanText
  );
}

export function saveLastReadChapter(
  bookSlug: string,
  bookName: string,
  chapter: number,
  verse: number,
  koreanText?: string,
): void {
  if (typeof window === "undefined") return;
  if (!Number.isInteger(verse) || verse < 1) return;

  const entry: LastReadChapter = {
    bookSlug,
    bookName,
    chapter,
    verse,
    koreanText: koreanText?.trim() || undefined,
    readAt: new Date().toISOString(),
  };

  const existing = getLastReadChapters();
  const latest = existing.find(
    (item) => item.bookSlug === bookSlug && item.chapter === chapter,
  );
  if (latest && isSameReadPosition(latest, entry)) return;

  const updated = [
    entry,
    ...existing.filter(
      (item) => !(item.bookSlug === bookSlug && item.chapter === chapter),
    ),
  ].slice(0, MAX_LAST_READ_COUNT);

  cachedEntries = updated;
  localStorage.setItem(LAST_READ_STORAGE_KEY, JSON.stringify(updated));
  notifyLastReadUpdated();
}
