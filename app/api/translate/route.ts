import { NextResponse } from "next/server";
import {
  checkPublicApiRateLimit,
  rateLimitResponse,
} from "@/lib/api-rate-limit.server";
import { translateTextsToKo } from "@/lib/translate-ko";

const MAX_TEXTS = 8;
const MAX_TEXT_LENGTH = 12_000;
const MAX_TOTAL_TEXT_LENGTH = 24_000;
const MAX_REQUEST_BYTES = 100_000;
export async function POST(request: Request) {
  const contentLength = Number.parseInt(
    request.headers.get("content-length") ?? "0",
    10,
  );
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json(
      { error: "Request body is too large." },
      { status: 413 },
    );
  }

  const rateLimit = await checkPublicApiRateLimit(
    request,
    "translation",
    20,
  );
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
  }

  let body: { texts?: unknown };

  try {
    body = (await request.json()) as { texts?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(body.texts) || body.texts.length === 0) {
    return NextResponse.json({ error: "texts array is required." }, { status: 400 });
  }

  if (body.texts.length > MAX_TEXTS) {
    return NextResponse.json({ error: "Too many texts." }, { status: 400 });
  }

  if (body.texts.some((value) => typeof value !== "string")) {
    return NextResponse.json(
      { error: "Every text must be a string." },
      { status: 400 },
    );
  }

  const texts = body.texts as string[];
  if (texts.some((text) => text.length > MAX_TEXT_LENGTH)) {
    return NextResponse.json(
      { error: "A text is too long." },
      { status: 413 },
    );
  }

  const totalLength = texts.reduce((sum, text) => sum + text.length, 0);
  if (totalLength > MAX_TOTAL_TEXT_LENGTH) {
    return NextResponse.json(
      { error: "Total text length is too large." },
      { status: 413 },
    );
  }

  try {
    const translations = await translateTextsToKo(texts);
    return NextResponse.json(
      { translations },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "번역에 실패했습니다." },
      { status: 502 },
    );
  }
}
