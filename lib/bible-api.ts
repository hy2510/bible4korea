import { getBookSync, getBooksSync } from "@/lib/bible-books";
import { getHebrewWordsForChapter, type HebrewWord } from "@/lib/hebrew-morphology";
import { getGreekWordsForChapter, type GreekWord } from "@/lib/greek-morphology";
import {
  fetchVerseOfDayFromApi,
  type VerseOfDay,
} from "@/lib/verse-of-day";
import { getLocalKoreanChapter } from "@/lib/local-korean-bible";

export type { VerseOfDay };

const API_BASE = "https://api.midvash.com/v1";
const USER_AGENT = "Bible4Korea/0.1.0";
export const BIBLE_VERSION = "kor";

export type Testament = "old" | "new";

export interface BibleBook {
  id: number;
  name: string;
  slug: string;
  koSlug: string;
  abbrev: string;
  chapters: number;
  testament: Testament;
  category: string;
}

interface ApiBook {
  id: number;
  name: { ko: string };
  slug: Record<string, string>;
  abbrev: { ko: string };
  chapters: number;
  testament: Testament;
  category: string;
}

interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

interface ChapterData {
  version: string;
  book: string;
  bookName: string;
  chapter: number;
  verses: string[];
}

export interface Chapter {
  bookSlug: string;
  bookName: string;
  chapter: number;
  verses: string[];
  translation?: string;
  version?: string;
}

export interface ParallelChapter extends Chapter {
  hebrewWordVerses: HebrewWord[][] | null;
  greekWordVerses: GreekWord[][] | null;
}

export type { HebrewWord, GreekWord };

export async function getVerseOfDay(): Promise<VerseOfDay> {
  return fetchVerseOfDayFromApi();
}

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      body?.error?.message ?? `API 요청 실패 (${res.status})`;
    throw new Error(message);
  }

  const json: ApiResponse<T> = await res.json();
  return json.data;
}

function mapBook(book: ApiBook): BibleBook {
  return {
    id: book.id,
    name: book.name.ko,
    slug: book.slug.en,
    koSlug: book.slug.ko,
    abbrev: book.abbrev.ko,
    chapters: book.chapters,
    testament: book.testament,
    category: book.category,
  };
}

export async function getBooks(): Promise<BibleBook[]> {
  return getBooksSync();
}

export async function getBook(slug: string): Promise<BibleBook | undefined> {
  return getBookSync(slug);
}

export async function resolveBookSlug(slug: string): Promise<string | undefined> {
  return getBookSync(slug)?.slug;
}

export async function getChapter(
  bookSlug: string,
  chapter: number,
  version = BIBLE_VERSION,
): Promise<Chapter> {
  const localChapter =
    version === BIBLE_VERSION
      ? getLocalKoreanChapter(bookSlug, chapter)
      : null;
  if (localChapter) return localChapter;

  const data = await fetchApi<ChapterData>(
    `/${version}/${bookSlug}/${chapter}`,
  );

  return {
    bookSlug: data.book,
    bookName: data.bookName,
    chapter: data.chapter,
    verses: data.verses,
  };
}

export async function getParallelChapter(
  book: BibleBook,
  chapter: number,
): Promise<ParallelChapter> {
  const [korean, hebrewWordVerses, greekWordVerses] = await Promise.all([
    getChapter(book.slug, chapter),
    book.testament === "old"
      ? getHebrewWordsForChapter(book, chapter)
      : Promise.resolve(null),
    book.testament === "new"
      ? getGreekWordsForChapter(book, chapter)
      : Promise.resolve(null),
  ]);

  return {
    ...korean,
    hebrewWordVerses,
    greekWordVerses,
  };
}
