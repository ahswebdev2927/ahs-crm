PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_field_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`customer_id` text,
	`appointment_id` text,
	`visit_date` integer NOT NULL,
	`purpose` text NOT NULL,
	`summary` text,
	`outcome` text,
	`feedback` text,
	`requirements` text,
	`next_action` text,
	`next_action_date` integer,
	`expenses` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_by_id` text NOT NULL,
	`assigned_to_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_field_visits`("id", "lead_id", "customer_id", "appointment_id", "visit_date", "purpose", "summary", "outcome", "feedback", "requirements", "next_action", "next_action_date", "expenses", "status", "created_by_id", "assigned_to_id", "created_at", "updated_at") SELECT "id", "lead_id", "customer_id", "appointment_id", "visit_date", "purpose", "summary", "outcome", "feedback", "requirements", "next_action", "next_action_date", "expenses", "status", "created_by_id", "assigned_to_id", "created_at", "updated_at" FROM `field_visits`;--> statement-breakpoint
DROP TABLE `field_visits`;--> statement-breakpoint
ALTER TABLE `__new_field_visits` RENAME TO `field_visits`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `field_visits_lead_id_idx` ON `field_visits` (`lead_id`);--> statement-breakpoint
CREATE INDEX `field_visits_customer_id_idx` ON `field_visits` (`customer_id`);--> statement-breakpoint
CREATE INDEX `field_visits_appointment_id_idx` ON `field_visits` (`appointment_id`);--> statement-breakpoint
CREATE INDEX `field_visits_assigned_to_id_idx` ON `field_visits` (`assigned_to_id`);--> statement-breakpoint
CREATE INDEX `field_visits_status_idx` ON `field_visits` (`status`);--> statement-breakpoint
CREATE INDEX `field_visits_visit_date_idx` ON `field_visits` (`visit_date`);