import { NextResponse } from "next/server";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";
import {
  getStrongsByGematria,
  type GematriaFilter,
} from "@/lib/strongs-ko-db";

export const dynamic = "force-dynamic";

function parseFilter(value: string | null): GematriaFilter {
  if (value === "root" || value === "number") return value;
  return "all";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ value: string }> },
) {
  const { value: rawValue } = await context.params;
  const value = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(value) || value < 0) {
    return NextResponse.json(
      { error: "유효하지 않은 수치입니다." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const exclude = searchParams.get("exclude")?.trim() || undefined;
  const source = searchParams.get("source")?.trim() || undefined;
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(searchParams.get("pageSize") ?? "10", 10);
  const filter = parseFilter(searchParams.get("filter"));

  const rateLimit = await checkPublicApiRateLimit(
    request,
    "strongs-gematria",
    120,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  const result = getStrongsByGematria(value, {
    excludeStrongs: exclude,
    sourceStrongs: source ?? exclude,
    filter,
    page: Number.isInteger(page) ? page : 1,
    pageSize: Number.isInteger(pageSize) ? pageSize : 10,
  });

  if (!result) {
    return NextResponse.json(
      { error: "게마트리아 검색을 사용할 수 없습니다." },
      { status: 503 },
    );
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
