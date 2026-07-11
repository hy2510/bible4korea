import { NextResponse } from "next/server";
import {
  fetchSefariaLinks,
  mapCommentaryLinks,
  toSefariaVerseRef,
} from "@/lib/sefaria";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ book: string; chapter: string; verse: string }> },
) {
  const { book, chapter: chapterParam, verse: verseParam } = await params;
  const chapter = Number.parseInt(chapterParam, 10);
  const verse = Number.parseInt(verseParam, 10);

  if (
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    !Number.isInteger(verse) ||
    verse < 1
  ) {
    return NextResponse.json({ error: "Invalid reference." }, { status: 400 });
  }

  const ref = toSefariaVerseRef(book, chapter, verse);
  if (!ref) {
    return NextResponse.json({ commentaries: [] });
  }

  try {
    const links = await fetchSefariaLinks(ref, true);
    return NextResponse.json(
      { commentaries: mapCommentaryLinks(links) },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Sefaria 주석을 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}
