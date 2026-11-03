import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient, type Client } from "@libsql/client";

// Tables to preserve completely
export const PRESERVED_TABLES = [
  "departments",
  "roles",
  "permissions",
  "role_permissions",
  "teams",
  "users",
  "user_permissions",
  "lead_stages",
  "services",
] as const;

// Tables to wipe clean (ordered with child/referencing tables first)
export const PURGE_TABLES = [
  // Media & Attachments
  "field_visit_media",
  "attachments",
  // Appointments & Field Visits
  "field_visits",
  "appointments",
  "follow_ups",
  // Financial Records
  "payments",
  "invoice_items",
  "invoices",
  "quotation_items",
  "quotations",
  // Customer relationships
  "customer_services",
  "customers",
  // Lead relationships & history
  "lead_activities",
  "lead_partners",
  "lead_stage_history",
  "leads",
  // Tasks
  "task_notes",
  "task_todos",
  "tasks",
  // Activities & Audits
  "activities",
  "audit_logs",
  // Notifications & User State
  "notification_preferences",
  "push_subscriptions",
  "notifications",
  "rate_limits",
  "sessions",
] as const;

interface ScriptConfig {
  url: string;
  authToken?: string;
  dryRun: boolean;
  skipPrompt: boolean;
  skipBackup: boolean;
}

function parseCliArgs(): Partial<ScriptConfig> {
  const args = process.argv.slice(2);
  const config: Partial<ScriptConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--dry-run") {
      config.dryRun = true;
    } else if (arg === "--yes" || arg === "-y") {
      config.skipPrompt = true;
    } else if (arg === "--no-backup") {
      config.skipBackup = true;
    } else if (arg === "--url") {
      config.url = args[++i];
    } else if (arg === "--token") {
      config.authToken = args[++i];
    }
  }

  return config;
}

function printHelp() {
  console.log(`
AHS CRM - Database Reset & Data Purge Utility
=============================================
Clears operational data from the database while preserving all user accounts,
roles, teams, departments, permissions, lead stages, and the service catalog.

Usage:
  npx tsx scripts/clear-db.ts [options]
  npm run db:clear -- [options]

Options:
  --url <url>        Target database URL (overrides .env)
  --token <token>    Turso Auth Token (overrides .env)
  --dry-run          Simulate the operation and print row counts without deleting
  --yes, -y          Skip the interactive 'CONFIRM' prompt (use with caution!)
  --no-backup        Skip pre-deletion JSON backup export
  --help, -h         Show this help message

Preserved Tables:
  ${PRESERVED_TABLES.join(", ")}

Purged Tables:
  ${PURGE_TABLES.join(", ")}
`);
}

function maskUrl(url: string): string {
  try {
    if (url.startsWith("file:")) return url;
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

async function resolveCredentials(cliConfig: Partial<ScriptConfig>): Promise<{ url: string; authToken?: string }> {
  let url = cliConfig.url || process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
  let authToken = cliConfig.authToken || process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN;

  // If running interactively without a provided URL, ask operator
  if (!url) {
    const rl = readline.createInterface({ input, output });
    try {
      console.log("\nNo DATABASE_URL configured.");
      url = await rl.question("Enter Turso/SQLite Database URL (e.g. libsql://... or file:dev.db): ");
      if (url.startsWith("libsql://") || url.startsWith("https://")) {
        authToken = await rl.question("Enter Turso Auth Token: ");
      }
    } finally {
      rl.close();
    }
  }

  if (!url) {
    console.error("Error: Database URL is required.");
    process.exit(1);
  }

  return { url: url.trim(), authToken: authToken?.trim() };
}

async function getExistingTables(client: Client): Promise<Set<string>> {
  const result = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%';");
  return new Set(result.rows.map((r) => String(r.name)));
}

async function countTableRows(client: Client, tableName: string): Promise<number> {
  try {
    const result = await client.execute(`SELECT COUNT(*) as count FROM "${tableName}";`);
    return Number(result.rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

async function exportTableToJson(client: Client, tableName: string, destDir: string): Promise<number> {
  const result = await client.execute(`SELECT * FROM "${tableName}";`);
  const filePath = path.join(destDir, `${tableName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(result.rows, null, 2), "utf-8");
  return result.rows.length;
}

async function main() {
  const cliArgs = parseCliArgs();
  const { url, authToken } = await resolveCredentials(cliArgs);
  const dryRun = cliArgs.dryRun ?? false;
  const skipPrompt = cliArgs.skipPrompt ?? false;
  const skipBackup = cliArgs.skipBackup ?? false;

  console.log("\n=======================================================");
  console.log("       AHS CRM - DATABASE PURGE & RESET UTILITY        ");
  console.log("=======================================================\n");
  console.log(`Target Database : ${maskUrl(url)}`);
  console.log(`Execution Mode  : ${dryRun ? "DRY RUN (Simulation only)" : "LIVE EXECUTION"}`);
  console.log(`Pre-backup      : ${skipBackup ? "Disabled" : "Enabled (JSON export)"}`);
  console.log("-------------------------------------------------------\n");

  const client = createClient({ url, authToken });

  // 1. Check database connectivity
  try {
    await client.execute("SELECT 1;");
  } catch (err) {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  }

  const existingTables = await getExistingTables(client);

  // 2. Inspect PRESERVED tables
  console.log("PRESERVED TABLES (Will NOT be modified):");
  for (const table of PRESERVED_TABLES) {
    if (existingTables.has(table)) {
      const count = await countTableRows(client, table);
      console.log(`  [KEEP] ${table.padEnd(25)} : ${count} record(s)`);
    } else {
      console.log(`  [SKIP] ${table.padEnd(25)} : (table does not exist in DB)`);
    }
  }

  // 3. Inspect PURGE tables
  console.log("\nTABLES TO PURGE:");
  let totalPurgeRows = 0;
  const activePurgeTables: string[] = [];

  for (const table of PURGE_TABLES) {
    if (existingTables.has(table)) {
      const count = await countTableRows(client, table);
      totalPurgeRows += count;
      activePurgeTables.push(table);
      console.log(`  [WIPE] ${table.padEnd(25)} : ${count} record(s) to be removed`);
    }
  }

  console.log("-------------------------------------------------------");
  console.log(`Total records to be purged: ${totalPurgeRows}\n`);

  if (totalPurgeRows === 0) {
    console.log("Operational tables are already empty. Nothing to purge!");
    process.exit(0);
  }

  // 4. Dry Run Exit
  if (dryRun) {
    console.log(">>> DRY RUN COMPLETE: No data was modified or deleted. <<<");
    process.exit(0);
  }

  // 5. Interactive Confirmation
  if (!skipPrompt) {
    const rl = readline.createInterface({ input, output });
    try {
      console.log("WARNING: This operation will permanently delete all operational records listed above.");
      console.log("All admin, manager, and sales logins will remain untouched.\n");
      const answer = await rl.question('To proceed, type "CONFIRM" and press Enter: ');
      if (answer.trim() !== "CONFIRM") {
        console.log("Operation aborted by user. Database was not modified.");
        process.exit(0);
      }
    } finally {
      rl.close();
    }
  }

  // 6. Pre-deletion Backup Export
  if (!skipBackup) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDir = path.resolve(process.cwd(), "backups", `purge-backup-${timestamp}`);
    fs.mkdirSync(backupDir, { recursive: true });

    console.log(`\nExporting backup snapshot to: ${backupDir}...`);
    let backedUpRows = 0;
    for (const table of activePurgeTables) {
      const count = await exportTableToJson(client, table, backupDir);
      backedUpRows += count;
    }

    const metadata = {
      timestamp: new Date().toISOString(),
      databaseUrl: maskUrl(url),
      totalBackedUpRows: backedUpRows,
      tables: activePurgeTables,
    };
    fs.writeFileSync(path.join(backupDir, "manifest.json"), JSON.stringify(metadata, null, 2), "utf-8");
    console.log(`Backup completed successfully! (${backedUpRows} rows saved)\n`);
  }

  // 7. Execute Purge
  console.log("Executing purge operations...");
  const batchStatements: string[] = ["PRAGMA foreign_keys = OFF;"];

  for (const table of activePurgeTables) {
    batchStatements.push(`DELETE FROM "${table}";`);
  }

  // Reset autoincrement sequences for wiped tables where applicable
  if (existingTables.has("sqlite_sequence")) {
    const quotedTableNames = activePurgeTables.map((t) => `'${t}'`).join(", ");
    batchStatements.push(`DELETE FROM sqlite_sequence WHERE name IN (${quotedTableNames});`);
  }

  batchStatements.push("PRAGMA foreign_keys = ON;");

  try {
    await client.batch(batchStatements);
    console.log("Purge batch completed successfully.\n");
  } catch (err) {
    console.error("Purge operation failed:", err);
    process.exit(1);
  }

  // 8. Post-verification
  console.log("Verifying remaining records...");
  let remainingPurgedRows = 0;
  for (const table of activePurgeTables) {
    const count = await countTableRows(client, table);
    remainingPurgedRows += count;
  }

  let preservedRowsTotal = 0;
  for (const table of PRESERVED_TABLES) {
    if (existingTables.has(table)) {
      preservedRowsTotal += await countTableRows(client, table);
    }
  }

  // Check foreign key consistency
  const fkCheck = await client.execute("PRAGMA foreign_key_check;");
  const fkViolations = fkCheck.rows.length;

  console.log("\n=======================================================");
  console.log("                   PURGE REPORT                        ");
  console.log("=======================================================");
  console.log(`Preserved Tables Records Remaining : ${preservedRowsTotal}`);
  console.log(`Purged Tables Records Remaining    : ${remainingPurgedRows}`);
  console.log(`Foreign Key Violations             : ${fkViolations}`);
  console.log("=======================================================\n");

  if (remainingPurgedRows === 0 && fkViolations === 0) {
    console.log("SUCCESS: Database cleared cleanly. All logins and catalogs remain intact!\n");
  } else {
    console.warn("WARNING: Some rows or foreign key checks flagged issues. Review output above.\n");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
