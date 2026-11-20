import "dotenv/config";
import { client } from "../src/db";

async function applyHardeningMigration() {
  console.log("Applying Database Security Hardening Migration to dev.db...");

  try {
    await client.execute("PRAGMA foreign_keys = OFF;");

    // 1. Ensure activities table has all required columns
    const activityCols = await client.execute("PRAGMA table_info(activities);");
    const colNames = new Set(activityCols.rows.map((c) => c.name));

    if (!colNames.has("category")) {
      await client.execute("ALTER TABLE activities ADD COLUMN category text DEFAULT 'communication' NOT NULL;");
      console.log("✓ Added activities.category");
    }
    if (!colNames.has("outcome")) {
      await client.execute("ALTER TABLE activities ADD COLUMN outcome text;");
      console.log("✓ Added activities.outcome");
    }
    if (!colNames.has("updated_at")) {
      await client.execute("ALTER TABLE activities ADD COLUMN updated_at integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL;");
      console.log("✓ Added activities.updated_at");
    }
    if (!colNames.has("deleted_at")) {
      await client.execute("ALTER TABLE activities ADD COLUMN deleted_at integer;");
      console.log("✓ Added activities.deleted_at");
    }

    // 2. Add all new security hardening indexes
    const indexes = [
      // Users & Sessions
      "CREATE INDEX IF NOT EXISTS `sessions_expires_at_idx` ON `sessions` (`expires_at`);",
      "CREATE INDEX IF NOT EXISTS `users_status_idx` ON `users` (`status`);",
      "CREATE INDEX IF NOT EXISTS `users_deleted_at_idx` ON `users` (`deleted_at`);",

      // Leads
      "CREATE INDEX IF NOT EXISTS `leads_created_by_idx` ON `leads` (`created_by_id`);",
      "CREATE INDEX IF NOT EXISTS `lead_partners_lead_partner_status_idx` ON `lead_partners` (`lead_id`, `partner_id`, `status`);",
      "CREATE INDEX IF NOT EXISTS `lead_history_created_at_idx` ON `lead_stage_history` (`created_at`);",

      // Customers & Services
      "CREATE INDEX IF NOT EXISTS `customer_services_created_by_idx` ON `customer_services` (`created_by_id`);",

      // Financials (Quotations, Invoices, Payments)
      "CREATE INDEX IF NOT EXISTS `quotations_created_by_idx` ON `quotations` (`created_by_id`);",
      "CREATE INDEX IF NOT EXISTS `quotation_items_service_id_idx` ON `quotation_items` (`service_id`);",
      "CREATE INDEX IF NOT EXISTS `invoices_created_by_idx` ON `invoices` (`created_by_id`);",
      "CREATE INDEX IF NOT EXISTS `invoices_quotation_id_idx` ON `invoices` (`quotation_id`);",
      "CREATE INDEX IF NOT EXISTS `invoice_items_service_id_idx` ON `invoice_items` (`service_id`);",
      "CREATE INDEX IF NOT EXISTS `payments_status_idx` ON `payments` (`status`);",

      // Tasks
      "CREATE INDEX IF NOT EXISTS `tasks_due_date_idx` ON `tasks` (`due_date`);",
      "CREATE INDEX IF NOT EXISTS `tasks_status_due_idx` ON `tasks` (`status`, `due_date`);",
      "CREATE INDEX IF NOT EXISTS `tasks_created_by_idx` ON `tasks` (`created_by_id`);",
      "CREATE INDEX IF NOT EXISTS `tasks_priority_idx` ON `tasks` (`priority`);",
      "CREATE INDEX IF NOT EXISTS `tasks_created_at_idx` ON `tasks` (`created_at`);",

      // Notifications
      "CREATE INDEX IF NOT EXISTS `notifications_recipient_read_created_idx` ON `notifications` (`recipient_id`, `is_read`, `created_at`);",

      // Activities
      "CREATE INDEX IF NOT EXISTS `activities_lead_cat_idx` ON `activities` (`lead_id`, `category`, `created_at`);",
      "CREATE INDEX IF NOT EXISTS `activities_customer_cat_idx` ON `activities` (`customer_id`, `category`, `created_at`);",
      "CREATE INDEX IF NOT EXISTS `activities_category_idx` ON `activities` (`category`);",
      "CREATE INDEX IF NOT EXISTS `activities_deleted_at_idx` ON `activities` (`deleted_at`);",
    ];

    for (const stmt of indexes) {
      await client.execute(stmt);
    }
    console.log(`✓ Created ${indexes.length} indexes successfully!`);

    await client.execute("PRAGMA foreign_keys = ON;");
    console.log("✓ Enforced PRAGMA foreign_keys = ON;");

    console.log("Database Security Hardening migration completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

applyHardeningMigration();
