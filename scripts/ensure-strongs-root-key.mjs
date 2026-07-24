import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import Database from "better-sqlite3";
import { extractHebrewRootKey } from "../lib/hebrew-gematria.mjs";

const DB_PATH = path.resolve("data", "strongs-hebrew-ko.sqlite");

/**
 * strongs_hebrew에 root_key 컬럼이 없으면 추가하고,
 * original 자음 연쇄로 채워 동일 어근 계열 식별에 사용합니다.
 */
export function ensureStrongsRootKey(dbPath = DB_PATH) {
  if (!fs.existsSync(dbPath)) return { updated: false, reason: "missing-db" };

  const db = new Database(dbPath);
  try {
    const columns = db.prepare(`PRAGMA table_info(strongs_hebrew)`).all();
    const hasRootKey = columns.some((column) => column.name === "root_key");

    if (!hasRootKey) {
      db.exec(`
        ALTER TABLE strongs_hebrew
        ADD COLUMN root_key TEXT NOT NULL DEFAULT '';
      `);
    }

    const indexes = db.prepare(`PRAGMA index_list(strongs_hebrew)`).all();
    const hasRootIndex = indexes.some(
      (index) => index.name === "idx_strongs_hebrew_root_key",
    );
    if (!hasRootIndex) {
      db.exec(
        `CREATE INDEX IF NOT EXISTS idx_strongs_hebrew_root_key ON strongs_hebrew (root_key)`,
      );
    }

    const emptyCount = db
      .prepare(
        `SELECT COUNT(*) AS count FROM strongs_hebrew
         WHERE root_key = '' AND original != ''`,
      )
      .get().count;

    if (emptyCount === 0 && hasRootKey) {
      return { updated: false, reason: "already-populated" };
    }

    const rows = db
      .prepare(
        `SELECT number, original FROM strongs_hebrew
         WHERE root_key = '' AND original != ''`,
      )
      .all();
    const update = db.prepare(
      `UPDATE strongs_hebrew SET root_key = ? WHERE number = ?`,
    );
    const populate = db.transaction((entries) => {
      let updated = 0;
      for (const row of entries) {
        const rootKey = extractHebrewRootKey(row.original);
        if (!rootKey) continue;
        update.run(rootKey, row.number);
        updated += 1;
      }
      return updated;
    });
    const updated = populate(rows);

    return updated > 0
      ? { updated: true, count: updated }
      : { updated: false, reason: "no-extractable-roots" };
  } finally {
    db.close();
  }
}

const isMain =
  Boolean(process.argv[1]) &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const result = ensureStrongsRootKey();
  console.log(result);
}
