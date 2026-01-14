CREATE TABLE `episodes_topics` (
	`episode_id` text NOT NULL,
	`topic_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`episode_id`, `topic_id`),
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `episodes_topics_episode_id_idx` ON `episodes_topics` (`episode_id`);--> statement-breakpoint
CREATE INDEX `episodes_topics_topic_id_idx` ON `episodes_topics` (`topic_id`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `topics_name_unique` ON `topics` (`name`);