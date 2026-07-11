import { NextResponse } from "next/server";
import { getBookSync } from "@/lib/bible-books";
import { getGreekWordsForChapter } from "@/lib/greek-morphology";
import { getHebrewWordsForChapter } from "@/lib/hebrew-morphology";

interface RouteParams {
  params: Promise<{ book: string; chapter: string }>;
}

const MORPHOLOGY_CACHE_CONTROL =
  "public, max-age=31536000, stale-while-revalidate=86400";

export async function GET(_request: Request, { params }: RouteParams) {
  const { book: bookSlug, chapter: chapterStr } = await params;
  const chapter = Number(chapterStr);

  const book = getBookSync(bookSlug);
  if (!book || !Number.isInteger(chapter) || chapter < 1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
