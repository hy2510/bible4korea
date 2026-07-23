import { NextResponse } from "next/server";
import { getStrongsEntry } from "@/lib/strongs-ko-db";
import { isLinkableStrongs } from "@/lib/strongs-links";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const strongs = code.trim().toUpperCase();

  if (!isLinkableStrongs(strongs)) {
    return NextResponse.json(
      { error: "유효하지 않은 스트롱 코드입니다." },
      { status: 400 },
    );
  }

  const entry = getStrongsEntry(strongs);
  if (!entry) {
    return NextResponse.json(
      { error: "해당 스트롱 코드의 설명을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json(entry, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
