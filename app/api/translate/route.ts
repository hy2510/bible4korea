import { NextResponse } from "next/server";
import { translateTextsToKo } from "@/lib/translate-ko";

export async function POST(request: Request) {
  let body: { texts?: unknown };

  try {
    body = (await request.json()) as { texts?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(body.texts) || body.texts.length === 0) {
    return NextResponse.json({ error: "texts array is required." }, { status: 400 });
  }

  if (body.texts.length > 8) {
    return NextResponse.json({ error: "Too many texts." }, { status: 400 });
  }

  const texts = body.texts.map((value) =>
    typeof value === "string" ? value : "",
  );

  try {
    const translations = await translateTextsToKo(texts);
    return NextResponse.json(
      { translations },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "번역에 실패했습니다." },
      { status: 502 },
    );
  }
}
