import { NextResponse } from "next/server";
import { searchBookGroups, searchVerses } from "@/lib/bible-search";

export const dynamic = "force-dynamic";
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const book = searchParams.get("book")?.trim() ?? "";
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(
    searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE),
    10,
  );

  if (!query) {
    return NextResponse.json(
      { error: "검색어를 입력해 주세요." },
      { status: 400 },
    );
  }

  const safePageSize =
    Number.isInteger(pageSize) && pageSize > 0
      ? Math.min(pageSize, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const results = book
    ? searchVerses(query, page, safePageSize, book)
    : searchBookGroups(query);

  if (!results) {
    return NextResponse.json(
      { error: "검색 인덱스를 사용할 수 없습니다." },
      { status: 503 },
    );
  }

  return NextResponse.json(results, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
    },
  });
}
