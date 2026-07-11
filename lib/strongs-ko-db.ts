import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { simplifyGloss } from "@/lib/strongs-gloss";

const DB_PATH = path.join(process.cwd(), "data", "strongs-hebrew-ko.sqlite");
const BATCH_SIZE = 500;

let db: Database.Database | null = null;

type StrongsLanguage = "hebrew" | "greek";

function getDb(): Database.Database | null {
  if (db) return db;
  if (!fs.existsSync(DB_PATH)) return null;

  db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  return db;
}

function parseStrongsNumber(
  strongs: string,
): { language: StrongsLanguage; number: number } | null {
  const hebrew = strongs.match(/^H(\d+)$/i);
  if (hebrew) {
    return { language: "hebrew", number: Number.parseInt(hebrew[1], 10) };
  }

  const greek = strongs.match(/^G(\d+)$/i);
  if (greek) {
    return { language: "greek", number: Number.parseInt(greek[1], 10) };
  }

  return null;
}

function getTableName(language: StrongsLanguage): string {
  return language === "hebrew" ? "strongs_hebrew" : "strongs_greek";
}

function getGlossOverride(
  language: StrongsLanguage,
  number: number,
): string | undefined {
  if (language === "hebrew" && number === 853) return "(그)";
  return undefined;
}

function fetchGlossBatch(
  database: Database.Database,
  table: "strongs_hebrew" | "strongs_greek",
  numbers: number[],
): Map<number, string | null> {
  const glossByNumber = new Map<number, string | null>();
  if (numbers.length === 0) return glossByNumber;

  for (let index = 0; index < numbers.length; index += BATCH_SIZE) {
    const chunk = numbers.slice(index, index + BATCH_SIZE);
    const placeholders = chunk.map(() => "?").join(", ");
    const rows = database
      .prepare(
        `SELECT number, gloss FROM ${table} WHERE number IN (${placeholders})`,
      )
      .all(...chunk) as Array<{ number: number; gloss: string }>;

    for (const row of rows) {
      glossByNumber.set(row.number, simplifyGloss(row.gloss));
    }
  }

  return glossByNumber;
}

export function getKoreanGloss(strongs: string): string | null {
  const parsed = parseStrongsNumber(strongs);
  if (!parsed) return null;

  const override = getGlossOverride(parsed.language, parsed.number);
  if (override !== undefined) return override;

  const database = getDb();
  if (!database) return null;

  const table = getTableName(parsed.language);
  const row = database
    .prepare(`SELECT gloss FROM ${table} WHERE number = ?`)
    .get(parsed.number) as { gloss: string } | undefined;

  return simplifyGloss(row?.gloss ?? null);
}

export function getKoreanGlosses(
  strongsNumbers: string[],
): Map<string, string | null> {
  const unique = [...new Set(strongsNumbers)];
  const result = new Map<string, string | null>();

  const database = getDb();
  if (!database) {
    for (const strongs of unique) result.set(strongs, null);
    return result;
  }

  const hebrewNumbers = new Set<number>();
  const greekNumbers = new Set<number>();
  const parsedByStrongs = new Map<
    string,
    { language: StrongsLanguage; number: number }
  >();

  for (const strongs of unique) {
    const parsed = parseStrongsNumber(strongs);
    if (!parsed) {
      result.set(strongs, null);
      continue;
    }

    parsedByStrongs.set(strongs, parsed);
    if (parsed.language === "hebrew") {
      hebrewNumbers.add(parsed.number);
    } else {
      greekNumbers.add(parsed.number);
    }
  }

  const hebrewGlosses = fetchGlossBatch(
    database,
    "strongs_hebrew",
    [...hebrewNumbers],
  );
  const greekGlosses = fetchGlossBatch(
    database,
    "strongs_greek",
    [...greekNumbers],
  );

  for (const [strongs, parsed] of parsedByStrongs) {
    const override = getGlossOverride(parsed.language, parsed.number);
    if (override !== undefined) {
      result.set(strongs, override);
      continue;
    }

    const glossMap =
      parsed.language === "hebrew" ? hebrewGlosses : greekGlosses;
    result.set(strongs, glossMap.get(parsed.number) ?? null);
  }

  return result;
}

export function isStrongsDbReady(): boolean {
  return fs.existsSync(DB_PATH);
}

export function getStrongsDbPath(): string {
  return DB_PATH;
}
