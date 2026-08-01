/**
 * Verifies NT Greek stays 1:1 by verse number after Korean "(본문 없음)" slots.
 * Run: node scripts/verify-nt-greek-verse-alignment.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MORPHGNT_DIR = path.join(ROOT, "data", "morphgnt");
const RNKSV_DIR = path.join(ROOT, "data", "rnksv");

const FILES = {
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

function isMissing(text) {
  const trimmed = String(text ?? "").trim();
  return !trimmed || /^\(?본문\s*없음\)?$/.test(trimmed);
}

function loadKorean(slug) {
  for (const file of fs.readdirSync(RNKSV_DIR)) {
    if (!file.endsWith(".json")) continue;
    const data = JSON.parse(fs.readFileSync(path.join(RNKSV_DIR, file), "utf8"));
    if (data.bookSlug === slug) return data;
  }
  throw new Error(`Missing RNKSV book: ${slug}`);
}

function loadGreekSparse(fileName, chapter) {
  const present = new Map();
  for (const line of fs.readFileSync(path.join(MORPHGNT_DIR, fileName), "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 7) continue;
    const ref = parts[0];
    const c = Number(ref.slice(2, 4));
    const v = Number(ref.slice(4, 6));
    if (c !== chapter) continue;
    if (!present.has(v)) present.set(v, []);
    present.get(v).push(parts[4]);
  }
  const maxVerse = Math.max(0, ...present.keys());
  return Array.from({ length: maxVerse }, (_, index) => present.get(index + 1) ?? []);
}

function alignByVerseNumber(koreanVerses, greekWordVerses) {
  return koreanVerses.map((_, index) => {
    const words = greekWordVerses[index] ?? [];
    if (words.length === 0) return [];
    return [{ verseNum: index + 1, words }];
  });
}

const empties = [];
const failures = [];

for (const [slug, fileName] of Object.entries(FILES)) {
  const book = loadKorean(slug);
  for (let chapterIndex = 0; chapterIndex < book.chapters.length; chapterIndex += 1) {
    const korean = book.chapters[chapterIndex];
    const greek = loadGreekSparse(fileName, chapterIndex + 1);
    const aligned = alignByVerseNumber(korean, greek);

    for (let index = 0; index < korean.length; index += 1) {
      const verseNum = index + 1;
      if (isMissing(korean[index])) {
        empties.push(`${slug} ${chapterIndex + 1}:${verseNum}`);
      }

      if (aligned[index].length > 1) {
        failures.push(
          `${slug} ${chapterIndex + 1}:${verseNum} has ${aligned[index].length} greek groups`,
        );
      }

      if (
        aligned[index].length === 1 &&
        aligned[index][0].verseNum !== verseNum
      ) {
        failures.push(
          `${slug} ${chapterIndex + 1}:${verseNum} greek labeled ${aligned[index][0].verseNum}`,
        );
      }

      // After an empty marker, next verse must not inherit a foreign group.
      if (index > 0 && isMissing(korean[index - 1])) {
        for (const group of aligned[index]) {
          if (group.verseNum !== verseNum) {
            failures.push(
              `${slug} ${chapterIndex + 1}:${verseNum} inherited greek ${group.verseNum} after empty`,
            );
          }
        }
      }
    }
  }
}

console.log(`NT (본문 없음): ${empties.length}`);
for (const ref of empties) console.log(`  ${ref}`);

if (failures.length > 0) {
  console.error("\nAlignment failures:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log("\nOK: all NT greek verses align 1:1 by verse number (no post-empty bundling).");
