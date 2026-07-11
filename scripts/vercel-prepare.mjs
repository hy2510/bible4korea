import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";

const DB_PATH = path.join("data", "strongs-hebrew-ko.sqlite");
const SEARCH_DB_PATH = path.join("data", "bible-search.sqlite");
const MORPHGNT_DIR = path.join("data", "morphgnt");
const LEMMA_MAP_PATH = path.join("data", "greek-lemma-strongs.json");

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
}

if (!fs.existsSync(DB_PATH)) {
  console.log("Preparing Strong's Korean database...");
  run("npm", ["run", "db:setup-strongs-ko"]);
}

if (!fs.existsSync(MORPHGNT_DIR) || !fs.existsSync(LEMMA_MAP_PATH)) {
  console.log("Preparing MorphGNT Greek data...");
  run("npm", ["run", "db:setup-morphgnt"]);
}

function needsStrongsIndexRebuild() {
  if (!fs.existsSync(SEARCH_DB_PATH)) return true;

  const db = new Database(SEARCH_DB_PATH, { readonly: true });
  const table = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'verse_strongs'`,
    )
    .get();
  db.close();
  return !table;
}

if (!fs.existsSync(SEARCH_DB_PATH) || needsStrongsIndexRebuild()) {
  if (fs.existsSync(SEARCH_DB_PATH) && needsStrongsIndexRebuild()) {
    console.log("Adding Strong's verse index to Bible search database...");
    run("npm", ["run", "db:setup-strongs-search"]);
  } else {
    console.log("Preparing Bible search index...");
    run("npm", ["run", "db:setup-bible-search"]);
  }
}

console.log("Vercel data preparation complete.");
