import "dotenv/config";
import { client } from "./index";

async function applyServiceMigration() {
  console.log("Applying services and customer_services schema migration to database...");

  const statements = [
    // customer_services modifications
    "ALTER TABLE `customer_services` ADD `service_name_snapshot` text DEFAULT '' NOT NULL;",
    "ALTER TABLE `customer_services` ADD `category_snapshot` text DEFAULT '' NOT NULL;",
    "ALTER TABLE `customer_services` ADD `service_type_snapshot` text DEFAULT '' NOT NULL;",
    "ALTER TABLE `customer_services` ADD `plan_snapshot` text DEFAULT '' NOT NULL;",
    "ALTER TABLE `customer_services` ADD `catalog_price_snapshot` integer DEFAULT 0 NOT NULL;",
    "ALTER TABLE `customer_services` ADD `billing_model` text DEFAULT 'monthly' NOT NULL;",
    "ALTER TABLE `customer_services` ADD `billing_text` text DEFAULT '+ GST/Month';",
    "ALTER TABLE `customer_services` ADD `quantity` integer DEFAULT 1 NOT NULL;",
    "ALTER TABLE `customer_services` ADD `total_price` integer DEFAULT 0 NOT NULL;",
    "ALTER TABLE `customer_services` ADD `notes` text;",
    "ALTER TABLE `customer_services` ADD `created_by_id` text REFERENCES users(id);",
    "CREATE INDEX IF NOT EXISTS `customer_services_status_idx` ON `customer_services` (`status`);",

    // services catalog table modifications
    "ALTER TABLE `services` ADD `category` text DEFAULT 'Digital Marketing Packages' NOT NULL;",
    "ALTER TABLE `services` ADD `category_key` text DEFAULT 'digital-marketing' NOT NULL;",
    "ALTER TABLE `services` ADD `service_type` text DEFAULT 'General' NOT NULL;",
    "ALTER TABLE `services` ADD `plan` text DEFAULT 'Standard' NOT NULL;",
    "ALTER TABLE `services` ADD `billing_model` text DEFAULT 'monthly' NOT NULL;",
    "ALTER TABLE `services` ADD `billing_text` text DEFAULT '+ GST/Month';",
    "ALTER TABLE `services` ADD `price_text` text;",
    "ALTER TABLE `services` ADD `features` text;",
    "ALTER TABLE `services` ADD `raw_features` text;",
    "ALTER TABLE `services` ADD `note` text;",
    "ALTER TABLE `services` ADD `is_popular` integer DEFAULT 0 NOT NULL;",
    "ALTER TABLE `services` ADD `external_source_id` text;",
    "ALTER TABLE `services` ADD `last_synced_at` integer;",
    "ALTER TABLE `services` ADD `sort_order` integer DEFAULT 0 NOT NULL;",
    "CREATE INDEX IF NOT EXISTS `services_category_type_idx` ON `services` (`category_key`, `service_type`);",
    "CREATE INDEX IF NOT EXISTS `services_status_idx` ON `services` (`status`);",
  ];

  for (const sql of statements) {
    try {
      await client.execute(sql);
      console.log(`Executed: ${sql.substring(0, 60)}...`);
    } catch (err: unknown) {
      const msg = (err as Error)?.message || String(err);
      if (msg.includes("duplicate column name") || msg.includes("already exists")) {
        console.log(`Notice (already present): ${sql.substring(0, 50)}...`);
      } else {
        console.error(`Error on statement: ${sql}`, err);
      }
    }
  }

  console.log("Services schema migration completed successfully!");
  client.close();
}

applyServiceMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
