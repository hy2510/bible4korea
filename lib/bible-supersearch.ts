import type { BibleBook } from "@/lib/bible-types";
import { getKoreanGlosses } from "@/lib/strongs-ko-db";

const BSS_API_BASE = "https://api.biblesupersearch.com/api";
const USER_AGENT = "Bible4Korea/0.1.0";

export interface BibleSuperSearchWord {
  text: string;
  strongs: string;
  gloss?: string | null;
}

interface BssVerseRow {
  book?: number | string;
  chapter?: number | string;
  verse?: number | string;
  text?: string;
  book_name?: string;
}

interface BssStrongsEntry {
  id?: string | number;
  number?: string | number;
  lemma?: string;
  definition?: string;
  etymology?: string;
  pronunciation?: string;
  xlit?: string;
  strongs_id?: string;
}

const BOOK_SLUG_TO_BSS_NAME: Record<string, string> = {
  genesis: "Genesis",
  exodus: "Exodus",
  leviticus: "Leviticus",
  numbers: "Numbers",
  deuteronomy: "Deuteronomy",
  joshua: "Joshua",
  judges: "Judges",
  ruth: "Ruth",
  "1-samuel": "1 Samuel",
  "2-samuel": "2 Samuel",
  "1-kings": "1 Kings",
  "2-kings": "2 Kings",
  "1-chronicles": "1 Chronicles",
  "2-chronicles": "2 Chronicles",
  ezra: "Ezra",
  nehemiah: "Nehemiah",
  esther: "Esther",
  job: "Job",
  psalms: "Psalm",
  proverbs: "Proverbs",
  ecclesiastes: "Ecclesiastes",
  "song-of-solomon": "Song of Solomon",
  isaiah: "Isaiah",
  jeremiah: "Jeremiah",
  lamentations: "Lamentations",
  ezekiel: "Ezekiel",
  daniel: "Daniel",
  hosea: "Hosea",
  joel: "Joel",
  amos: "Amos",
  obadiah: "Obadiah",
  jonah: "Jonah",
  micah: "Micah",
  nahum: "Nahum",
  habakkuk: "Habakkuk",
  zephaniah: "Zephaniah",
  haggai: "Haggai",
  zechariah: "Zechariah",
  malachi: "Malachi",
  matthew: "Matthew",
  mark: "Mark",
  luke: "Luke",
  john: "John",
  acts: "Acts",
  romans: "Romans",
  "1-corinthians": "1 Corinthians",
  "2-corinthians": "2 Corinthians",
  galatians: "Galatians",
  ephesians: "Ephesians",
  philippians: "Philippians",
  colossians: "Colossians",
  "1-thessalonians": "1 Thessalonians",
  "2-thessalonians": "2 Thessalonians",
  "1-timothy": "1 Timothy",
  "2-timothy": "2 Timothy",
  titus: "Titus",
  philemon: "Philemon",
  hebrews: "Hebrews",
  james: "James",
  "1-peter": "1 Peter",
  "2-peter": "2 Peter",
  "1-john": "1 John",
  "2-john": "2 John",
  "3-john": "3 John",
  jude: "Jude",
  revelation: "Revelation",
};

function bssModuleForBook(book: BibleBook): string {
  // OT: WLC Hebrew, NT: Textus Receptus Greek (parsed when available).
  return book.testament === "old" ? "wlc" : "trparsed";
}

function strongsPrefixForBook(book: BibleBook): "H" | "G" {
  return book.testament === "old" ? "H" : "G";
}

function normalizeStrongs(raw: string, prefix: "H" | "G"): string {
  const trimmed = raw.trim().toUpperCase();
  if (/^[HG]\d+$/.test(trimmed)) return trimmed;
  if (/^\d+$/.test(trimmed)) return `${prefix}${trimmed}`;
  const match = trimmed.match(/[HG]?(\d+)/);
  return match ? `${prefix}${match[1]}` : "";
}

/**
 * Parse Bible SuperSearch raw markup.
 * `word{123}` / `word{G123}` → text + Strong's.
 * Also accepts space-separated original-language tokens without Strong's.
 */
export function parseBssMarkedText(
  text: string,
  prefix: "H" | "G",
): BibleSuperSearchWord[] {
  const cleaned = text
    .replace(/‹|›/g, "")
    .replace(/\[|\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];

  const words: BibleSuperSearchWord[] = [];
  const tokenPattern =
    /([^\s{]+)(?:\{([HG]?\d+)\})?|(?:\{([HG]?\d+)\})/gi;
  let matched = false;

  for (const match of cleaned.matchAll(tokenPattern)) {
    matched = true;
    const textPart = (match[1] ?? "").trim();
    const strongsRaw = match[2] ?? match[3] ?? "";
    const strongs = strongsRaw ? normalizeStrongs(strongsRaw, prefix) : "";
    if (!textPart && !strongs) continue;
    words.push({
      text: textPart || strongs,
      strongs,
    });
  }

  if (matched && words.length > 0) return words;

  return cleaned
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({ text: part, strongs: "" }));
}

function isBssVerseRow(value: unknown): value is BssVerseRow {
  return Boolean(value) && typeof value === "object" && "text" in (value as object);
}

function collectVersesFromPayload(payload: unknown): BssVerseRow[] {
  if (!payload || typeof payload !== "object") return [];

  if (Array.isArray(payload)) {
    return payload.filter(isBssVerseRow);
  }

  const root = payload as Record<string, unknown>;

  const direct = root.verses;
  if (Array.isArray(direct)) {
    return direct.filter(isBssVerseRow);
  }

  const results = root.results;
  if (Array.isArray(results)) {
    const verses: BssVerseRow[] = [];
    for (const result of results) {
      if (!result || typeof result !== "object") continue;
      const verseList = (result as { verses?: unknown }).verses;
      if (!Array.isArray(verseList)) continue;
      for (const verse of verseList) {
        if (isBssVerseRow(verse)) verses.push(verse);
      }
    }
    if (verses.length > 0) return verses;
  }

  // raw / minimal:
  // - { wlc: [ { verse, text }, ... ] }
  // - { wlc: { "1": { "1": "text", ... } } }
  for (const value of Object.values(root)) {
    if (Array.isArray(value)) {
      const rows = value.filter(isBssVerseRow);
      if (rows.length > 0) return rows;
      continue;
    }

    if (!value || typeof value !== "object") continue;
    const nested = value as Record<string, unknown>;

    if (isBssVerseRow(nested)) {
      return [nested];
    }

    const chapterVerses: BssVerseRow[] = [];
    for (const [chapterKey, chapterValue] of Object.entries(nested)) {
      if (!chapterValue || typeof chapterValue !== "object") continue;

      if (isBssVerseRow(chapterValue)) {
        chapterVerses.push(chapterValue);
        continue;
      }

      for (const [verseKey, verseText] of Object.entries(
        chapterValue as Record<string, unknown>,
      )) {
        if (typeof verseText === "string") {
          chapterVerses.push({
            chapter: Number(chapterKey),
            verse: Number(verseKey),
            text: verseText,
          });
        } else if (isBssVerseRow(verseText)) {
          chapterVerses.push(verseText);
        }
      }
    }
    if (chapterVerses.length > 0) return chapterVerses;
  }

  return [];
}

async function fetchBssJson(
  pathWithQuery: string,
): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${BSS_API_BASE}${pathWithQuery}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchBssStrongsDefinitions(
  strongsNumbers: string[],
): Promise<Map<string, BssStrongsEntry>> {
  const unique = [...new Set(strongsNumbers.map((s) => s.toUpperCase()))].filter(
    Boolean,
  );
  const map = new Map<string, BssStrongsEntry>();
  if (unique.length === 0) return map;

  // API accepts comma-separated Strong's numbers.
  for (let i = 0; i < unique.length; i += 40) {
    const chunk = unique.slice(i, i + 40);
    const payload = await fetchBssJson(
      `/strongs?strongs=${encodeURIComponent(chunk.join(","))}`,
    );
    if (!payload) continue;

    const candidates: unknown[] = [];
    if (Array.isArray(payload.strongs)) candidates.push(...payload.strongs);
    if (Array.isArray(payload.results)) candidates.push(...payload.results);
    if (payload.results && typeof payload.results === "object") {
      candidates.push(...Object.values(payload.results as object));
    }

    for (const entry of candidates) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as BssStrongsEntry;
      const id = String(row.strongs_id ?? row.id ?? row.number ?? "").toUpperCase();
      if (!id) continue;
      const normalized = /^[HG]\d+$/.test(id)
        ? id
        : /^\d+$/.test(id)
          ? id
          : id;
      map.set(normalized, row);
      if (/^\d+$/.test(normalized)) {
        // Store both bare and prefixed forms when possible.
        map.set(`H${normalized}`, row);
        map.set(`G${normalized}`, row);
      }
    }
  }

  return map;
}

export async function fetchBssChapterWords(
  book: BibleBook,
  chapter: number,
): Promise<BibleSuperSearchWord[][] | null> {
  const bookName = BOOK_SLUG_TO_BSS_NAME[book.slug];
  if (!bookName || !Number.isInteger(chapter) || chapter < 1) return null;

  const bibleModule = bssModuleForBook(book);
  const prefix = strongsPrefixForBook(book);
  const reference = encodeURIComponent(`${bookName} ${chapter}`);

  const modulesToTry =
    book.testament === "old"
      ? [bibleModule, "wlc"]
      : [bibleModule, "tr", "kjv_strongs"];

  for (const bible of modulesToTry) {
    const payload = await fetchBssJson(
      `?bible=${encodeURIComponent(bible)}&reference=${reference}&markup=raw&data_format=raw`,
    );
    if (!payload) continue;

    // Some responses nest under results[bible] or data
    const dataRoot =
      (payload.results as Record<string, unknown> | undefined) ??
      (payload.data as Record<string, unknown> | undefined) ??
      payload;

    let verses = collectVersesFromPayload(dataRoot);
    if (verses.length === 0 && dataRoot && typeof dataRoot === "object") {
      // Try bible-keyed nesting: results.wlc / results.trparsed
      const bibleBucket = (dataRoot as Record<string, unknown>)[bible];
      if (bibleBucket) {
        verses = collectVersesFromPayload({ results: bibleBucket });
        if (verses.length === 0) {
          verses = collectVersesFromPayload(bibleBucket);
        }
      }
    }

    if (verses.length === 0) continue;

    const byNumber = new Map<number, BibleSuperSearchWord[]>();
    for (const row of verses) {
      const verseNum = Number(row.verse);
      if (!Number.isInteger(verseNum) || verseNum < 1 || !row.text) continue;
      byNumber.set(verseNum, parseBssMarkedText(row.text, prefix));
    }

    if (byNumber.size === 0) continue;

    const maxVerse = Math.max(...byNumber.keys());
    const chapterWords = Array.from({ length: maxVerse }, (_, index) => {
      return byNumber.get(index + 1) ?? [];
    });

    const strongsNumbers = chapterWords.flatMap((verse) =>
      verse.map((word) => word.strongs).filter(Boolean),
    );
    const [bssDefs, koreanGlosses] = await Promise.all([
      fetchBssStrongsDefinitions(strongsNumbers),
      Promise.resolve(getKoreanGlosses(strongsNumbers)),
    ]);

    return chapterWords.map((verse) =>
      verse.map((word) => {
        const bss = word.strongs
          ? bssDefs.get(word.strongs) ??
            bssDefs.get(word.strongs.replace(/^[HG]/, ""))
          : undefined;
        const bssGloss =
          bss?.definition?.split(/[;.]/)[0]?.trim() ||
          bss?.lemma ||
          null;
        return {
          ...word,
          gloss: koreanGlosses.get(word.strongs) ?? bssGloss,
        };
      }),
    );
  }

  return null;
}

export async function fetchBssStrongsEntry(strongs: string): Promise<{
  strongs: string;
  gloss: string | null;
  definition: string | null;
  original: string | null;
} | null> {
  const code = strongs.trim().toUpperCase();
  if (!/^[HG]\d+$/.test(code)) return null;

  const map = await fetchBssStrongsDefinitions([code]);
  const entry =
    map.get(code) ?? map.get(code.slice(1)) ?? map.values().next().value;
  if (!entry) return null;

  const definition =
    [entry.definition, entry.etymology].filter(Boolean).join("\n\n") || null;

  return {
    strongs: code,
    gloss: entry.definition?.split(/[;.]/)[0]?.trim() ?? entry.lemma ?? null,
    definition,
    original: entry.lemma ?? entry.xlit ?? null,
  };
}
