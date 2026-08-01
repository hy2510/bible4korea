import { NextResponse } from "next/server";
import { getLocalKoreanChapter } from "@/lib/local-korean-bible";

interface RouteParams {
  params: Promise<{ book: string; chapter: string }>;
}

const BIBLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from({ length: 50 }, (_, index) => ({
    book: "genesis",
    chapter: String(index + 1),
  }));
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { book, chapter: chapterValue } = await params;
  const chapter = getLocalKoreanChapter(book, Number(chapterValue));

  if (!chapter) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(chapter, {
    headers: { "Cache-Control": BIBLE_CACHE_CONTROL },
  });
}

