CREATE TABLE `flushes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`grow_id` integer NOT NULL,
	`harvest_date` text,
	`wet_yield_grams` real,
	`dry_yield_grams` real,
	`concentration_mg_per_gram` real,
	FOREIGN KEY (`grow_id`) REFERENCES `grows`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `grows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`name` text,
	`description` text,
	`species` text,
	`variant` text,
	`location` text,
	`tags` text,
	`inoculation_date` text,
	`spawn_start_date` text,
	`bulk_start_date` text,
	`fruiting_start_date` text,
	`full_spawn_colonization_date` text,
	`full_bulk_colonization_date` text,
	`fruiting_pin_date` text,
	`harvest_completion_date` text,
	`inoculation_status` text,
	`spawn_colonization_status` text,
	`bulk_colonization_status` text,
	`fruiting_status` text,
	`current_stage` text,
	`status` text,
	`s2b_ratio` text,
	`total_cost` real,
	`stages` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`profile_image` text
);
