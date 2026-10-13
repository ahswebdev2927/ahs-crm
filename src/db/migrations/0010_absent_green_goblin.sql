ALTER TABLE `customer_services` ADD `service_name_snapshot` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_services` ADD `category_snapshot` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_services` ADD `service_type_snapshot` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_services` ADD `plan_snapshot` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_services` ADD `catalog_price_snapshot` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_services` ADD `billing_model` text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_services` ADD `billing_text` text DEFAULT '+ GST/Month';--> statement-breakpoint
ALTER TABLE `customer_services` ADD `quantity` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_services` ADD `total_price` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_services` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `customer_services` ADD `created_by_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `customer_services_status_idx` ON `customer_services` (`status`);--> statement-breakpoint
ALTER TABLE `services` ADD `category` text DEFAULT 'Digital Marketing Packages' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `category_key` text DEFAULT 'digital-marketing' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `service_type` text DEFAULT 'General' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `plan` text DEFAULT 'Standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `billing_model` text DEFAULT 'monthly' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `billing_text` text DEFAULT '+ GST/Month';--> statement-breakpoint
ALTER TABLE `services` ADD `price_text` text;--> statement-breakpoint
ALTER TABLE `services` ADD `features` text;--> statement-breakpoint
ALTER TABLE `services` ADD `raw_features` text;--> statement-breakpoint
ALTER TABLE `services` ADD `note` text;--> statement-breakpoint
ALTER TABLE `services` ADD `is_popular` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `external_source_id` text;--> statement-breakpoint
ALTER TABLE `services` ADD `last_synced_at` integer;--> statement-breakpoint
ALTER TABLE `services` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `services_category_type_idx` ON `services` (`category_key`,`service_type`);--> statement-breakpoint
CREATE INDEX `services_status_idx` ON `services` (`status`);