import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import Database from "better-sqlite3";
import { extractBriefGloss } from "../lib/strongs-gloss.mjs";
import {
  computeHebrewGematria,
  extractHebrewRootKey,
} from "../lib/hebrew-gematria.mjs";

const DATA_DIR = path.resolve("data");
const DB_PATH = path.join(DATA_DIR, "strongs-hebrew-ko.sqlite");
const TSV_ZIP = path.join(DATA_DIR, "strongs_tsv_exports.zip");
const TSV_FILE = path.join(DATA_DIR, "strongs_ko.tsv");

function openTsvStream() {
  if (fs.existsSync(TSV_FILE)) {
    return fs.createReadStream(TSV_FILE, { encoding: "utf8" });
  }

  if (!fs.existsSync(TSV_ZIP)) {
    throw new Error(
      "Missing data/strongs_tsv_exports.zip. Run: npm run db:setup-strongs-ko",
    );
  }

  return spawn("unzip", ["-p", TSV_ZIP, "strongs_ko.tsv"], {
    stdio: ["ignore", "pipe", "inherit"],
  }).stdout;
}

async function importFromTsv() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
  }

  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE strongs_hebrew (
      number INTEGER PRIMARY KEY,
      gloss TEXT NOT NULL,
      definition TEXT NOT NULL,
      original TEXT NOT NULL DEFAULT '',
      gematria INTEGER NOT NULL DEFAULT 0,
      root_key TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'log-ko',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX idx_strongs_hebrew_gematria ON strongs_hebrew (gematria);
    CREATE INDEX idx_strongs_hebrew_root_key ON strongs_hebrew (root_key);
    CREATE TABLE strongs_greek (
      number INTEGER PRIMARY KEY,
      gloss TEXT NOT NULL,
      definition TEXT NOT NULL,
      original TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT 'log-ko',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const insertHebrew = db.prepare(`
    INSERT INTO strongs_hebrew (number, gloss, definition, original, gematria, root_key)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertGreek = db.prepare(`
    INSERT INTO strongs_greek (number, gloss, definition, original)
    VALUES (?, ?, ?, ?)
  `);

  const insertHebrewMany = db.transaction((rows) => {
    for (const row of rows) {
      insertHebrew.run(
        row.number,
        row.gloss,
        row.definition,
        row.original,
        row.gematria,
        row.rootKey,
      );
    }
  });
  const insertGreekMany = db.transaction((rows) => {
    for (const row of rows) {
      insertGreek.run(row.number, row.gloss, row.definition, row.original);
    }
  });

  const stream = createInterface({
    input: openTsvStream(),
    crlfDelay: Infinity,
  });

  let hebrewBatch = [];
  let greekBatch = [];
  let hebrewImported = 0;
  let greekImported = 0;

  for await (const line of stream) {
    if (!line || line.startsWith("strong_num")) continue;

    const [strongNum, testament, original = "", , definition] = line.split("\t");
    if (!definition) continue;

    if (testament === "hebrew" && strongNum?.startsWith("H")) {
      const number = Number.parseInt(strongNum.slice(1), 10);
      if (!Number.isInteger(number)) continue;

      hebrewBatch.push({
        number,
        gloss: extractBriefGloss(definition),
        definition,
        original,
        gematria: computeHebrewGematria(original),
        rootKey: extractHebrewRootKey(original),
      });

      if (hebrewBatch.length >= 500) {
        insertHebrewMany(hebrewBatch);
        hebrewImported += hebrewBatch.length;
        hebrewBatch = [];
      }
      continue;
    }

    if (testament === "greek" && strongNum?.startsWith("G")) {
      const number = Number.parseInt(strongNum.slice(1), 10);
      if (!Number.isInteger(number)) continue;

      greekBatch.push({
        number,
        gloss: extractBriefGloss(definition),
        definition,
        original,
      });

      if (greekBatch.length >= 500) {
        insertGreekMany(greekBatch);
        greekImported += greekBatch.length;
        greekBatch = [];
      }
    }
  }

  if (hebrewBatch.length > 0) {
    insertHebrewMany(hebrewBatch);
    hebrewImported += hebrewBatch.length;
  }
  if (greekBatch.length > 0) {
    insertGreekMany(greekBatch);
    greekImported += greekBatch.length;
  }

  db.close();
  console.log(`Imported ${hebrewImported} Hebrew Strong's entries into ${DB_PATH}`);
  console.log(`Imported ${greekImported} Greek Strong's entries into ${DB_PATH}`);
}

importFromTsv().catch((error) => {
  console.error(error);
  process.exit(1);
});
