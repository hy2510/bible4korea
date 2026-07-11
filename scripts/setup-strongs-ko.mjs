import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DATA_DIR = path.resolve("data");
const DB_PATH = path.join(DATA_DIR, "strongs-hebrew-ko.sqlite");
const TSV_ZIP = path.join(DATA_DIR, "strongs_tsv_exports.zip");
const LOG_TSV_URL =
  "https://zenodo.org/api/records/19099634/files/strongs_tsv_exports.zip/content";

console.log("Setting up local Strong's Korean database...\n");

fs.mkdirSync(DATA_DIR, { recursive: true });

if (!fs.existsSync(TSV_ZIP)) {
  console.log("1/2 Downloading Lexicon Omnium Gentium (Korean TSV)...");
  execFileSync(
    "curl",
    ["-L", "--retry", "3", "-o", TSV_ZIP, LOG_TSV_URL],
    { stdio: "inherit" },
  );
} else {
  console.log("1/2 TSV bundle already present.");
}

console.log("2/2 Importing Hebrew Strong's Korean glosses...");
execFileSync("node", ["scripts/import-strongs-ko.mjs"], { stdio: "inherit" });

const db = await import("better-sqlite3").then((m) => new m.default(DB_PATH));
const count = db.prepare("SELECT COUNT(*) AS c FROM strongs_hebrew").get().c;
db.close();

console.log(`\nDone. ${count} entries ready at ${DB_PATH}`);
