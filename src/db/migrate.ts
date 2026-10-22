import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";

async function runMigrations() {
  console.log("Applying pending database migrations...");
  try {
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("✓ Migrations applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigrations();
