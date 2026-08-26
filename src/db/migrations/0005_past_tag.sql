ALTER TABLE `leads` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `leads_stage_position_idx` ON `leads` (`stage_id`,`position`);