ALTER TABLE `invoices` ADD `terms` text;--> statement-breakpoint
CREATE INDEX `invoices_due_date_idx` ON `invoices` (`due_date`);--> statement-breakpoint
ALTER TABLE `payments` ADD `customer_id` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `receipt_url` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `receipt_public_id` text;--> statement-breakpoint
CREATE INDEX `payments_customer_id_idx` ON `payments` (`customer_id`);--> statement-breakpoint
CREATE INDEX `payments_payment_date_idx` ON `payments` (`payment_date`);--> statement-breakpoint
ALTER TABLE `quotations` ADD `terms` text;--> statement-breakpoint
ALTER TABLE `quotations` ADD `sent_at` integer;--> statement-breakpoint
ALTER TABLE `quotations` ADD `accepted_at` integer;--> statement-breakpoint
ALTER TABLE `quotations` ADD `declined_at` integer;--> statement-breakpoint
CREATE INDEX `quotations_status_idx` ON `quotations` (`status`);