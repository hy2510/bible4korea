export function getVerseFromHash(): number | null {
  if (typeof window === "undefined") return null;

  const match = window.location.hash.match(/^#verse-(\d+)$/);
  if (!match) return null;

  const verse = Number.parseInt(match[1], 10);
  return Number.isInteger(verse) && verse >= 1 ? verse : null;
}
