CREATE TABLE `credentials` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`public_key` text NOT NULL,
	`counter` integer DEFAULT 0 NOT NULL,
	`backed_up` integer DEFAULT false NOT NULL,
	`transports` text,
	`aaguid` text,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	`last_used_at` text,
	CONSTRAINT `fk_credentials_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `webauthn_challenges` (
	`attempt_id` text PRIMARY KEY,
	`challenge` text NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY,
	`email` text NOT NULL UNIQUE,
	`name` text,
	`password_hash` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`(`id`, `email`, `name`, `password_hash`, `created_at`) SELECT `id`, `email`, `name`, `password_hash`, `created_at` FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `users_email_unique`;--> statement-breakpoint
CREATE INDEX `credentials_user_id_idx` ON `credentials` (`user_id`);