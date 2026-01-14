CREATE TABLE `summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`episode_id` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `summary_episode_id_idx` ON `summaries` (`episode_id`);--> statement-breakpoint
ALTER TABLE `transcripts` ADD `segments` text;