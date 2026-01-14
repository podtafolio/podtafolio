DROP INDEX "unique_episode";--> statement-breakpoint
DROP INDEX "published_at_idx";--> statement-breakpoint
DROP INDEX "podcast_id_published_at_idx";--> statement-breakpoint
DROP INDEX "status_idx";--> statement-breakpoint
DROP INDEX "podcasts_feed_url_unique";--> statement-breakpoint
DROP INDEX "episode_id_idx";--> statement-breakpoint
ALTER TABLE `transcripts` ALTER COLUMN "language" TO "language" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `unique_episode` ON `episodes` (`podcast_id`,`guid`);--> statement-breakpoint
CREATE INDEX `published_at_idx` ON `episodes` (`published_at`);--> statement-breakpoint
CREATE INDEX `podcast_id_published_at_idx` ON `episodes` (`podcast_id`,`published_at`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `jobs` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `podcasts_feed_url_unique` ON `podcasts` (`feed_url`);--> statement-breakpoint
CREATE INDEX `episode_id_idx` ON `transcripts` (`episode_id`);