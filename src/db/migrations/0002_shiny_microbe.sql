CREATE TABLE `departments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_name_unique` ON `departments` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `departments_code_unique` ON `departments` (`code`);--> statement-breakpoint
ALTER TABLE `roles` ADD `department_id` integer REFERENCES departments(id);--> statement-breakpoint
ALTER TABLE `roles` ADD `parent_id` integer;--> statement-breakpoint
CREATE INDEX `roles_department_id_idx` ON `roles` (`department_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `department_id` integer REFERENCES departments(id);--> statement-breakpoint
ALTER TABLE `users` ADD `data_visibility` text DEFAULT 'own' NOT NULL;--> statement-breakpoint
CREATE INDEX `users_department_id_idx` ON `users` (`department_id`);