import { NextResponse } from "next/server";
import {
  extractVersesWithCommentary,
  fetchSefariaLinks,
  toSefariaChapterRef,
} from "@/lib/sefaria";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ book: string; chapter: string }> },
) {
  const { book, chapter: chapterParam } = await params;
  const chapter = Number.parseInt(chapterParam, 10);

  if (!Number.isInteger(chapter) || chapter < 1) {
    return NextResponse.json({ error: "Invalid chapter." }, { status: 400 });
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
