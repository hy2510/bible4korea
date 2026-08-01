import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import morphhb from "morphhb";
import books from "../data/books.json" with { type: "json" };

const API_BASE = "https://api.midvash.com/v1";
const DB_PATH = path.join("data", "bible-search.sqlite");
const RNKSV_DIR = path.join("data", "rnksv");
const MORPHGNT_DIR = path.join("data", "morphgnt");
const LEMMA_MAP_PATH = path.join("data", "greek-lemma-strongs.json");
const CONCURRENCY = 12;

function loadLocalRnksvBooks() {
  if (!fs.existsSync(RNKSV_DIR)) return new Map();

  const books = new Map();
  for (const fileName of fs.readdirSync(RNKSV_DIR)) {
    if (!fileName.startsWith("rnksv-") || !fileName.endsWith(".json")) continue;
    const data = JSON.parse(
      fs.readFileSync(path.join(RNKSV_DIR, fileName), "utf8"),
    );
    if (data?.bookSlug && Array.isArray(data.chapters)) {
      books.set(data.bookSlug, data);
    }
  }
  return books;
}

const rnksvBooks = loadLocalRnksvBooks();

const BOOK_SLUG_TO_MORPHHB = {
  genesis: "Genesis",
  exodus: "Exodus",
  leviticus: "Leviticus",
  numbers: "Numbers",
  deuteronomy: "Deuteronomy",
  joshua: "Joshua",
  judges: "Judges",
  ruth: "Ruth",
  "1-samuel": "I Samuel",
  "2-samuel": "II Samuel",
  "1-kings": "I Kings",
  "2-kings": "II Kings",
  "1-chronicles": "I Chronicles",
  "2-chronicles": "II Chronicles",
  ezra: "Ezra",
  nehemiah: "Nehemiah",
  esther: "Esther",
  job: "Job",
  psalms: "Psalms",
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
};

const BOOK_SLUG_TO_MORPHGNT_FILE = {
  matthew: "61-Mt-morphgnt.txt",
  mark: "62-Mk-morphgnt.txt",
  luke: "63-Lk-morphgnt.txt",
  john: "64-Jn-morphgnt.txt",
  acts: "65-Ac-morphgnt.txt",
  romans: "66-Ro-morphgnt.txt",
  "1-corinthians": "67-1Co-morphgnt.txt",
  "2-corinthians": "68-2Co-morphgnt.txt",
  galatians: "69-Ga-morphgnt.txt",
  ephesians: "70-Eph-morphgnt.txt",
  philippians: "71-Php-morphgnt.txt",
  colossians: "72-Col-morphgnt.txt",
  "1-thessalonians": "73-1Th-morphgnt.txt",
  "2-thessalonians": "74-2Th-morphgnt.txt",
  "1-timothy": "75-1Ti-morphgnt.txt",
  "2-timothy": "76-2Ti-morphgnt.txt",
  titus: "77-Tit-morphgnt.txt",
  philemon: "78-Phm-morphgnt.txt",
  hebrews: "79-Heb-morphgnt.txt",
  james: "80-Jas-morphgnt.txt",
  "1-peter": "81-1Pe-morphgnt.txt",
  "2-peter": "82-2Pe-morphgnt.txt",
  "1-john": "83-1Jn-morphgnt.txt",
  "2-john": "84-2Jn-morphgnt.txt",
  "3-john": "85-3Jn-morphgnt.txt",
  jude: "86-Jud-morphgnt.txt",
  revelation: "87-Re-morphgnt.txt",
};

function parseHebrewStrongs(lemma) {
  const match = lemma.match(/H(\d+)/);
  return match ? `H${match[1]}` : null;
}

function isLinkableStrongs(strongs) {
  return /^H\d+$/.test(strongs) || /^G\d+$/.test(strongs);
}

function loadLemmaMap() {
  if (!fs.existsSync(LEMMA_MAP_PATH)) return {};
  return JSON.parse(fs.readFileSync(LEMMA_MAP_PATH, "utf8"));
}

function lookupGreekStrongs(lemmaMap, lemma, norm) {
  return lemmaMap[lemma] ?? lemmaMap[norm] ?? null;
}

function parseMorphgntBook(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const verses = new Map();

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 7) continue;

    const ref = parts[0];
    const chapter = Number.parseInt(ref.slice(2, 4), 10);
    const verse = Number.parseInt(ref.slice(4, 6), 10);
    if (!Number.isInteger(chapter) || !Number.isInteger(verse)) continue;

    const norm = parts[5];
    const lemma = parts[6] || norm;
    const key = `${chapter}:${verse}`;
    const bucket = verses.get(key) ?? [];
    bucket.push({ lemma, norm });
    verses.set(key, bucket);
  }

  return verses;
}

function buildVerseIdMap(db) {
  const rows = db
    .prepare("SELECT id, book_slug, chapter, verse FROM verses")
    .all();
  const map = new Map();

  for (const row of rows) {
    map.set(`${row.book_slug}:${row.chapter}:${row.verse}`, row.id);
  }

  return map;
}

function buildStrongsIndex(db) {
  const verseIdMap = buildVerseIdMap(db);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO verse_strongs (strongs, verse_id)
    VALUES (?, ?)
  `);
  const pairs = new Set();

  const addStrongsForVerse = (bookSlug, chapter, verse, strongs) => {
    if (!strongs || !isLinkableStrongs(strongs)) return;
    const verseId = verseIdMap.get(`${bookSlug}:${chapter}:${verse}`);
    if (!verseId) return;
    pairs.add(`${strongs}\0${verseId}`);
  };

  for (const [bookSlug, morphhbName] of Object.entries(BOOK_SLUG_TO_MORPHHB)) {
    const morphhbBook = morphhb[morphhbName];
    if (!morphhbBook) continue;

    morphhbBook.forEach((chapterVerses, chapterIndex) => {
      const chapter = chapterIndex + 1;
      chapterVerses.forEach((verseWords, verseIndex) => {
        const verse = verseIndex + 1;
        for (const [, lemma] of verseWords) {
          addStrongsForVerse(bookSlug, chapter, verse, parseHebrewStrongs(lemma));
        }
      });
    });
  }

  const lemmaMap = loadLemmaMap();
  for (const [bookSlug, fileName] of Object.entries(BOOK_SLUG_TO_MORPHGNT_FILE)) {
    const filePath = path.join(MORPHGNT_DIR, fileName);
    if (!fs.existsSync(filePath)) continue;

    const bookVerses = parseMorphgntBook(filePath);
    for (const [key, words] of bookVerses.entries()) {
      const [chapter, verse] = key.split(":").map(Number);
      for (const word of words) {
        addStrongsForVerse(
          bookSlug,
          chapter,
          verse,
          lookupGreekStrongs(lemmaMap, word.lemma, word.norm),
        );
      }
    }
  }

  const insertAll = db.transaction((entries) => {
    for (const entry of entries) {
      const [strongs, verseId] = entry.split("\0");
      insert.run(strongs, Number(verseId));
    }
  });

  insertAll([...pairs]);
  return pairs.size;
}

async function fetchChapter(bookSlug, chapter) {
  const localBook = rnksvBooks.get(bookSlug);
  if (localBook?.chapters?.[chapter - 1]) {
    return {
      book: localBook.bookSlug,
      bookName: localBook.bookName,
      chapter,
      verses: localBook.chapters[chapter - 1],
    };
  }

  const res = await fetch(`${API_BASE}/kor/${bookSlug}/${chapter}`, {
    headers: { Accept: "application/json", "User-Agent": "Bible4Korea/0.1.0" },
  });

  if (!res.ok) {
    return null;
  }

  const json = await res.json();
  return json.data;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = [];
  let index = 0;

  async function run() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: limit }, run));
  return results;
}

function buildTasks() {
  const tasks = [];

  for (const book of books) {
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      tasks.push({ book, chapter });
    }
  }

  return tasks;
}

function createDatabase() {
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  const db = new Database(DB_PATH);

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

  return db;
}

async function main() {
  const tasks = buildTasks();
  console.log(`Fetching ${tasks.length} chapters for search index...`);

  const chapters = await mapWithConcurrency(tasks, CONCURRENCY, async ({ book, chapter }) => {
    const data = await fetchChapter(book.slug, chapter);
    if (!data?.verses) return null;
    return { book, chapter, verses: data.verses };
  });

  const db = createDatabase();
  const insertVerse = db.prepare(`
    INSERT INTO verses (book_slug, book_name, chapter, verse, text)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertFts = db.prepare(`
    INSERT INTO verses_fts (rowid, text, book_name)
    VALUES (?, ?, ?)
  `);

  const insertAll = db.transaction((rows) => {
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

  const rows = [];
  let skipped = 0;

  for (const item of chapters) {
    if (!item?.verses) {
      skipped += 1;
      continue;
    }

    const { book, chapter, verses } = item;
    verses.forEach((text, index) => {
      rows.push({
        book_slug: book.slug,
        book_name: book.name,
        chapter,
        verse: index + 1,
        text,
      });
    });
  }

  if (skipped > 0) {
    console.log(`Skipped ${skipped} unavailable chapters.`);
  }

  insertAll(rows);

  console.log("Building Strong's verse index...");
  const strongsRows = buildStrongsIndex(db);
  console.log(`Indexed ${strongsRows.toLocaleString()} Strong's verse links.`);

  db.close();

  const sizeMb = (fs.statSync(DB_PATH).size / (1024 * 1024)).toFixed(2);
  console.log(`Search index ready: ${rows.length} verses (${sizeMb} MB)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
