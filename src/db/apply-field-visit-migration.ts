import "dotenv/config";
import { db, client } from "./index";
import { sql } from "drizzle-orm";

async function applyFieldVisitMigration() {
  console.log("Applying field_visits schema migration directly to dev.db...");

  try {
    await client.execute("PRAGMA foreign_keys=OFF;");
    
    // Create new field_visits table with updated schema
    await client.execute(`
      CREATE TABLE IF NOT EXISTS __new_field_visits (
        id text PRIMARY KEY NOT NULL,
        lead_id text,
        customer_id text,
        appointment_id text,
        visit_date integer NOT NULL,
        purpose text NOT NULL,
        summary text,
        outcome text,
        feedback text,
        requirements text,
        next_action text,
        next_action_date integer,
        expenses integer DEFAULT 0 NOT NULL,
        status text DEFAULT 'scheduled' NOT NULL,
        created_by_id text NOT NULL,
        assigned_to_id text NOT NULL,
        created_at integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
        updated_at integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON UPDATE no action ON DELETE set null,
        FOREIGN KEY (created_by_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
      );
    `);

    // Copy existing field_visits if any exist
    try {
      await client.execute(`
        INSERT INTO __new_field_visits(id, lead_id, appointment_id, visit_date, purpose, outcome, feedback, expenses, status, created_by_id, assigned_to_id, created_at, updated_at)
        SELECT id, lead_id, appointment_id, visit_date, purpose, outcome, feedback, expenses, status, created_by_id, assigned_to_id, created_at, updated_at FROM field_visits;
      `);
      await client.execute("DROP TABLE field_visits;");
    } catch (e) {
      console.log("Old field_visits table migration notice:", (e as Error).message);
    }

    await client.execute("ALTER TABLE __new_field_visits RENAME TO field_visits;");
    await client.execute("PRAGMA foreign_keys=ON;");

    // Recreate indexes
    await client.execute("CREATE INDEX IF NOT EXISTS field_visits_lead_id_idx ON field_visits (lead_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS field_visits_customer_id_idx ON field_visits (customer_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS field_visits_appointment_id_idx ON field_visits (appointment_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS field_visits_assigned_to_id_idx ON field_visits (assigned_to_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS field_visits_status_idx ON field_visits (status);");
    await client.execute("CREATE INDEX IF NOT EXISTS field_visits_visit_date_idx ON field_visits (visit_date);");

    console.log("Migration executed successfully!");

    // Verify columns using PRAGMA
    const columns = await db.all(sql`PRAGMA table_info(field_visits)`);
    console.log("Verified field_visits table schema columns:", columns);

  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    client.close();
  }
}

applyFieldVisitMigration();
