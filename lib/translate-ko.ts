import { stripHtml } from "@/lib/html-text";

const MAX_CHUNK_LENGTH = 4500;
const TRANSLATION_TIMEOUT_MS = 10_000;
const MAX_TRANSLATION_CONCURRENCY = 3;

function splitTextForTranslation(text: string): string[] {
  if (text.length <= MAX_CHUNK_LENGTH) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > MAX_CHUNK_LENGTH) {
    const slice = remaining.slice(0, MAX_CHUNK_LENGTH);
    const splitAt = Math.max(
      slice.lastIndexOf("\n"),
      slice.lastIndexOf(". "),
      slice.lastIndexOf(" "),
    );
    const index = splitAt > MAX_CHUNK_LENGTH * 0.5 ? splitAt : MAX_CHUNK_LENGTH;
    chunks.push(remaining.slice(0, index).trim());
    remaining = remaining.slice(index).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

async function translateChunk(text: string): Promise<string> {
  const params = new URLSearchParams({
    client: "gtx",
    sl: "auto",
    tl: "ko",
    dt: "t",
    q: text,
  });

  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?${params.toString()}`,
    {
      headers: {
        "User-Agent": "bible4korea/1.0",
      },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(TRANSLATION_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.status}`);
  }

  const data = (await response.json()) as [
    Array<[string, string] | string> | undefined,
  ];
  const parts = data[0];

  if (!Array.isArray(parts)) return text;

  return parts
    .map((part) => (Array.isArray(part) ? part[0] : part))
    .join("")
    .trim();
}

export async function translateTextToKo(text: string): Promise<string> {
  const normalized = stripHtml(text).trim();
  if (!normalized) return "";

  const chunks = splitTextForTranslation(normalized);
  const translated: string[] = [];
  for (const chunk of chunks) {
    translated.push(await translateChunk(chunk));
  }
  return translated.join("\n\n").trim();
}

export async function translateTextsToKo(texts: string[]): Promise<string[]> {
  const results = new Array<string>(texts.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < texts.length) {
      const index = nextIndex++;
      results[index] = await translateTextToKo(texts[index]);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(MAX_TRANSLATION_CONCURRENCY, texts.length) },
      () => worker(),
    ),
  );
  return results;
}
