import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db, client } from "./index";

async function runMigrations() {
  console.log("Running migrations on dev.db...");
  try {
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("Migrations applied successfully!");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    client.close();
  }
}

runMigrations();
