CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`type_id`) REFERENCES `entity_types`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entities_name_unique` ON `entities` (`name`);--> statement-breakpoint
CREATE TABLE `entity_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entity_types_name_unique` ON `entity_types` (`name`);--> statement-breakpoint
CREATE TABLE `episodes_entities` (
	`episode_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`episode_id`, `entity_id`),
	FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `episodes_entities_episode_id_idx` ON `episodes_entities` (`episode_id`);--> statement-breakpoint
CREATE INDEX `episodes_entities_entity_id_idx` ON `episodes_entities` (`entity_id`);