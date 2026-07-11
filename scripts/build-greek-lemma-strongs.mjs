import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DATA_DIR = path.resolve("data");
const OUTPUT = path.join(DATA_DIR, "greek-lemma-strongs.json");
const STRONGS_URL =
  "https://raw.githubusercontent.com/jtauber/greek-lemma-mappings/master/strongs_mapping.yaml";
const ALT_URL =
  "https://raw.githubusercontent.com/jtauber/greek-lemma-mappings/master/alt_mapping.yaml";

function parseListYaml(content) {
  const groups = new Map();
  let currentKey = null;

  for (const line of content.split("\n")) {
    const keyMatch = line.match(/^([^:\n]+):$/);
    if (keyMatch) {
      currentKey = keyMatch[1].trim();
      if (!groups.has(currentKey)) groups.set(currentKey, []);
      continue;
    }

    const itemMatch = line.match(/^\s+-\s+(.+)$/);
    if (itemMatch && currentKey) {
      groups.get(currentKey).push(itemMatch[1].trim());
    }
  }

  return groups;
}

function download(url, dest) {
  execFileSync("curl", ["-L", "--retry", "3", "-o", dest, url], {
    stdio: "inherit",
  });
}

function buildLemmaToStrongs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const strongsFile = path.join(DATA_DIR, "strongs_mapping.yaml");
  const altFile = path.join(DATA_DIR, "alt_mapping.yaml");

  if (!fs.existsSync(strongsFile)) download(STRONGS_URL, strongsFile);
  if (!fs.existsSync(altFile)) download(ALT_URL, altFile);

  const strongsGroups = parseListYaml(fs.readFileSync(strongsFile, "utf8"));
  const altGroups = parseListYaml(fs.readFileSync(altFile, "utf8"));

  const canonicalToStrongs = new Map();
  for (const [strongsNum, lemmas] of strongsGroups) {
    const code = `G${strongsNum}`;
    for (const lemma of lemmas) {
      if (!canonicalToStrongs.has(lemma)) {
        canonicalToStrongs.set(lemma, code);
      }
    }
  }

  const lemmaToStrongs = new Map(canonicalToStrongs);

  for (const [altLemma, canonicals] of altGroups) {
    for (const canonical of canonicals) {
      const code = canonicalToStrongs.get(canonical);
      if (code && !lemmaToStrongs.has(altLemma)) {
        lemmaToStrongs.set(altLemma, code);
      }
    }
  }

  const output = Object.fromEntries(lemmaToStrongs);
  fs.writeFileSync(OUTPUT, JSON.stringify(output));
  console.log(`Built ${lemmaToStrongs.size} Greek lemma→Strong's mappings at ${OUTPUT}`);
}

buildLemmaToStrongs();
