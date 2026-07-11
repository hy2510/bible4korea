import { NextResponse } from "next/server";
import { fetchVerseOfDayFromApi } from "@/lib/verse-of-day";

export async function GET() {
  try {
    const verse = await fetchVerseOfDayFromApi();
    return NextResponse.json(verse, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "오늘의 말씀을 불러올 수 없습니다." },
      { status: 502 },
    );
  }
}
