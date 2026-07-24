import { stripHtml } from "@/lib/html-text";

export interface SefariaLink {
  _id: string;
  index_title: string;
  category: string;
  type: string;
  ref: string;
  anchorRef: string;
  sourceRef: string;
  anchorVerse?: number;
  commentaryNum?: number;
  sourceHasEn?: boolean;
  collectiveTitle?: { en: string; he: string };
  heTitle?: string;
  text?: string;
  he?: string;
}

export interface SefariaCommentary {
  id: string;
  commentator: string;
  commentatorHe?: string;
  ref: string;
  text: string;
  commentaryNum: number;
  sefariaUrl: string;
}

export interface SefariaCommentatorGroup {
  commentator: string;
  commentatorHe?: string;
  commentaries: SefariaCommentary[];
}

/** 구약(Tanakh) slug → Sefaria 영문 서명 */
const SEFARIA_BOOK_NAMES: Record<string, string> = {
  genesis: "Genesis",
  exodus: "Exodus",
  leviticus: "Leviticus",
  numbers: "Numbers",
  deuteronomy: "Deuteronomy",
  joshua: "Joshua",
  judges: "Judges",
  ruth: "Ruth",
  "1-samuel": "I Samuel",
  "2-samuel": "II Samuel",
  "1-kings": "I Kings",
  "2-kings": "II Kings",
  "1-chronicles": "I Chronicles",
  "2-chronicles": "II Chronicles",
  ezra: "Ezra",
  nehemiah: "Nehemiah",
  esther: "Esther",
  job: "Job",
  psalms: "Psalms",
  proverbs: "Proverbs",
  ecclesiastes: "Ecclesiastes",
  "song-of-solomon": "Song of Songs",
  isaiah: "Isaiah",
  jeremiah: "Jeremiah",
  lamentations: "Lamentations",
  ezekiel: "Ezekiel",
  daniel: "Daniel",
  hosea: "Hosea",
  joel: "Joel",
  amos: "Amos",
  obadiah: "Obadiah",
  jonah: "Jonah",
  micah: "Micah",
  nahum: "Nahum",
  habakkuk: "Habakkuk",
  zephaniah: "Zephaniah",
  haggai: "Haggai",
  zechariah: "Zechariah",
  malachi: "Malachi",
};

const SEFARIA_API = "https://www.sefaria.org/api/links";

export function getSefariaBookName(bookSlug: string): string | null {
  return SEFARIA_BOOK_NAMES[bookSlug] ?? null;
}

export function toSefariaChapterRef(bookSlug: string, chapter: number): string | null {
  const book = getSefariaBookName(bookSlug);
  if (!book) return null;
  return `${book}.${chapter}`;
}

export function toSefariaVerseRef(
  bookSlug: string,
  chapter: number,
  verse: number,
): string | null {
  const book = getSefariaBookName(bookSlug);
  if (!book) return null;
  return `${book}.${chapter}.${verse}`;
}

export function toSefariaUrl(ref: string): string {
  return `https://www.sefaria.org/${ref.replace(/ /g, "_")}`;
}

function normalizeSefariaField(
  value: unknown,
  joinWith = " ",
): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (Array.isArray(value)) {
    const parts = value
      .filter((part): part is string => typeof part === "string")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) return undefined;
    return parts.join(joinWith);
  }

  return undefined;
}

function parseVerseFromAnchorRef(anchorRef: string): number | null {
  const match = anchorRef.match(/:(\d+)$/);
  if (!match) return null;
  const verse = Number.parseInt(match[1], 10);
  return Number.isInteger(verse) && verse > 0 ? verse : null;
}

function hasEnglishCommentary(link: SefariaLink): boolean {
  if (link.category !== "Commentary") return false;
  if (link.sourceHasEn === false) return false;
  if (link.sourceHasEn === true) return true;
  return Boolean(normalizeSefariaField(link.text));
}

export function extractVersesWithCommentary(links: SefariaLink[]): number[] {
  const verses = new Set<number>();

  for (const link of links) {
    if (!hasEnglishCommentary(link)) continue;
    const verse =
      link.anchorVerse ?? parseVerseFromAnchorRef(link.anchorRef ?? "");
    if (verse) verses.add(verse);
  }

  return [...verses].sort((a, b) => a - b);
}

export function mapCommentaryLinks(links: SefariaLink[]): SefariaCommentary[] {
  const commentaries: SefariaCommentary[] = [];

  for (const link of links) {
    if (!hasEnglishCommentary(link)) continue;

    const rawText = normalizeSefariaField(link.text);
    if (!rawText) continue;
    const text = stripHtml(rawText);
    if (!text) continue;

    commentaries.push({
      id: link._id,
      commentator:
        link.collectiveTitle?.en ?? link.index_title.replace(/ on .+$/, ""),
      commentatorHe: link.collectiveTitle?.he ?? link.heTitle,
      ref: link.ref,
      text,
      commentaryNum: link.commentaryNum ?? 0,
      sefariaUrl: toSefariaUrl(link.ref),
    });
  }

  return commentaries
    .sort((a, b) => {
      const byCommentator = a.commentator.localeCompare(b.commentator, "en");
      if (byCommentator !== 0) return byCommentator;
      return a.commentaryNum - b.commentaryNum;
    });
}

export function groupCommentariesByCommentator(
  commentaries: SefariaCommentary[],
): SefariaCommentatorGroup[] {
  const groups = new Map<string, SefariaCommentatorGroup>();

  for (const commentary of commentaries) {
    const existing = groups.get(commentary.commentator);
    if (existing) {
      existing.commentaries.push(commentary);
      if (!existing.commentatorHe && commentary.commentatorHe) {
        existing.commentatorHe = commentary.commentatorHe;
      }
      continue;
    }

    groups.set(commentary.commentator, {
      commentator: commentary.commentator,
      commentatorHe: commentary.commentatorHe,
      commentaries: [commentary],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      commentaries: group.commentaries.sort(
        (a, b) => a.commentaryNum - b.commentaryNum,
      ),
    }))
    .sort((a, b) =>
      a.commentator.localeCompare(b.commentator, "en", { sensitivity: "base" }),
    );
}

export async function fetchSefariaLinks(
  ref: string,
  withText: boolean,
): Promise<SefariaLink[]> {
  const encodedRef = ref
    .split(".")
    .map((segment) => encodeURIComponent(segment))
    .join(".");
  const url = new URL(`${SEFARIA_API}/${encodedRef}`);
  url.searchParams.set("with_text", withText ? "1" : "0");
  url.searchParams.set("category", "Commentary");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Sefaria API error: ${response.status}`);
  }

  const data = (await response.json()) as SefariaLink[] | { error?: string };
  if (!Array.isArray(data)) return [];
  return data;
}
