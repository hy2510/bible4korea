import { NextResponse } from "next/server";
import {
  extractVersesWithCommentary,
  fetchSefariaLinks,
  toSefariaChapterRef,
} from "@/lib/sefaria";
import { getBookSync } from "@/lib/bible-books";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ book: string; chapter: string }> },
) {
  const { book, chapter: chapterParam } = await params;
  const chapter = Number.parseInt(chapterParam, 10);
  const bibleBook = getBookSync(book);

  if (
    !bibleBook ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    chapter > bibleBook.chapters
  ) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const rateLimit = await checkPublicApiRateLimit(request, "sefaria-chapter", 120);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const ref = toSefariaChapterRef(book, chapter);
  if (!ref) {
    return NextResponse.json({ verses: [] });
  }

  try {
    const links = await fetchSefariaLinks(ref, false);
    return NextResponse.json(
      { verses: extractVersesWithCommentary(links) },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Sefaria 주석 정보를 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
