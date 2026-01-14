CREATE TABLE `transcripts` (
	`id` text PRIMARY KEY NOT NULL,
	`episode_id` text NOT NULL,
	`content` text NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `episode_id_idx` ON `transcripts` (`episode_id`);