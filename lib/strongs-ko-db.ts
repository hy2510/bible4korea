import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { simplifyGloss } from "@/lib/strongs-gloss";
import {
  extractHebrewRootKey,
  formatHebrewRootText,
} from "@/lib/hebrew-gematria";

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

function hasRootKeyColumn(database: Database.Database): boolean {
  const columns = database
    .prepare(`PRAGMA table_info(strongs_hebrew)`)
    .all() as Array<{ name: string }>;
  return columns.some((column) => column.name === "root_key");
}

export function getKoreanGloss(strongs: string): string | null {
  const entry = getStrongsEntry(strongs);
  return entry?.gloss ?? null;
}

export interface StrongsEntry {
  strongs: string;
  gloss: string | null;
  definition: string | null;
  original: string | null;
  gematria: number | null;
  rootKey: string | null;
  rootText: string | null;
}

export function getStrongsEntry(strongs: string): StrongsEntry | null {
  const parsed = parseStrongsNumber(strongs);
  if (!parsed) return null;

  const override = getGlossOverride(parsed.language, parsed.number);
  const database = getDb();
  if (!database) {
    if (override === undefined) return null;
    return {
      strongs: `${parsed.language === "hebrew" ? "H" : "G"}${parsed.number}`,
      gloss: override,
      definition: override,
      original: null,
      gematria: null,
      rootKey: null,
      rootText: null,
    };
  }

  const table = getTableName(parsed.language);
  const rootKeyColumn =
    parsed.language === "hebrew" && hasRootKeyColumn(database);
  const row = database
    .prepare(
      parsed.language === "hebrew"
        ? rootKeyColumn
          ? `SELECT gloss, definition, original, gematria, root_key FROM ${table} WHERE number = ?`
          : `SELECT gloss, definition, original, gematria FROM ${table} WHERE number = ?`
        : `SELECT gloss, definition, original FROM ${table} WHERE number = ?`,
    )
    .get(parsed.number) as
    | {
        gloss: string;
        definition: string;
        original?: string;
        gematria?: number;
        root_key?: string;
      }
    | undefined;

  if (!row && override === undefined) return null;

  const gloss =
    override !== undefined ? override : simplifyGloss(row?.gloss ?? null);
  const definition = row?.definition?.trim() || gloss;
  const original = row?.original?.trim() || null;
  const rootKey =
    parsed.language === "hebrew"
      ? row?.root_key?.trim() || extractHebrewRootKey(original ?? "")
      : "";

  return {
    strongs: `${parsed.language === "hebrew" ? "H" : "G"}${parsed.number}`,
    gloss,
    definition: definition || null,
    original,
    gematria:
      parsed.language === "hebrew" && typeof row?.gematria === "number"
        ? row.gematria
        : null,
    rootKey: rootKey || null,
    rootText: rootKey ? formatHebrewRootText(rootKey) : null,
  };
}

export type GematriaMatchKind = "root" | "number";
export type GematriaFilter = "all" | "root" | "number";

export interface GematriaMatch {
  strongs: string;
  original: string;
  gloss: string | null;
  gematria: number;
  rootKey: string;
  rootText: string;
  matchKind: GematriaMatchKind;
}

export function getStrongsByGematria(
  value: number,
  options: {
    page?: number;
    pageSize?: number;
    excludeStrongs?: string;
    sourceStrongs?: string;
    filter?: GematriaFilter;
  } = {},
): {
  value: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  filter: GematriaFilter;
  sourceRootKey: string | null;
  sourceRootText: string | null;
  counts: { all: number; root: number; number: number };
  matches: GematriaMatch[];
} | null {
  if (!Number.isInteger(value) || value < 0) return null;

  const database = getDb();
  if (!database) return null;

  const pageSize = Math.min(Math.max(options.pageSize ?? 10, 1), 50);
  const page = Math.max(options.page ?? 1, 1);
  const filter: GematriaFilter =
    options.filter === "root" || options.filter === "number"
      ? options.filter
      : "all";

  const exclude = options.excludeStrongs?.match(/^H(\d+)$/i);
  const excludeNumber = exclude
    ? Number.parseInt(exclude[1], 10)
    : null;

  const source = options.sourceStrongs?.match(/^H(\d+)$/i);
  const sourceNumber = source ? Number.parseInt(source[1], 10) : null;
  const rootKeyColumn = hasRootKeyColumn(database);

  let sourceRootKey = "";
  if (sourceNumber !== null) {
    const sourceRow = database
      .prepare(
        rootKeyColumn
          ? `SELECT original, root_key FROM strongs_hebrew WHERE number = ?`
          : `SELECT original FROM strongs_hebrew WHERE number = ?`,
      )
      .get(sourceNumber) as
      | { original?: string; root_key?: string }
      | undefined;
    sourceRootKey =
      sourceRow?.root_key?.trim() ||
      extractHebrewRootKey(sourceRow?.original ?? "");
  }

  const baseWhere =
    excludeNumber === null
      ? `gematria = ?`
      : `gematria = ? AND number != ?`;
  const baseParams: Array<number | string> =
    excludeNumber === null ? [value] : [value, excludeNumber];

  const countAll = (
    database
      .prepare(`SELECT COUNT(*) AS count FROM strongs_hebrew WHERE ${baseWhere}`)
      .get(...baseParams) as { count: number }
  ).count;

  let countRoot = 0;
  let countNumber = countAll;

  if (sourceRootKey) {
    if (rootKeyColumn) {
      countRoot = (
        database
          .prepare(
            `SELECT COUNT(*) AS count FROM strongs_hebrew
             WHERE ${baseWhere} AND root_key = ? AND root_key != ''`,
          )
          .get(...baseParams, sourceRootKey) as { count: number }
      ).count;
      countNumber = (
        database
          .prepare(
            `SELECT COUNT(*) AS count FROM strongs_hebrew
             WHERE ${baseWhere} AND (root_key != ? OR root_key = '')`,
          )
          .get(...baseParams, sourceRootKey) as { count: number }
      ).count;
    } else {
      const allRows = database
        .prepare(
          `SELECT number, original FROM strongs_hebrew WHERE ${baseWhere}`,
        )
        .all(...baseParams) as Array<{ number: number; original: string }>;
      countRoot = allRows.filter(
        (row) => extractHebrewRootKey(row.original) === sourceRootKey,
      ).length;
      countNumber = allRows.length - countRoot;
    }
  } else {
    countRoot = 0;
    countNumber = countAll;
  }

  let filterWhere = baseWhere;
  const filterParams: Array<number | string> = [...baseParams];

  if (filter === "root") {
    if (!sourceRootKey) {
      return {
        value,
        page: 1,
        pageSize,
        total: 0,
        totalPages: 1,
        filter,
        sourceRootKey: null,
        sourceRootText: null,
        counts: { all: countAll, root: 0, number: countNumber },
        matches: [],
      };
    }
    if (rootKeyColumn) {
      filterWhere = `${baseWhere} AND root_key = ? AND root_key != ''`;
      filterParams.push(sourceRootKey);
    }
  } else if (filter === "number") {
    if (sourceRootKey && rootKeyColumn) {
      filterWhere = `${baseWhere} AND (root_key != ? OR root_key = '')`;
      filterParams.push(sourceRootKey);
    }
  }

  const total =
    filter === "root" ? countRoot : filter === "number" ? countNumber : countAll;
  const totalPages = Math.max(1, Math.ceil(Math.max(total, 1) / pageSize));
  const safePage = total === 0 ? 1 : Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  type Row = {
    number: number;
    original: string;
    gloss: string;
    gematria: number;
    root_key?: string;
  };

  let rows: Row[];

  if (
    !rootKeyColumn &&
    (filter === "root" || filter === "number") &&
    sourceRootKey
  ) {
    const allRows = database
      .prepare(
        `SELECT number, original, gloss, gematria FROM strongs_hebrew
         WHERE ${baseWhere}
         ORDER BY number`,
      )
      .all(...baseParams) as Row[];

    const classified = allRows
      .map((row) => {
        const rootKey = extractHebrewRootKey(row.original);
        return { ...row, root_key: rootKey };
      })
      .filter((row) =>
        filter === "root"
          ? row.root_key === sourceRootKey
          : row.root_key !== sourceRootKey,
      )
      .sort((a, b) => {
        const aRoot = a.root_key === sourceRootKey ? 0 : 1;
        const bRoot = b.root_key === sourceRootKey ? 0 : 1;
        if (aRoot !== bRoot) return aRoot - bRoot;
        return a.number - b.number;
      });

    rows = classified.slice(offset, offset + pageSize);
  } else {
    const orderBy =
      sourceRootKey && rootKeyColumn
        ? `CASE WHEN root_key = ? AND root_key != '' THEN 0 ELSE 1 END, number`
        : `number`;
    const orderParams =
      sourceRootKey && rootKeyColumn ? [sourceRootKey] : [];

    rows = database
      .prepare(
        rootKeyColumn
          ? `SELECT number, original, gloss, gematria, root_key
             FROM strongs_hebrew
             WHERE ${filterWhere}
             ORDER BY ${orderBy}
             LIMIT ? OFFSET ?`
          : `SELECT number, original, gloss, gematria
             FROM strongs_hebrew
             WHERE ${filterWhere}
             ORDER BY number
             LIMIT ? OFFSET ?`,
      )
      .all(...filterParams, ...orderParams, pageSize, offset) as Row[];
  }

  return {
    value,
    page: safePage,
    pageSize,
    total,
    totalPages: total === 0 ? 1 : totalPages,
    filter,
    sourceRootKey: sourceRootKey || null,
    sourceRootText: sourceRootKey
      ? formatHebrewRootText(sourceRootKey)
      : null,
    counts: {
      all: countAll,
      root: countRoot,
      number: countNumber,
    },
    matches: rows.map((row) => {
      const rootKey =
        row.root_key?.trim() || extractHebrewRootKey(row.original);
      const matchKind: GematriaMatchKind =
        sourceRootKey && rootKey === sourceRootKey ? "root" : "number";
      return {
        strongs: `H${row.number}`,
        original: row.original,
        gloss: simplifyGloss(row.gloss),
        gematria: row.gematria,
        rootKey,
        rootText: formatHebrewRootText(rootKey),
        matchKind,
      };
    }),
  };
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
