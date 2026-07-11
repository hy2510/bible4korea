import type { Chapter } from "@/lib/bible-api";
import type { VerseOfDay } from "@/lib/verse-of-day";
import { fetchVerseOfDayFromApi } from "@/lib/verse-of-day";

const API_BASE = "https://api.midvash.com/v1";

interface ApiResponse<T> {
  data: T;
}

interface ChapterData {
  version: string;
  book: string;
  bookName: string;
  chapter: number;
  verses: string[];
}

async function fetchMidvash<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`API 요청 실패 (${res.status})`);
  }

  const json: ApiResponse<T> = await res.json();
  return json.data;
}

export async function fetchChapter(
  bookSlug: string,
  chapter: number,
): Promise<Chapter> {
  const data = await fetchMidvash<ChapterData>(`/kor/${bookSlug}/${chapter}`);

  return {
    bookSlug: data.book,
    bookName: data.bookName,
    chapter: data.chapter,
    verses: data.verses,
  };
}

export async function fetchVerseOfDay(): Promise<VerseOfDay> {
  return fetchVerseOfDayFromApi();
}
