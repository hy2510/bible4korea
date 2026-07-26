import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { parseStrongsQuery } from "@/lib/strongs-links";
import { getKoreanGloss } from "@/lib/strongs-ko-db";

const DB_PATH = path.join(process.cwd(), "data", "bible-search.sqlite");
const PAGE_SIZE = 10;

export interface BibleSearchResult {
  bookSlug: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
}

export interface BibleSearchBookGroup {
  bookSlug: string;
  bookName: string;
  count: number;
}

export interface BibleSearchBooksResponse {
  query: string;
  queryGloss?: string | null;
  total: number;
  view: "books";
  books: BibleSearchBookGroup[];
}

export interface BibleSearchVersesResponse {
  query: string;
  queryGloss?: string | null;
  bookSlug: string;
  bookName: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  view: "verses";
  results: BibleSearchResult[];
}

export type BibleSearchResponse =
  | BibleSearchBooksResponse
  | BibleSearchVersesResponse;

let db: Database.Database | null = null;
let strongsIndexReady: boolean | null = null;

function getDb(): Database.Database | null {
  if (db) return db;
  if (!fs.existsSync(DB_PATH)) return null;

  db = new Database(DB_PATH, { readonly: true, fileMustExist: true });
  return db;
}

function escapeFtsQuery(query: string): string {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term.replace(/"/g, "")}"*`)
    .join(" AND ");
}

export function isSearchDbReady(): boolean {
  return fs.existsSync(DB_PATH);
}

export function getBibleVerseCounts(): Record<string, number> {
  const database = getDb();
  if (!database) return {};

  const rows = database
    .prepare(
      `
      SELECT book_slug AS bookSlug, COUNT(*) AS totalVerses
      FROM verses
      GROUP BY book_slug
    `,
    )
    .all() as Array<{ bookSlug: string; totalVerses: number }>;

  return Object.fromEntries(
    rows.map(({ bookSlug, totalVerses }) => [bookSlug, totalVerses]),
  );
}

function getStrongsQueryGloss(query: string): string | null {
  const strongs = parseStrongsQuery(query);
  if (!strongs) return null;
  return getKoreanGloss(strongs);
}

function hasStrongsIndex(database: Database.Database): boolean {
  if (strongsIndexReady !== null) return strongsIndexReady;

  const row = database
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'verse_strongs'`,
    )
    .get() as { name: string } | undefined;
  strongsIndexReady = Boolean(row);
  return strongsIndexReady;
}

export function searchStrongsBookGroups(
  query: string,
): BibleSearchBooksResponse | null {
  const database = getDb();
  const strongs = parseStrongsQuery(query);
  if (!database || !strongs || !hasStrongsIndex(database)) return null;

  const rows = database
    .prepare(
      `
      SELECT
        verses.book_slug AS bookSlug,
        verses.book_name AS bookName,
        COUNT(*) AS count
      FROM verse_strongs
      JOIN verses ON verses.id = verse_strongs.verse_id
      WHERE verse_strongs.strongs = ?
      GROUP BY verses.book_slug
      ORDER BY MIN(verses.id)
    `,
    )
    .all(strongs) as BibleSearchBookGroup[];

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return {
    query: strongs,
    queryGloss: getStrongsQueryGloss(strongs),
    total,
    view: "books",
    books: rows,
  };
}

export function searchStrongsVerses(
  query: string,
  page = 1,
  pageSize = PAGE_SIZE,
  bookSlug?: string,
): BibleSearchVersesResponse | null {
  const database = getDb();
  const strongs = parseStrongsQuery(query);
  if (!database || !strongs || !hasStrongsIndex(database)) return null;

  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * pageSize;
  const bookFilter = bookSlug ? "AND verses.book_slug = ?" : "";
  const countParams = bookSlug ? [strongs, bookSlug] : [strongs];
  const listParams = bookSlug
    ? [strongs, bookSlug, pageSize, offset]
    : [strongs, pageSize, offset];

  const countRow = database
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM verse_strongs
      JOIN verses ON verses.id = verse_strongs.verse_id
      WHERE verse_strongs.strongs = ?
      ${bookFilter}
    `,
    )
    .get(...countParams) as { total: number };

  const rows = database
    .prepare(
      `
      SELECT
        verses.book_slug AS bookSlug,
        verses.book_name AS bookName,
        verses.chapter AS chapter,
        verses.verse AS verse,
        verses.text AS text
      FROM verse_strongs
      JOIN verses ON verses.id = verse_strongs.verse_id
      WHERE verse_strongs.strongs = ?
      ${bookFilter}
      ORDER BY verses.id
      LIMIT ? OFFSET ?
    `,
    )
    .all(...listParams) as Array<{
      bookSlug: string;
      bookName: string;
      chapter: number;
      verse: number;
      text: string;
    }>;

  const total = countRow.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  let resolvedBookName = rows[0]?.bookName ?? "";
  if (bookSlug && !resolvedBookName) {
    const bookRow = database
      .prepare(
        `SELECT book_name AS bookName FROM verses WHERE book_slug = ? LIMIT 1`,
      )
      .get(bookSlug) as { bookName: string } | undefined;
    resolvedBookName = bookRow?.bookName ?? "";
  }

  return {
    query: strongs,
    queryGloss: getStrongsQueryGloss(strongs),
    bookSlug: bookSlug ?? rows[0]?.bookSlug ?? "",
    bookName: resolvedBookName,
    page: safePage,
    pageSize,
    total,
    totalPages,
    view: "verses",
    results: rows.map((row) => ({
      ...row,
      reference: `${row.bookName} ${row.chapter}:${row.verse}`,
    })),
  };
}

export function searchBookGroups(query: string): BibleSearchBooksResponse | null {
  if (parseStrongsQuery(query)) {
    return searchStrongsBookGroups(query);
  }
  const database = getDb();
  const trimmed = query.trim();
  if (!database || !trimmed) return null;

  const ftsQuery = escapeFtsQuery(trimmed);
  if (!ftsQuery) return null;

  const rows = database
    .prepare(
      `
      SELECT
        verses.book_slug AS bookSlug,
        verses.book_name AS bookName,
        COUNT(*) AS count
      FROM verses_fts
      JOIN verses ON verses.id = verses_fts.rowid
      WHERE verses_fts MATCH ?
      GROUP BY verses.book_slug
      ORDER BY MIN(verses.id)
    `,
    )
    .all(ftsQuery) as BibleSearchBookGroup[];

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return {
    query: trimmed,
    total,
    view: "books",
    books: rows,
  };
}

export function searchVerses(
  query: string,
  page = 1,
  pageSize = PAGE_SIZE,
  bookSlug?: string,
): BibleSearchVersesResponse | null {
  if (parseStrongsQuery(query)) {
    return searchStrongsVerses(query, page, pageSize, bookSlug);
  }

  const database = getDb();
  const trimmed = query.trim();
  if (!database || !trimmed) return null;

  const ftsQuery = escapeFtsQuery(trimmed);
  if (!ftsQuery) return null;

  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const offset = (safePage - 1) * pageSize;
  const bookFilter = bookSlug ? "AND verses.book_slug = ?" : "";
  const countParams = bookSlug ? [ftsQuery, bookSlug] : [ftsQuery];
  const listParams = bookSlug
    ? [ftsQuery, bookSlug, pageSize, offset]
    : [ftsQuery, pageSize, offset];

  const countRow = database
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM verses_fts
      JOIN verses ON verses.id = verses_fts.rowid
      WHERE verses_fts MATCH ?
      ${bookFilter}
    `,
    )
    .get(...countParams) as { total: number };

  const rows = database
    .prepare(
      `
      SELECT
        verses.book_slug AS bookSlug,
        verses.book_name AS bookName,
        verses.chapter AS chapter,
        verses.verse AS verse,
        verses.text AS text
      FROM verses_fts
      JOIN verses ON verses.id = verses_fts.rowid
      WHERE verses_fts MATCH ?
      ${bookFilter}
      ORDER BY verses.id
      LIMIT ? OFFSET ?
    `,
    )
    .all(...listParams) as Array<{
      bookSlug: string;
      bookName: string;
      chapter: number;
      verse: number;
      text: string;
    }>;

  const total = countRow.total;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  let resolvedBookName = rows[0]?.bookName ?? "";
  if (bookSlug && !resolvedBookName) {
    const bookRow = database
      .prepare(
        `SELECT book_name AS bookName FROM verses WHERE book_slug = ? LIMIT 1`,
      )
      .get(bookSlug) as { bookName: string } | undefined;
    resolvedBookName = bookRow?.bookName ?? "";
  }

  return {
    query: trimmed,
    bookSlug: bookSlug ?? rows[0]?.bookSlug ?? "",
    bookName: resolvedBookName,
    page: safePage,
    pageSize,
    total,
    totalPages,
    view: "verses",
    results: rows.map((row) => ({
      ...row,
      reference: `${row.bookName} ${row.chapter}:${row.verse}`,
    })),
  };
}
