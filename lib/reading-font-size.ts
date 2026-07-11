export type ReadingFontSize = "small" | "normal" | "large";

export const READING_FONT_SIZE_STORAGE_KEY = "bible4korea:reading-font-size";
export const READING_FONT_SIZE_CHANGE_EVENT =
  "bible4korea:reading-font-size-change";

export function isReadingFontSize(
  value: string | null,
): value is ReadingFontSize {
  return value === "small" || value === "normal" || value === "large";
}

export function getStoredReadingFontSize(): ReadingFontSize {
  if (typeof window === "undefined") return "normal";

  try {
    const stored = localStorage.getItem(READING_FONT_SIZE_STORAGE_KEY);
    if (isReadingFontSize(stored)) return stored;
  } catch {
    // ignore storage errors
  }

  return "normal";
}

export function readInitialReadingFontSize(): ReadingFontSize {
  if (typeof window === "undefined") return "normal";

  const fromDom = document.documentElement.dataset.readingFontSize;
  if (fromDom === "small" || fromDom === "large") return fromDom;
  return "normal";
}

export function getReadingFontSizeSnapshot(): ReadingFontSize {
  return getStoredReadingFontSize();
}

export function getServerReadingFontSizeSnapshot(): ReadingFontSize {
  return "normal";
}

export function subscribeReadingFontSize(onStoreChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== READING_FONT_SIZE_STORAGE_KEY) return;
    applyReadingFontSize(getStoredReadingFontSize());
    onStoreChange();
  };

  window.addEventListener(READING_FONT_SIZE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(READING_FONT_SIZE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function applyReadingFontSize(size: ReadingFontSize): void {
  if (size === "normal") {
    delete document.documentElement.dataset.readingFontSize;
    return;
  }

  document.documentElement.dataset.readingFontSize = size;
}

export function saveReadingFontSize(size: ReadingFontSize): void {
  localStorage.setItem(READING_FONT_SIZE_STORAGE_KEY, size);
  applyReadingFontSize(size);
  window.dispatchEvent(new Event(READING_FONT_SIZE_CHANGE_EVENT));
}
