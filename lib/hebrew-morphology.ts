import morphhb from "morphhb";
import type { BibleBook } from "@/lib/bible-types";
import { fetchBssChapterWords } from "@/lib/bible-supersearch";
import { getKoreanGlosses } from "@/lib/strongs-ko-db";

export interface HebrewWord {
  text: string;
  strongs: string;
  gloss?: string | null;
}

const BOOK_SLUG_TO_MORPHHB: Record<string, string> = {
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
  "song-of-solomon": "Song of Solomon",
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

export function parseStrongsNumber(lemma: string): string {
  const match = lemma.match(/H(\d+)/);
  return match ? `H${match[1]}` : lemma;
}

export function formatHebrewWord(text: string): string {
  return text.replace(/\//g, "");
}

function getMorphhbBook(bookSlug: string) {
  const morphhbName = BOOK_SLUG_TO_MORPHHB[bookSlug];
  if (!morphhbName) return null;
  return morphhb[morphhbName] ?? null;
}

export async function getHebrewWordsForChapter(
  book: BibleBook,
  chapter: number,
): Promise<HebrewWord[][] | null> {
  if (book.testament !== "old") return null;

  const fromBss = await fetchBssChapterWords(book, chapter);
  const bssUsable =
    Boolean(fromBss) &&
    fromBss!.some((verse) =>
      verse.some((word) => Boolean(word.strongs) && Boolean(word.text)),
    );
  if (bssUsable) {
    return fromBss;
  }

  return getHebrewWordsForChapterLocal(book, chapter);
}

async function getHebrewWordsForChapterLocal(
  book: BibleBook,
  chapter: number,
): Promise<HebrewWord[][] | null> {
  const morphhbBook = getMorphhbBook(book.slug);
  if (!morphhbBook) return null;

  const chapterData = morphhbBook[chapter - 1];
  if (!chapterData) return null;

  const verses = chapterData.map((verse) =>
    verse.map(([text, lemma]) => ({
      text: formatHebrewWord(text),
      strongs: parseStrongsNumber(lemma),
    })),
  );

  const strongsNumbers = verses.flatMap((verse) =>
    verse.map((word) => word.strongs),
  );
  const glossMap = getKoreanGlosses(strongsNumbers);

  return verses.map((verse) =>
    verse.map((word) => ({
      ...word,
      gloss: glossMap.get(word.strongs) ?? null,
    })),
  );
}
