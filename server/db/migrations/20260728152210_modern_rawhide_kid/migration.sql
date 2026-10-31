CREATE TABLE `invites` (
	`token` text PRIMARY KEY NOT NULL,
	`email` text,
	`created_by` text NOT NULL,
	`used_by` text,
	`expires_at` text,
	`created_at` text NOT NULL
);
