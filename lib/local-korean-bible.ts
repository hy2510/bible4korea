import fs from "node:fs";
import path from "node:path";
import booksCatalog from "@/data/books.json";
import type { BibleBook } from "@/lib/bible-types";

interface LocalBibleData {
  version: string;
  translation: string;
  bookSlug: string;
  bookName: string;
  copyrightNotice: string;
  chapters: string[][];
}

export interface LocalKoreanChapter {
  bookSlug: string;
  bookName: string;
  chapter: number;
  verses: string[];
  translation: string;
  version: string;
}

const RNKSV_DIR = path.join(process.cwd(), "data", "rnksv");
const BOOK_ORDER = new Map(
  (booksCatalog as BibleBook[]).map((book, index) => [book.slug, index]),
);
const IS_DEV = process.env.NODE_ENV === "development";

const DEFAULT_COPYRIGHT_NOTICE =
  "본 제품에 사용한 『성경전서 새번역』의 저작권은 재단법인 대한성서공회 소유이며 재단법인 대한성서공회의 허락을 받고 사용하였음.";

function loadLocalBooks(): LocalBibleData[] {
  if (!fs.existsSync(RNKSV_DIR)) return [];

  const books: LocalBibleData[] = [];

  for (const fileName of fs.readdirSync(RNKSV_DIR)) {
    if (!fileName.startsWith("rnksv-") || !fileName.endsWith(".json")) continue;

    const data = JSON.parse(
      fs.readFileSync(path.join(RNKSV_DIR, fileName), "utf8"),
    ) as LocalBibleData;

    if (!data?.bookSlug || !Array.isArray(data.chapters)) continue;
    books.push(data);
  }

  books.sort((a, b) => {
    const aOrder = BOOK_ORDER.get(a.bookSlug) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = BOOK_ORDER.get(b.bookSlug) ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });

  return books;
}

let cachedBooks: LocalBibleData[] | null = null;
let cachedBooksSignature: string | null = null;

function getLocalBooksSignature(): string {
  if (!fs.existsSync(RNKSV_DIR)) return "missing";
  return fs
    .readdirSync(RNKSV_DIR)
    .filter(
      (fileName) =>
        fileName.startsWith("rnksv-") && fileName.endsWith(".json"),
    )
    .sort()
    .map((fileName) => {
      const stats = fs.statSync(path.join(RNKSV_DIR, fileName));
      return `${fileName}:${stats.size}:${stats.mtimeMs}`;
    })
    .join("|");
}

function getLocalBooks(): LocalBibleData[] {
  const signature = getLocalBooksSignature();
  if (!IS_DEV && cachedBooks && signature === cachedBooksSignature) {
    return cachedBooks;
  }
  const books = loadLocalBooks();
  if (!IS_DEV) {
    cachedBooks = books;
    cachedBooksSignature = signature;
  }
  return books;
}

function getBooksBySlug(): Map<string, LocalBibleData> {
  return new Map(getLocalBooks().map((book) => [book.bookSlug, book] as const));
}

export function getLocalKoreanBookSlugs(): string[] {
  return getLocalBooks().map((book) => book.bookSlug);
}

/** @deprecated Prefer getLocalKoreanBookSlugs() so disk updates are visible in dev. */
export const LOCAL_KOREAN_BOOK_SLUGS = getLocalKoreanBookSlugs();

export const RNKSV_COPYRIGHT_NOTICE =
  getLocalBooks()[0]?.copyrightNotice ?? DEFAULT_COPYRIGHT_NOTICE;

export function hasLocalKoreanBook(bookSlug: string): boolean {
  return getBooksBySlug().has(bookSlug);
}

export function getLocalKoreanBook(bookSlug: string): LocalBibleData | null {
  return getBooksBySlug().get(bookSlug) ?? null;
}

export function getLocalKoreanChapter(
  bookSlug: string,
  chapter: number,
): LocalKoreanChapter | null {
  const book = getBooksBySlug().get(bookSlug);
  if (
    !book ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    chapter > book.chapters.length
  ) {
    return null;
  }

  return {
    bookSlug: book.bookSlug,
    bookName: book.bookName,
    chapter,
    verses: book.chapters[chapter - 1],
    translation: book.translation,
    version: book.version,
  };
}
