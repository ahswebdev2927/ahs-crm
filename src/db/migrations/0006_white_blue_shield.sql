CREATE TABLE `lead_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`type` text DEFAULT 'note' NOT NULL,
	`content` text NOT NULL,
	`created_by_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lead_activities_lead_id_idx` ON `lead_activities` (`lead_id`);--> statement-breakpoint
CREATE INDEX `lead_activities_created_by_idx` ON `lead_activities` (`created_by_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_follow_ups` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`customer_id` text,
	`scheduled_at` integer NOT NULL,
	`type` text DEFAULT 'call' NOT NULL,
	`notes` text,
	`outcome` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`completed_at` integer,
	`created_by_id` text NOT NULL,
	`assigned_to_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_follow_ups`("id", "lead_id", "customer_id", "scheduled_at", "type", "notes", "outcome", "status", "completed_at", "created_by_id", "assigned_to_id", "created_at", "updated_at") SELECT "id", "lead_id", NULL, "scheduled_at", "type", "notes", NULL, "status", "completed_at", "created_by_id", "assigned_to_id", "created_at", "updated_at" FROM `follow_ups`;--> statement-breakpoint
DROP TABLE `follow_ups`;--> statement-breakpoint
ALTER TABLE `__new_follow_ups` RENAME TO `follow_ups`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `follow_ups_lead_id_idx` ON `follow_ups` (`lead_id`);--> statement-breakpoint
CREATE INDEX `follow_ups_customer_id_idx` ON `follow_ups` (`customer_id`);--> statement-breakpoint
CREATE INDEX `follow_ups_assigned_to_id_idx` ON `follow_ups` (`assigned_to_id`);--> statement-breakpoint
CREATE INDEX `follow_ups_scheduled_at_idx` ON `follow_ups` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `follow_ups_status_idx` ON `follow_ups` (`status`);