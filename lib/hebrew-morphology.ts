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

/** 히브리어 니쿠드·악센트 등 */
const HEBREW_MARKS_RE = /[\u0591-\u05C7]/g;

export function parseStrongsNumber(lemma: string): string {
  const match = lemma.match(/H(\d+)/);
  return match ? `H${match[1]}` : lemma;
}

export function formatHebrewWord(text: string): string {
  return text.replace(/\//g, "");
}

function hasHebrewVowels(text: string): boolean {
  return HEBREW_MARKS_RE.test(text);
}

function hebrewConsonantsOnly(text: string): string {
  return text
    .replace(HEBREW_MARKS_RE, "")
    .replace(/\//g, "")
    .replace(/[^\u05D0-\u05EA]/g, "");
}

function cleanPointedHebrewWord(text: string): string {
  return text
    .replace(/[\u05C3\u05C0]/g, "") // sof pasuq, paseq
    .trim();
}

/**
 * morphhb(Strong's) + WLC 등 모음 표기를 맞춰, 화면에는 모음이 있는 본문을 씁니다.
 */
function mergePointedSurfaceText(
  morphVerse: HebrewWord[],
  pointedVerse: Array<{ text: string; strongs?: string }>,
): HebrewWord[] {
  if (morphVerse.length === 0 || pointedVerse.length === 0) {
    return morphVerse;
  }

  const pointedWords = pointedVerse
    .map((word) => ({
      text: cleanPointedHebrewWord(word.text),
      strongs: word.strongs ?? "",
    }))
    .filter((word) => word.text.length > 0);

  if (pointedWords.length === 0) return morphVerse;

  if (pointedWords.length === morphVerse.length) {
    return morphVerse.map((word, index) => {
      const pointed = pointedWords[index]?.text;
      if (!pointed || !hasHebrewVowels(pointed)) return word;
      if (
        hebrewConsonantsOnly(word.text) === hebrewConsonantsOnly(pointed) ||
        !hasHebrewVowels(word.text)
      ) {
        return {
          ...word,
          text: pointed,
          strongs: word.strongs || pointedWords[index]?.strongs || "",
        };
      }
      return word;
    });
  }

  const used = new Set<number>();
  return morphVerse.map((word) => {
    const morphCons = hebrewConsonantsOnly(word.text);
    if (!morphCons) return word;

    const matchIndex = pointedWords.findIndex(
      (candidate, index) =>
        !used.has(index) &&
        hebrewConsonantsOnly(candidate.text) === morphCons,
    );
    if (matchIndex < 0) return word;
    used.add(matchIndex);

    const pointed = pointedWords[matchIndex];
    if (
      !pointed ||
      (hasHebrewVowels(word.text) && !hasHebrewVowels(pointed.text))
    ) {
      return word;
    }

    return {
      ...word,
      text: pointed.text,
      strongs: word.strongs || pointed.strongs || "",
    };
  });
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

  const [local, fromBss] = await Promise.all([
    getHebrewWordsForChapterLocal(book, chapter),
    fetchBssChapterWords(book, chapter),
  ]);

  if (local && fromBss) {
    return local.map((verse, verseIndex) =>
      mergePointedSurfaceText(verse, fromBss[verseIndex] ?? []),
    );
  }

  if (local) return local;
  if (fromBss) return fromBss;
  return null;
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
