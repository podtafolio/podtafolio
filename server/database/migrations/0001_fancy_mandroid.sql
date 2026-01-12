ALTER TABLE `podcasts` ADD `status` text DEFAULT 'importing' NOT NULL;--> statement-breakpoint
ALTER TABLE `podcasts` ADD `import_error` text;