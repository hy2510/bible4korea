import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DATA_DIR = path.resolve("data");
const MORPHGNT_DIR = path.join(DATA_DIR, "morphgnt");
const BASE_URL =
  "https://raw.githubusercontent.com/morphgnt/sblgnt/master";

const FILES = [
  "61-Mt-morphgnt.txt",
  "62-Mk-morphgnt.txt",
  "63-Lk-morphgnt.txt",
  "64-Jn-morphgnt.txt",
  "65-Ac-morphgnt.txt",
  "66-Ro-morphgnt.txt",
  "67-1Co-morphgnt.txt",
  "68-2Co-morphgnt.txt",
  "69-Ga-morphgnt.txt",
  "70-Eph-morphgnt.txt",
  "71-Php-morphgnt.txt",
  "72-Col-morphgnt.txt",
  "73-1Th-morphgnt.txt",
  "74-2Th-morphgnt.txt",
  "75-1Ti-morphgnt.txt",
  "76-2Ti-morphgnt.txt",
  "77-Tit-morphgnt.txt",
  "78-Phm-morphgnt.txt",
  "79-Heb-morphgnt.txt",
  "80-Jas-morphgnt.txt",
  "81-1Pe-morphgnt.txt",
  "82-2Pe-morphgnt.txt",
  "83-1Jn-morphgnt.txt",
  "84-2Jn-morphgnt.txt",
  "85-3Jn-morphgnt.txt",
  "86-Jud-morphgnt.txt",
  "87-Re-morphgnt.txt",
];

console.log("Setting up MorphGNT Greek NT data...\n");
fs.mkdirSync(MORPHGNT_DIR, { recursive: true });

for (const file of FILES) {
  const dest = path.join(MORPHGNT_DIR, file);
  if (fs.existsSync(dest)) {
    console.log(`  skip ${file}`);
    continue;
  }

  console.log(`  download ${file}`);
  execFileSync("curl", ["-L", "--retry", "3", "-o", dest, `${BASE_URL}/${file}`], {
    stdio: "inherit",
  });
}

console.log("\nBuilding Greek lemma→Strong's map...");
execFileSync("node", ["scripts/build-greek-lemma-strongs.mjs"], {
  stdio: "inherit",
});

console.log("\nDone.");
