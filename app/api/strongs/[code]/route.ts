import { NextResponse } from "next/server";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";
import { fetchBssStrongsEntry } from "@/lib/bible-supersearch";
import { getStrongsEntry } from "@/lib/strongs-ko-db";
import { isLinkableStrongs } from "@/lib/strongs-links";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
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

  const rateLimit = await checkPublicApiRateLimit(
    request,
    "strongs-entry",
    180,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const localEntry = getStrongsEntry(strongs);
  const bssEntry = localEntry ? null : await fetchBssStrongsEntry(strongs);

  if (!localEntry && !bssEntry) {
    return NextResponse.json(
      { error: "해당 스트롱 코드의 설명을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      strongs,
      gloss: localEntry?.gloss ?? bssEntry?.gloss ?? null,
      definition:
        bssEntry?.definition ?? localEntry?.definition ?? null,
      original: localEntry?.original ?? bssEntry?.original ?? null,
      gematria: localEntry?.gematria ?? null,
      rootKey: localEntry?.rootKey ?? null,
      rootText: localEntry?.rootText ?? null,
      source: bssEntry ? "biblesupersearch" : "local",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
