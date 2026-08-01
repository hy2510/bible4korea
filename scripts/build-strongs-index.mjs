import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import morphhb from "morphhb";

const DB_PATH = process.argv[2] ?? path.join("data", "bible-search.sqlite");
const MORPHGNT_DIR = path.join("data", "morphgnt");
const LEMMA_MAP_PATH = path.join("data", "greek-lemma-strongs.json");

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

function ensureStrongsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS verse_strongs (
      strongs TEXT NOT NULL,
      verse_id INTEGER NOT NULL,
      UNIQUE(strongs, verse_id),
      FOREIGN KEY (verse_id) REFERENCES verses(id)
    );
    CREATE INDEX IF NOT EXISTS idx_verse_strongs_code ON verse_strongs(strongs);
  `);
  db.exec(`DELETE FROM verse_strongs`);
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

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`Missing ${DB_PATH}. Run: npm run db:setup-bible-search`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  ensureStrongsTable(db);
  const count = buildStrongsIndex(db);
  db.close();

  console.log(`Strong's verse index ready: ${count.toLocaleString()} links`);
}

main();
