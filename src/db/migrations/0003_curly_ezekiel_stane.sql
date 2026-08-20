CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`department_id` integer,
	`manager_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`manager_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teams_code_unique` ON `teams` (`code`);--> statement-breakpoint
CREATE INDEX `teams_department_id_idx` ON `teams` (`department_id`);--> statement-breakpoint
CREATE INDEX `teams_manager_id_idx` ON `teams` (`manager_id`);--> statement-breakpoint
ALTER TABLE `roles` ADD `is_manager` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `team_id` integer REFERENCES teams(id);--> statement-breakpoint
ALTER TABLE `users` ADD `manager_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `users_team_id_idx` ON `users` (`team_id`);--> statement-breakpoint
CREATE INDEX `users_manager_id_idx` ON `users` (`manager_id`);