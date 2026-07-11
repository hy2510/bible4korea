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
    verse >= 1
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

function parseStoredEntries(raw: string): LastReadChapter[] {
  const parsed = JSON.parse(raw) as unknown;

  if (Array.isArray(parsed)) {
    return dedupeByChapter(
      parsed.filter(isValidEntry).map(normalizeEntry),
    ).slice(0, MAX_LAST_READ_COUNT);
  }

  if (isValidEntry(parsed)) {
    return [normalizeEntry(parsed)];
  }

  return [];
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
