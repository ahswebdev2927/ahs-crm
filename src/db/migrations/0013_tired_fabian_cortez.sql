ALTER TABLE `activities` ADD `category` text DEFAULT 'communication' NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `outcome` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `deleted_at` integer;--> statement-breakpoint
CREATE INDEX `activities_category_idx` ON `activities` (`category`);--> statement-breakpoint
CREATE INDEX `activities_type_idx` ON `activities` (`type`);--> statement-breakpoint
CREATE INDEX `activities_created_at_idx` ON `activities` (`created_at`);--> statement-breakpoint
CREATE INDEX `activities_deleted_at_idx` ON `activities` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `activities_lead_cat_idx` ON `activities` (`lead_id`,`category`,`created_at`);--> statement-breakpoint
CREATE INDEX `activities_customer_cat_idx` ON `activities` (`customer_id`,`category`,`created_at`);