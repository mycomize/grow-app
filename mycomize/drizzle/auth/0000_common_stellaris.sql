CREATE TABLE `auth` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`hashed_password` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_username_unique` ON `auth` (`username`);