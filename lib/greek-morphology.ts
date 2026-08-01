import fs from "node:fs";
import path from "node:path";
import type { BibleBook } from "@/lib/bible-types";
import { fetchBssChapterWords } from "@/lib/bible-supersearch";
import { getKoreanGlosses } from "@/lib/strongs-ko-db";

export interface GreekWord {
  text: string;
  strongs: string;
  gloss?: string | null;
}

const MORPHGNT_DIR = path.join(process.cwd(), "data", "morphgnt");
const LEMMA_MAP_PATH = path.join(process.cwd(), "data", "greek-lemma-strongs.json");

const BOOK_SLUG_TO_MORPHGNT_FILE: Record<string, string> = {
  matthew: "61-Mt-morphgnt.txt",
  mark: "62-Mk-morphgnt.txt",
  luke: "63-Lk-morphgnt.txt",
  john: "64-Jn-morphgnt.txt",
  acts: "65-Ac-morphgnt.txt",
  romans: "66-Ro-morphgnt.txt",
  "1-corinthians": "67-1Co-morphgnt.txt",
  "2-corinthians": "68-2Co-morphgnt.txt",
  galatians: "69-Ga-morphgnt.txt",
  ephesians: "70-Eph-morphgnt.txt",
  philippians: "71-Php-morphgnt.txt",
  colossians: "72-Col-morphgnt.txt",
  "1-thessalonians": "73-1Th-morphgnt.txt",
  "2-thessalonians": "74-2Th-morphgnt.txt",
  "1-timothy": "75-1Ti-morphgnt.txt",
  "2-timothy": "76-2Ti-morphgnt.txt",
  titus: "77-Tit-morphgnt.txt",
  philemon: "78-Phm-morphgnt.txt",
  hebrews: "79-Heb-morphgnt.txt",
  james: "80-Jas-morphgnt.txt",
  "1-peter": "81-1Pe-morphgnt.txt",
  "2-peter": "82-2Pe-morphgnt.txt",
  "1-john": "83-1Jn-morphgnt.txt",
  "2-john": "84-2Jn-morphgnt.txt",
  "3-john": "85-3Jn-morphgnt.txt",
  jude: "86-Jud-morphgnt.txt",
  revelation: "87-Re-morphgnt.txt",
};

type VerseKey = `${number}:${number}`;

interface ParsedMorphLine {
  chapter: number;
  verse: number;
  text: string;
  norm: string;
  lemma: string;
}

let lemmaToStrongs: Record<string, string> | null = null;
const bookCache = new Map<string, Map<VerseKey, ParsedMorphLine[]>>();

function loadLemmaMap(): Record<string, string> {
  if (lemmaToStrongs) return lemmaToStrongs;
  if (!fs.existsSync(LEMMA_MAP_PATH)) return {};

  lemmaToStrongs = JSON.parse(
    fs.readFileSync(LEMMA_MAP_PATH, "utf8"),
  ) as Record<string, string>;
  return lemmaToStrongs;
}

function lookupStrongs(lemma: string, norm: string): string | null {
  const map = loadLemmaMap();
  return map[lemma] ?? map[norm] ?? null;
}

function parseMorphgntBook(filePath: string): Map<VerseKey, ParsedMorphLine[]> {
  const content = fs.readFileSync(filePath, "utf8");
  const verses = new Map<VerseKey, ParsedMorphLine[]>();

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 7) continue;

    const ref = parts[0];
    const chapter = Number.parseInt(ref.slice(2, 4), 10);
    const verse = Number.parseInt(ref.slice(4, 6), 10);
    if (!Number.isInteger(chapter) || !Number.isInteger(verse)) continue;

    const text = parts[4];
    const norm = parts[5];
    const lemma = parts[6];
    const key = `${chapter}:${verse}` as VerseKey;

    const bucket = verses.get(key) ?? [];
    bucket.push({ chapter, verse, text, norm, lemma: lemma || norm });
    verses.set(key, bucket);
  }

  return verses;
}

function getBookVerses(bookSlug: string): Map<VerseKey, ParsedMorphLine[]> | null {
  const cached = bookCache.get(bookSlug);
  if (cached) return cached;

  const fileName = BOOK_SLUG_TO_MORPHGNT_FILE[bookSlug];
  if (!fileName) return null;

  const filePath = path.join(MORPHGNT_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;

  const parsed = parseMorphgntBook(filePath);
  bookCache.set(bookSlug, parsed);
  return parsed;
}

export async function getGreekWordsForChapter(
  book: BibleBook,
  chapter: number,
): Promise<GreekWord[][] | null> {
  if (book.testament !== "new") return null;

  const fromBss = await fetchBssChapterWords(book, chapter);
  const bssUsable =
    Boolean(fromBss) &&
    fromBss!.some((verse) =>
      verse.some((word) => Boolean(word.strongs) && Boolean(word.text)),
    );
  if (bssUsable) {
    return fromBss;
  }

  return getGreekWordsForChapterLocal(book, chapter);
}

async function getGreekWordsForChapterLocal(
  book: BibleBook,
  chapter: number,
): Promise<GreekWord[][] | null> {
  const bookVerses = getBookVerses(book.slug);
  if (!bookVerses) return null;

  const verseKeys = [...bookVerses.keys()]
    .filter((key) => key.startsWith(`${chapter}:`))
    .sort((a, b) => {
      const verseA = Number(a.split(":")[1]);
      const verseB = Number(b.split(":")[1]);
      return verseA - verseB;
    });

  if (verseKeys.length === 0) return null;

  // Index by verse number with explicit holes for MorphGNT-skipped verses
  // (e.g. Matt 17:21). Never compact into a dense array — that shifts later
  // verses and double-bundles Greek after Korean "(본문 없음)" slots.
  const maxVerse = Math.max(
    ...verseKeys.map((key) => Number(key.split(":")[1])),
  );
  const versesByNumber: ParsedMorphLine[][] = Array.from(
    { length: maxVerse },
    () => [],
  );

  for (let verseNum = 1; verseNum <= maxVerse; verseNum += 1) {
    versesByNumber[verseNum - 1] =
      bookVerses.get(`${chapter}:${verseNum}` as VerseKey) ?? [];
  }

  const strongsNumbers = versesByNumber.flatMap((verse) =>
    verse
      .map((word) => lookupStrongs(word.lemma, word.norm))
      .filter((strongs): strongs is string => Boolean(strongs)),
  );

  const glossMap = getKoreanGlosses(strongsNumbers);

  return versesByNumber.map((verse) =>
    verse.map((word) => {
      const strongs = lookupStrongs(word.lemma, word.norm);
      return {
        text: word.text,
        strongs: strongs ?? "",
        gloss: strongs ? glossMap.get(strongs) ?? null : null,
      };
    }),
  );
}
