const MAX_CHUNK_LENGTH = 4500;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim(),
  );
}

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
  const translated = await Promise.all(chunks.map((chunk) => translateChunk(chunk)));
  return translated.join("\n\n").trim();
}

export async function translateTextsToKo(texts: string[]): Promise<string[]> {
  return Promise.all(texts.map((text) => translateTextToKo(text)));
}
