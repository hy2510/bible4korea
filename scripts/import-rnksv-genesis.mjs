import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";

const [csvPath, supplementalPath] = process.argv.slice(2);
const OUTPUT_PATH = path.join("data", "rnksv-genesis.json");
const SEARCH_DB_PATH = path.join("data", "bible-search.sqlite");
const EXPECTED_VERSE_COUNTS = [
  31, 25, 24, 26, 32, 22, 24, 22, 29, 32,
  32, 20, 18, 24, 21, 16, 27, 33, 38, 18,
  34, 24, 20, 67, 34, 35, 46, 22, 35, 43,
  55, 32, 20, 31, 29, 43, 36, 30, 23, 23,
  57, 38, 34, 34, 28, 34, 31, 22, 33, 26,
];
const COPYRIGHT_NOTICE =
  "본 제품에 사용한 『성경전서 새번역』의 저작권은 재단법인 대한성서공회 소유이며 재단법인 대한성서공회의 허락을 받고 사용하였음.";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (quoted) {
      if (character === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV의 따옴표가 닫히지 않았습니다.");
  if (field || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const [header, ...values] = rows;
  if (!header || header.join(",") !== "book,chapter,verse,text") {
    throw new Error("CSV 헤더는 book,chapter,verse,text 형식이어야 합니다.");
  }

  return values.filter((value) => value.some(Boolean)).map((value) => {
    if (value.length !== header.length) {
      throw new Error(`열 개수가 올바르지 않은 CSV 행이 있습니다: ${value.slice(0, 3).join(",")}`);
    }
    return Object.fromEntries(header.map((key, index) => [key, value[index]]));
  });
}

function buildGenesis(csvRows, supplements) {
  const chapters = Array.from({ length: 50 }, () => []);
  const seen = new Set();

  const addVerse = (chapter, verse, text, source) => {
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > 50) {
      throw new Error(`${source}: 잘못된 장 번호 ${chapter}`);
    }
    if (!Number.isInteger(verse) || verse < 1) {
      throw new Error(`${source}: 잘못된 절 번호 ${chapter}:${verse}`);
    }
    const normalizedText = text.trim();
    if (!normalizedText) throw new Error(`${source}: 빈 본문 ${chapter}:${verse}`);

    const key = `${chapter}:${verse}`;
    if (seen.has(key)) throw new Error(`${source}: 중복된 절 ${key}`);
    seen.add(key);
    chapters[chapter - 1].push({ verse, text: normalizedText });
  };

  for (const row of csvRows) {
    if (row.book !== "GEN") throw new Error(`창세기가 아닌 권 코드가 있습니다: ${row.book}`);
    addVerse(Number(row.chapter), Number(row.verse), row.text, "CSV");
  }

  for (const supplement of Object.values(supplements)) {
    for (const row of supplement.verses ?? []) {
      addVerse(Number(supplement.chapter), Number(row.verse), row.text, "보완 본문");
    }
  }

  for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex += 1) {
    const chapter = chapterIndex + 1;
    const verses = chapters[chapterIndex].sort((a, b) => a.verse - b.verse);
    const expectedCount = EXPECTED_VERSE_COUNTS[chapterIndex];
    if (verses.length !== expectedCount) {
      throw new Error(`${chapter}장 절 수 불일치: ${verses.length}/${expectedCount}`);
    }
    verses.forEach((row, index) => {
      if (row.verse !== index + 1) {
        throw new Error(`${chapter}장 ${index + 1}절이 누락되었습니다.`);
      }
    });
  }

  return {
    version: "RNKSV",
    translation: "새번역",
    bookSlug: "genesis",
    bookName: "창세기",
    sourceUrl: "https://bible.bskorea.or.kr/bible/RNKSV/GEN.1",
    copyrightNotice: COPYRIGHT_NOTICE,
    chapters: chapters.map((verses) => verses.map(({ text }) => text)),
  };
}

function rebuildSearchDatabase(genesis) {
  if (!fs.existsSync(SEARCH_DB_PATH)) {
    console.log("검색 DB가 없어 본문 JSON만 생성합니다.");
    return;
  }

  const sourceDb = new Database(SEARCH_DB_PATH, {
    readonly: true,
    fileMustExist: true,
  });
  const otherVerses = sourceDb
    .prepare(
      `SELECT book_slug, book_name, chapter, verse, text
       FROM verses
       WHERE book_slug <> 'genesis'
       ORDER BY id`,
    )
    .all();
  const previousCount = sourceDb.prepare("SELECT COUNT(*) AS count FROM verses").get().count;
  const previousGenesisCount = sourceDb
    .prepare("SELECT COUNT(*) AS count FROM verses WHERE book_slug = 'genesis'")
    .get().count;
  sourceDb.close();

  const tempPath = path.join("data", `.bible-search-rnksv-${process.pid}.sqlite`);
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

  const genesisRows = genesis.chapters.flatMap((verses, chapterIndex) =>
    verses.map((text, verseIndex) => ({
      book_slug: genesis.bookSlug,
      book_name: genesis.bookName,
      chapter: chapterIndex + 1,
      verse: verseIndex + 1,
      text,
    })),
  );

  insertRows([...genesisRows, ...otherVerses]);
  const expectedCount = previousCount - previousGenesisCount + genesisRows.length;
  const actualCount = db.prepare("SELECT COUNT(*) AS count FROM verses").get().count;
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
  console.log(`검색 DB 창세기 본문 갱신: ${genesisRows.length.toLocaleString()}절`);
}

if (!csvPath || !supplementalPath) {
  fail("사용법: node scripts/import-rnksv-genesis.mjs <CSV 경로> <보완 JSON 경로>");
}
if (!fs.existsSync(csvPath)) fail(`CSV 파일을 찾을 수 없습니다: ${csvPath}`);
if (!fs.existsSync(supplementalPath)) fail(`보완 JSON을 찾을 수 없습니다: ${supplementalPath}`);

try {
  const csvRows = parseCsv(fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, ""));
  const supplements = JSON.parse(fs.readFileSync(supplementalPath, "utf8"));
  const genesis = buildGenesis(csvRows, supplements);
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(genesis)}\n`, "utf8");
  rebuildSearchDatabase(genesis);
  console.log(`새번역 창세기 데이터 생성: ${OUTPUT_PATH} (50장, 1,533절)`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
