import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";
import booksCatalog from "../data/books.json" with { type: "json" };

const RNKSV_DIR = path.join("data", "rnksv");
const SEARCH_DB_PATH = path.join("data", "bible-search.sqlite");
const BOOK_ORDER = new Map(
  booksCatalog.map((book, index) => [book.slug, index]),
);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function loadRnksvBooks() {
  if (!fs.existsSync(RNKSV_DIR)) {
    fail(`RNKSV 디렉터리를 찾을 수 없습니다: ${RNKSV_DIR}`);
  }

  const books = [];
  for (const fileName of fs.readdirSync(RNKSV_DIR)) {
    if (!fileName.startsWith("rnksv-") || !fileName.endsWith(".json")) continue;
    const filePath = path.join(RNKSV_DIR, fileName);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!data?.bookSlug || !Array.isArray(data.chapters)) {
      fail(`잘못된 RNKSV 파일 형식: ${filePath}`);
    }
    books.push(data);
  }

  if (books.length === 0) {
    fail(`적용할 RNKSV JSON이 없습니다: ${RNKSV_DIR}`);
  }

  books.sort((a, b) => {
    const aOrder = BOOK_ORDER.get(a.bookSlug) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = BOOK_ORDER.get(b.bookSlug) ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });

  return books;
}

function toVerseRows(book) {
  return book.chapters.flatMap((verses, chapterIndex) =>
    verses.map((text, verseIndex) => ({
      book_slug: book.bookSlug,
      book_name: book.bookName,
      chapter: chapterIndex + 1,
      verse: verseIndex + 1,
      text,
    })),
  );
}

function applyRnksvToSearchDatabase(books) {
  if (!fs.existsSync(SEARCH_DB_PATH)) {
    console.log("검색 DB가 없어 본문 JSON만 사용합니다.");
    return;
  }

  const localSlugs = books.map((book) => book.bookSlug);
  const placeholders = localSlugs.map(() => "?").join(", ");
  const sourceDb = new Database(SEARCH_DB_PATH, {
    readonly: true,
    fileMustExist: true,
  });
  const otherVerses = sourceDb
    .prepare(
      `SELECT book_slug, book_name, chapter, verse, text
       FROM verses
       WHERE book_slug NOT IN (${placeholders})
       ORDER BY id`,
    )
    .all(...localSlugs);
  const previousCount = sourceDb
    .prepare("SELECT COUNT(*) AS count FROM verses")
    .get().count;
  const previousLocalCount = sourceDb
    .prepare(
      `SELECT COUNT(*) AS count FROM verses WHERE book_slug IN (${placeholders})`,
    )
    .get(...localSlugs).count;
  sourceDb.close();

  const localRows = books.flatMap(toVerseRows);
  const tempPath = path.join(
    "data",
    `.bible-search-rnksv-${process.pid}.sqlite`,
  );
  if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

  const db = new Database(tempPath);
  db.exec(`
    CREATE TABLE verses (
      id INTEGER PRIMARY KEY,
      book_slug TEXT NOT NULL,
      book_name TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      text TEXT NOT NULL
    );

    CREATE VIRTUAL TABLE verses_fts USING fts5(
      text,
      book_name,
      content='verses',
      content_rowid='id',
      tokenize='unicode61'
    );

    CREATE INDEX idx_verses_location ON verses(book_slug, chapter, verse);

    CREATE TABLE verse_strongs (
      strongs TEXT NOT NULL,
      verse_id INTEGER NOT NULL,
      UNIQUE(strongs, verse_id),
      FOREIGN KEY (verse_id) REFERENCES verses(id)
    );

    CREATE INDEX idx_verse_strongs_code ON verse_strongs(strongs);
  `);

  const insertVerse = db.prepare(`
    INSERT INTO verses (book_slug, book_name, chapter, verse, text)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertFts = db.prepare(`
    INSERT INTO verses_fts (rowid, text, book_name)
    VALUES (?, ?, ?)
  `);
  const insertRows = db.transaction((rows) => {
    for (const row of rows) {
      const info = insertVerse.run(
        row.book_slug,
        row.book_name,
        row.chapter,
        row.verse,
        row.text,
      );
      insertFts.run(info.lastInsertRowid, row.text, row.book_name);
    }
  });

  insertRows([...localRows, ...otherVerses]);

  const expectedCount = previousCount - previousLocalCount + localRows.length;
  const actualCount = db.prepare("SELECT COUNT(*) AS count FROM verses").get()
    .count;
  if (actualCount !== expectedCount) {
    db.close();
    fs.unlinkSync(tempPath);
    throw new Error(`검색 DB 절 수 불일치: ${actualCount}/${expectedCount}`);
  }
  db.close();

  execFileSync(process.execPath, ["scripts/build-strongs-index.mjs", tempPath], {
    stdio: "inherit",
  });
  fs.renameSync(tempPath, SEARCH_DB_PATH);

  for (const book of books) {
    const verseCount = book.chapters.reduce(
      (sum, verses) => sum + verses.length,
      0,
    );
    console.log(
      `검색 DB 갱신: ${book.bookName} (${book.chapters.length}장, ${verseCount.toLocaleString()}절)`,
    );
  }
}

try {
  const books = loadRnksvBooks();
  applyRnksvToSearchDatabase(books);
  console.log(
    `로컬 RNKSV 적용 완료: ${books.map((book) => book.bookSlug).join(", ")}`,
  );
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
