PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`customer_id` text,
	`title` text NOT NULL,
	`description` text,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	`location` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`reschedule_reason` text,
	`cancellation_reason` text,
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
INSERT INTO `__new_appointments`("id", "lead_id", "customer_id", "title", "description", "start_time", "end_time", "location", "status", "reschedule_reason", "cancellation_reason", "created_by_id", "assigned_to_id", "created_at", "updated_at") SELECT "id", "lead_id", "customer_id", "title", "description", "start_time", "end_time", "location", "status", "reschedule_reason", "cancellation_reason", "created_by_id", "assigned_to_id", "created_at", "updated_at" FROM `appointments`;--> statement-breakpoint
DROP TABLE `appointments`;--> statement-breakpoint
ALTER TABLE `__new_appointments` RENAME TO `appointments`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `appointments_lead_id_idx` ON `appointments` (`lead_id`);--> statement-breakpoint
CREATE INDEX `appointments_customer_id_idx` ON `appointments` (`customer_id`);--> statement-breakpoint
CREATE INDEX `appointments_assigned_to_id_idx` ON `appointments` (`assigned_to_id`);--> statement-breakpoint
CREATE INDEX `appointments_start_time_idx` ON `appointments` (`start_time`);--> statement-breakpoint
CREATE INDEX `appointments_status_idx` ON `appointments` (`status`);