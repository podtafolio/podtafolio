CREATE TABLE `episodes` (
	`id` text PRIMARY KEY NOT NULL,
	`podcast_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`audio_url` text NOT NULL,
	`published_at` integer,
	`duration` integer,
	`guid` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`podcast_id`) REFERENCES `podcasts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `podcasts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`feed_url` text NOT NULL,
	`image_url` text,
	`author` text,
	`website_url` text,
	`last_scraped_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `podcasts_feed_url_unique` ON `podcasts` (`feed_url`);