import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not defined in environment variables.");
}

const authToken = process.env.DATABASE_AUTH_TOKEN;

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });

// Enable SQLite Write-Ahead Logging (WAL) mode locally for development
if (url.startsWith("file:")) {
  (async () => {
    try {
      await client.execute("PRAGMA journal_mode = WAL;");
    } catch (err) {
      console.error("Failed to enable SQLite WAL mode:", err);
    }
  })();
}
