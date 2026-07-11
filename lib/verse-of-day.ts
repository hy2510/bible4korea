import { getKstDateKey } from "@/lib/kst-date";

const API_BASE = "https://api.midvash.com/v1";
const USER_AGENT = "Bible4Korea/0.1.0";

export interface VerseOfDay {
  reference: string;
  text: string;
  bookSlug: string;
  chapter: number;
  verse: number;
}

interface VotdApiResponse {
  reference?: string;
  text?: string;
  book_slug?: string;
  chapter?: number;
  verse_start?: number;
}

function mapVotdResponse(data: VotdApiResponse): VerseOfDay | null {
  if (!data.reference || !data.text || !data.book_slug || !data.chapter) {
    return null;
  }

  return {
    reference: data.reference,
    text: data.text,
    bookSlug: data.book_slug,
    chapter: data.chapter,
    verse: data.verse_start ?? 1,
  };
}

export async function fetchVerseOfDayFromApi(): Promise<VerseOfDay> {
  const urls = [
    `${API_BASE}/votd?language=ko&day=${getKstDateKey()}`,
    `${API_BASE}/votd?language=ko`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        ...(typeof window === "undefined"
          ? { next: { revalidate: 3600 } }
          : {}),
      });

      if (!res.ok) continue;

      const data = (await res.json()) as VotdApiResponse;
      const verse = mapVotdResponse(data);
      if (verse) return verse;
    } catch {
      // try fallback URL
    }
  }

  throw new Error("오늘의 말씀을 불러올 수 없습니다.");
}
