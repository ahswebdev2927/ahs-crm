import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient, type Client } from "@libsql/client";

// Resolve paths
const PROJECT_ROOT = path.resolve(__dirname, "..");
const WORKSPACE_ROOT = path.resolve(PROJECT_ROOT, "..");
const BACKUP_DIR = path.resolve(WORKSPACE_ROOT, "db_backups");
const LOCAL_DB_PATH = path.resolve(PROJECT_ROOT, "dev.db");

function getTursoCredentials(): { url: string; authToken: string } {
  let url = process.env.DATABASE_URL || "";
  let authToken = process.env.DATABASE_AUTH_TOKEN || "";

  // If DATABASE_URL in environment is pointing to local file, check .env file for libsql URL
  if (!url.startsWith("libsql:") && !url.startsWith("https:")) {
    const envPath = path.resolve(PROJECT_ROOT, ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const urlMatch = envContent.match(/^DATABASE_URL=(libsql:\/\/[^\r\n]+)/m);
      const tokenMatch = envContent.match(/^DATABASE_AUTH_TOKEN=([^\r\n]+)/m);
      if (urlMatch) {
        url = urlMatch[1].trim();
      }
      if (tokenMatch) {
        authToken = tokenMatch[1].trim();
      }
    }
  }

  if (!url || (!url.startsWith("libsql:") && !url.startsWith("https:"))) {
    throw new Error(
      "Turso database URL not found! Please ensure DATABASE_URL (libsql://...) is configured in .env"
    );
  }

  return { url, authToken };
}

function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
}

async function createLocalBackup(prefix: string): Promise<string | null> {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    return null;
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backupFileName = `${prefix}-${getTimestamp()}.db`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);

  // Checkpoint WAL if local db client can be opened
  try {
    const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
    await localClient.execute("PRAGMA wal_checkpoint(TRUNCATE);");
    localClient.close();
  } catch {
    // Continue even if checkpoint fails
  }

  fs.copyFileSync(LOCAL_DB_PATH, backupFilePath);
  console.log(`[Backup] Created local database backup: ${backupFilePath}`);
  return backupFilePath;
}

interface MasterObject {
  type: string;
  name: string;
  tbl_name: string;
  sql: string | null;
}

async function copyDatabase(
  sourceClient: Client,
  targetClient: Client,
  sourceLabel: string,
  targetLabel: string
) {
  console.log(`\n--- Starting Database Copy: ${sourceLabel} -> ${targetLabel} ---`);

  // 1. Fetch tables from source
  const tablesRes = await sourceClient.execute(
    "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name;"
  );
  const tables = tablesRes.rows as unknown as MasterObject[];
  console.log(`[Schema] Discovered ${tables.length} tables in source (${sourceLabel}).`);

  // 2. Fetch non-table schema objects (indexes, triggers, views) with non-null sql
  const otherObjectsRes = await sourceClient.execute(
    "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE type IN ('index', 'trigger', 'view') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' AND sql IS NOT NULL ORDER BY CASE type WHEN 'view' THEN 1 WHEN 'index' THEN 2 WHEN 'trigger' THEN 3 ELSE 4 END;"
  );
  const otherObjects = otherObjectsRes.rows as unknown as MasterObject[];
  console.log(`[Schema] Discovered ${otherObjects.length} explicit indexes/views/triggers.`);

  // 3. Clear target database
  console.log(`[Clear] Resetting existing objects in target (${targetLabel})...`);
  await targetClient.execute("PRAGMA foreign_keys = OFF;");

  const targetExistingRes = await targetClient.execute(
    "SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%';"
  );
  const targetExisting = targetExistingRes.rows as unknown as { type: string; name: string }[];

  // Drop views and triggers first
  for (const obj of targetExisting.filter((o) => o.type === "view")) {
    await targetClient.execute(`DROP VIEW IF EXISTS "${obj.name}";`);
  }
  for (const obj of targetExisting.filter((o) => o.type === "trigger")) {
    await targetClient.execute(`DROP TRIGGER IF EXISTS "${obj.name}";`);
  }
  for (const obj of targetExisting.filter((o) => o.type === "table")) {
    await targetClient.execute(`DROP TABLE IF EXISTS "${obj.name}";`);
  }

  // 4. Create tables in target
  console.log(`[Schema] Creating tables in target...`);
  for (const table of tables) {
    if (table.sql) {
      await targetClient.execute(table.sql);
    }
  }

  // 5. Transfer data table by table
  console.log(`[Data] Transferring table records...`);
  const BATCH_SIZE = 50;

  for (const table of tables) {
    const tableName = table.name;
    const countRes = await sourceClient.execute(`SELECT count(*) as c FROM "${tableName}";`);
    const totalRows = Number(countRes.rows[0].c);

    if (totalRows === 0) {
      console.log(`  - Table "${tableName}": 0 records (empty)`);
      continue;
    }

    const rowsRes = await sourceClient.execute(`SELECT * FROM "${tableName}";`);
    const rows = rowsRes.rows;

    const columns = rowsRes.columns;
    const colList = columns.map((c) => `"${c}"`).join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    const insertSql = `INSERT INTO "${tableName}" (${colList}) VALUES (${placeholders});`;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      const batchStatements = chunk.map((row) => ({
        sql: insertSql,
        args: columns.map((c) => row[c] ?? null),
      }));
      await targetClient.batch(batchStatements, "write");
    }

    console.log(`  - Table "${tableName}": ${totalRows} records transferred.`);
  }

  // 6. Create indexes, views, and triggers
  console.log(`[Schema] Creating indexes, views, and triggers...`);
  for (const obj of otherObjects) {
    if (obj.sql) {
      try {
        await targetClient.execute(obj.sql);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // Ignore if index already exists (e.g. from table constraints)
        if (!msg.includes("already exists")) {
          console.warn(`  [Warning] Object ${obj.name} (${obj.type}): ${msg}`);
        }
      }
    }
  }

  // 7. Verify integrity
  console.log(`[Integrity] Re-enabling foreign keys and validating integrity...`);
  await targetClient.execute("PRAGMA foreign_keys = ON;");
  const fkCheckRes = await targetClient.execute("PRAGMA foreign_key_check;");
  if (fkCheckRes.rows.length > 0) {
    console.warn(`[Warning] Foreign key check reported violations:`, fkCheckRes.rows);
  } else {
    console.log(`[Integrity] Foreign key check passed cleanly.`);
  }

  // 8. Assert row counts match
  console.log(`[Verification] Verifying table row counts between source and target...`);
  let allMatched = true;
  for (const table of tables) {
    const tableName = table.name;
    const srcCount = Number(
      (await sourceClient.execute(`SELECT count(*) as c FROM "${tableName}";`)).rows[0].c
    );
    const tgtCount = Number(
      (await targetClient.execute(`SELECT count(*) as c FROM "${tableName}";`)).rows[0].c
    );
    if (srcCount !== tgtCount) {
      console.error(
        `[Mismatch] Table "${tableName}": Source has ${srcCount}, Target has ${tgtCount}!`
      );
      allMatched = false;
    }
  }

  if (!allMatched) {
    throw new Error("Data verification failed: row counts do not match between source and target!");
  }

  console.log(`[Success] All ${tables.length} tables verified with exact matching row counts.`);
}

async function runTursoToLocal() {
  const { url: tursoUrl, authToken } = getTursoCredentials();

  // Step 1: Backup current dev.db
  await createLocalBackup("dev-db-backup");

  const remoteClient = createClient({ url: tursoUrl, authToken });
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });

  try {
    await copyDatabase(remoteClient, localClient, `Turso (${tursoUrl})`, `local dev.db`);

    localClient.close();
    remoteClient.close();

    console.log(`\n============================================================`);
    console.log(`[Completed] Local dev.db is now an exact replica of Turso!`);
    console.log(`File: ${LOCAL_DB_PATH}`);
    console.log(`============================================================\n`);
  } catch (err) {
    localClient.close();
    remoteClient.close();
    throw err;
  }
}

async function runLocalToTurso() {
  const { url: tursoUrl, authToken } = getTursoCredentials();

  if (!fs.existsSync(LOCAL_DB_PATH)) {
    throw new Error(`Local database file does not exist at ${LOCAL_DB_PATH}`);
  }

  // Step 1: Backup current Turso database to an SQLite .db file in db_backups/
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const tursoBackupFile = path.join(BACKUP_DIR, `turso-backup-${getTimestamp()}.db`);
  console.log(`[Backup] Backing up remote Turso to ${tursoBackupFile} before wiping...`);

  const remoteClient = createClient({ url: tursoUrl, authToken });
  const tursoBackupClient = createClient({ url: `file:${tursoBackupFile}` });

  try {
    await copyDatabase(remoteClient, tursoBackupClient, `Turso (${tursoUrl})`, `Turso Backup DB`);
    tursoBackupClient.close();
    console.log(`[Backup] Turso backup successfully saved: ${tursoBackupFile}`);
  } catch (err) {
    tursoBackupClient.close();
    remoteClient.close();
    throw new Error(`Failed to create backup of Turso database: ${err}`);
  }

  // Step 2: Push local dev.db to remote Turso
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });

  try {
    await copyDatabase(localClient, remoteClient, `local dev.db`, `Turso (${tursoUrl})`);
    localClient.close();
    remoteClient.close();

    console.log(`\n============================================================`);
    console.log(`[Completed] Remote Turso is now an exact replica of local dev.db!`);
    console.log(`Turso URL: ${tursoUrl}`);
    console.log(`============================================================\n`);
  } catch (err) {
    localClient.close();
    remoteClient.close();
    throw err;
  }
}

async function main() {
  const { url: tursoUrl } = getTursoCredentials();

  console.log(`\n============================================================`);
  console.log(`AHS CRM Database Synchronization Tool`);
  console.log(`Turso DB URL : ${tursoUrl}`);
  console.log(`Local DB Path: ${LOCAL_DB_PATH}`);
  console.log(`============================================================`);
  console.log(`Press 1 to turso (${tursoUrl}) sync with dev.db`);
  console.log(`        i.e., copy turso to dev.db (dev.db will be cleared and its backup created)`);
  console.log(`Press 2 to sync dev.db with turso (${tursoUrl})`);
  console.log(`        i.e., copy dev.db to turso (turso will be cleared and its backup created)`);
  console.log(`Press 0 to exit`);
  console.log(`============================================================\n`);

  const rl = readline.createInterface({ input, output });

  try {
    const choice = (await rl.question(`Enter your choice [1, 2, or 0]: `)).trim();

    if (choice === "1") {
      console.log(`\nStarting sync: Turso -> dev.db...`);
      await runTursoToLocal();
    } else if (choice === "2") {
      console.log(`\n!!! WARNING: This will OVERWRITE and CLEAR remote Turso (${tursoUrl}) !!!`);
      const confirmation = (
        await rl.question(`Type "CONFIRM" to proceed with wiping Turso: `)
      ).trim();
      if (confirmation !== "CONFIRM") {
        console.log(`Sync aborted. Remote Turso was not modified.`);
        return;
      }
      console.log(`\nStarting sync: dev.db -> Turso...`);
      await runLocalToTurso();
    } else if (choice === "0") {
      console.log(`Exiting.`);
    } else {
      console.log(`Invalid choice. Exiting.`);
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error(`\n[Error] Sync failed:`, err);
  process.exit(1);
});
