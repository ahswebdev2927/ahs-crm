import "dotenv/config";
import { db, client } from "./index";
import { sql } from "drizzle-orm";

async function applyAppointmentMigration() {
  console.log("Applying appointment schema migration directly to dev.db...");

  try {
    await client.execute("PRAGMA foreign_keys=OFF;");
    
    // Create new appointments table with updated schema
    await client.execute(`
      CREATE TABLE IF NOT EXISTS __new_appointments (
        id text PRIMARY KEY NOT NULL,
        lead_id text,
        customer_id text,
        title text NOT NULL,
        description text,
        start_time integer NOT NULL,
        end_time integer NOT NULL,
        location text,
        status text DEFAULT 'scheduled' NOT NULL,
        reschedule_reason text,
        cancellation_reason text,
        created_by_id text NOT NULL,
        assigned_to_id text NOT NULL,
        created_at integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
        updated_at integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON UPDATE no action ON DELETE cascade,
        FOREIGN KEY (created_by_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action,
        FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON UPDATE no action ON DELETE no action
      );
    `);

    // Copy existing appointments if any exist
    try {
      await client.execute(`
        INSERT INTO __new_appointments(id, lead_id, title, description, start_time, end_time, location, status, created_by_id, assigned_to_id, created_at, updated_at)
        SELECT id, lead_id, title, description, start_time, end_time, location, status, created_by_id, assigned_to_id, created_at, updated_at FROM appointments;
      `);
      await client.execute("DROP TABLE appointments;");
    } catch (e) {
      console.log("Old appointments table migration notice:", (e as Error).message);
    }

    await client.execute("ALTER TABLE __new_appointments RENAME TO appointments;");
    await client.execute("PRAGMA foreign_keys=ON;");

    // Recreate indexes
    await client.execute("CREATE INDEX IF NOT EXISTS appointments_lead_id_idx ON appointments (lead_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS appointments_customer_id_idx ON appointments (customer_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS appointments_assigned_to_id_idx ON appointments (assigned_to_id);");
    await client.execute("CREATE INDEX IF NOT EXISTS appointments_start_time_idx ON appointments (start_time);");
    await client.execute("CREATE INDEX IF NOT EXISTS appointments_status_idx ON appointments (status);");

    console.log("Migration executed successfully!");

    // Verify columns using PRAGMA
    const columns = await db.all(sql`PRAGMA table_info(appointments)`);
    console.log("Verified appointments table schema columns:", columns);

  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    client.close();
  }
}

applyAppointmentMigration();
