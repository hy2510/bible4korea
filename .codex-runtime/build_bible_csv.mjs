import fs from "node:fs/promises";
import path from "node:path";
import { Workbook } from "@oai/artifact-tool";

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  throw new Error("Usage: build_bible_csv.mjs <input.txt> <output.csv>");
}

const source = (await fs.readFile(inputPath, "utf8")).replace(/\r\n?/g, "\n");
const chapterHeading = /^창세기\s+(\d+)\s*$/gm;
const headings = [...source.matchAll(chapterHeading)];
const rows = [];
const seenChapterSignatures = new Map();
for (let i = 0; i < headings.length; i += 1) {
  const chapter = Number(headings[i][1]);
  const start = headings[i].index + headings[i][0].length;
  const end = i + 1 < headings.length ? headings[i + 1].index : source.length;
  const lines = source.slice(start, end).split("\n");
  const cleaned = lines
    .filter((line, lineIndex) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("성경전서 새번역 ©")) return false;
      if (!trimmed || /^\d/.test(trimmed) || /[.!?。！？,””’」』:]$/.test(trimmed)) return true;
      let nextIndex = lineIndex + 1;
      while (nextIndex < lines.length && !lines[nextIndex].trim()) nextIndex += 1;
      const nextTrimmed = lines[nextIndex]?.trim() ?? "";
      const separatedBefore = lineIndex === 0 || !lines[lineIndex - 1].trim();
      return !(trimmed.length <= 40 && separatedBefore && /^\d/.test(nextTrimmed));
    })
    .join("\n")
    .replace(/(?:^|\n|\u00a0)(\d{1,2})(?=\S)/gu, "\n@@VERSE:$1@@")
    .trim();

  const versePattern = /@@VERSE:(\d+)@@([\s\S]*?)(?=\n@@VERSE:\d+@@|$)/g;
  const chapterRows = [];
  for (const match of cleaned.matchAll(versePattern)) {
    const verse = Number(match[1]);
    const text = match[2].replace(/[\s\u00a0]+/g, " ").trim();
    chapterRows.push(["GEN", chapter, verse, text]);
  }
  const signature = JSON.stringify(chapterRows);
  if (seenChapterSignatures.has(chapter)) {
    if (seenChapterSignatures.get(chapter) !== signature) {
      throw new Error(`Chapter ${chapter} appears more than once with different text`);
    }
    continue;
  }
  seenChapterSignatures.set(chapter, signature);
  rows.push(...chapterRows);
}

const expectedVerseCounts = new Map([
  31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21,
  16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43,
  55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28,
].map((count, index) => [index + 1, count]));
for (const [chapter, expectedCount] of expectedVerseCounts) {
  const chapterRows = rows.filter((row) => row[1] === chapter);
  if (chapterRows.length === 0) continue;
  const actualVerses = chapterRows.map((row) => row[2]);
  const expectedVerses = Array.from({ length: expectedCount }, (_, index) => index + 1);
  if (JSON.stringify(actualVerses) !== JSON.stringify(expectedVerses)) {
    throw new Error(`Chapter ${chapter} verse sequence is invalid: ${actualVerses.join(",")}`);
  }
}

const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
const csvLines = [
  "book,chapter,verse,text",
  ...rows.map(([book, chapter, verse, text]) =>
    [book, chapter, verse, escapeCsv(text)].join(","),
  ),
];
const csvText = `${csvLines.join("\n")}\n`;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, csvText, "utf8");

const workbook = await Workbook.fromCSV(csvText, { sheetName: "Genesis" });
const inspection = await workbook.inspect({
  kind: "table",
  range: "Genesis!A1:D8",
  include: "values",
  tableMaxRows: 8,
  tableMaxCols: 4,
  maxChars: 4000,
});
const preview = await workbook.render({
  sheetName: "Genesis",
  range: "A1:D8",
  scale: 1,
  format: "png",
});
await fs.writeFile(
  path.join(path.dirname(outputPath), ".genesis_csv_preview.png"),
  new Uint8Array(await preview.arrayBuffer()),
);

console.log(JSON.stringify({ rowCount: rows.length, inspection: inspection.ndjson }));
