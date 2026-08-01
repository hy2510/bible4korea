import { NextResponse } from "next/server";
import {
  getLocalKoreanBook,
  getLocalKoreanChapter,
  getLocalKoreanBookSlugs,
} from "@/lib/local-korean-bible";

interface RouteParams {
  params: Promise<{ book: string; chapter: string }>;
}

/** Local RNKSV JSON can be updated without a rebuild — avoid freezing responses. */
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: RouteParams) {
  const { book, chapter: chapterValue } = await params;
  const chapter = getLocalKoreanChapter(book, Number(chapterValue));

  if (!chapter) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(chapter, {
    headers: {
      "Cache-Control": "private, no-cache, must-revalidate",
    },
  });
}

/** Used by Next when statically analyzing available local chapters. */
export function generateStaticParams() {
  return getLocalKoreanBookSlugs().flatMap((bookSlug) => {
    const book = getLocalKoreanBook(bookSlug);
    const chapterCount = book?.chapters.length ?? 0;
    return Array.from({ length: chapterCount }, (_, index) => ({
      book: bookSlug,
      chapter: String(index + 1),
    }));
  });
}
