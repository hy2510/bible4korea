import { NextResponse } from "next/server";
import { getBookSync } from "@/lib/bible-books";
import { getGreekWordsForChapter } from "@/lib/greek-morphology";
import { getHebrewWordsForChapter } from "@/lib/hebrew-morphology";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";

interface RouteParams {
  params: Promise<{ book: string; chapter: string }>;
}

const MORPHOLOGY_CACHE_CONTROL =
  "private, no-cache, must-revalidate";

export async function GET(request: Request, { params }: RouteParams) {
  const { book: bookSlug, chapter: chapterStr } = await params;
  const chapter = Number(chapterStr);

  const book = getBookSync(bookSlug);
  if (
    !book ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    chapter > book.chapters
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rateLimit = await checkPublicApiRateLimit(
    request,
    "bible-morphology",
    120,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const hebrewWordVerses =
    book.testament === "old"
      ? await getHebrewWordsForChapter(book, chapter)
      : null;
  const greekWordVerses =
    book.testament === "new"
      ? await getGreekWordsForChapter(book, chapter)
      : null;

  return NextResponse.json(
    { hebrewWordVerses, greekWordVerses },
    {
      headers: {
        "Cache-Control": MORPHOLOGY_CACHE_CONTROL,
      },
    },
  );
}
