CREATE TABLE `rate_limits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`timestamp` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limits_key_timestamp_idx` ON `rate_limits` (`key`,`timestamp`);--> statement-breakpoint
CREATE INDEX `rate_limits_expires_at_idx` ON `rate_limits` (`expires_at`);