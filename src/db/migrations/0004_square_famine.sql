PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_lead_partners` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`partner_id` text NOT NULL,
	`percentage` integer DEFAULT 0 NOT NULL,
	`role` text DEFAULT 'collaborator' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`added_by_id` text,
	`removed_by_id` text,
	`removal_reason` text,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`removed_at` integer,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`partner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`added_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`removed_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_lead_partners`("id", "lead_id", "partner_id", "percentage", "role", "status", "created_at", "updated_at") SELECT lower(hex(randomblob(16))), "lead_id", "partner_id", 0, "role", 'active', "created_at", "created_at" FROM `lead_partners`;
--> statement-breakpoint
DROP TABLE `lead_partners`;
--> statement-breakpoint
ALTER TABLE `__new_lead_partners` RENAME TO `lead_partners`;
--> statement-breakpoint
CREATE INDEX `lead_partners_lead_id_idx` ON `lead_partners` (`lead_id`);
--> statement-breakpoint
CREATE INDEX `lead_partners_partner_id_idx` ON `lead_partners` (`partner_id`);
--> statement-breakpoint
CREATE INDEX `lead_partners_status_idx` ON `lead_partners` (`status`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;