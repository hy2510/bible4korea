import type { Chapter } from "@/lib/bible-types";

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
  // Avoid serving stale bible JSON previously cached as immutable.
  const localResponse = await fetch(
    `/api/bible/${bookSlug}/${chapter}?v=3`,
    { cache: "no-store" },
  );
  if (localResponse.ok) {
    return (await localResponse.json()) as Chapter;
  }

  const data = await fetchMidvash<ChapterData>(`/kor/${bookSlug}/${chapter}`);

  return {
    bookSlug: data.book,
    bookName: data.bookName,
    chapter: data.chapter,
    verses: data.verses,
  };
}
