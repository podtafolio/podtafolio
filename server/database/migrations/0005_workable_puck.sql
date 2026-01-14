CREATE INDEX `published_at_idx` ON `episodes` (`published_at`);--> statement-breakpoint
CREATE INDEX `podcast_id_published_at_idx` ON `episodes` (`podcast_id`,`published_at`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `jobs` (`status`);