export const VERSE_VIEW_MODE_KEY = "bible4korea:verse-view-mode";

export type VerseViewMode = "full" | "single";

export function getStoredVerseViewMode(): VerseViewMode {
  if (typeof window === "undefined") return "single";

  const stored = localStorage.getItem(VERSE_VIEW_MODE_KEY);
  if (stored === "full") return "full";
  return "single";
}

export function setStoredVerseViewMode(mode: VerseViewMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VERSE_VIEW_MODE_KEY, mode);
}
