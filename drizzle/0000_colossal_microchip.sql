CREATE TABLE `ai_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`task_type` text DEFAULT 'content_generation' NOT NULL,
	`payload_version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`model` text DEFAULT 'gemini-3.6-flash' NOT NULL,
	`gemini_interaction_id` text,
	`input_json` text NOT NULL,
	`result_json` text,
	`usage_json` text,
	`error_stage` text,
	`error_code` text,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`submitted_at` integer,
	`finished_at` integer,
	`last_reconciled_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ai_jobs_payload_version_check" CHECK("ai_jobs"."payload_version" >= 1),
	CONSTRAINT "ai_jobs_status_check" CHECK("ai_jobs"."status" in ('queued', 'processing', 'requires_action', 'completed', 'failed', 'cancelled', 'incomplete')),
	CONSTRAINT "ai_jobs_error_stage_check" CHECK("ai_jobs"."error_stage" is null or "ai_jobs"."error_stage" in ('submission', 'execution', 'result_fetch', 'webhook', 'internal'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_jobs_user_idempotency_unique` ON `ai_jobs` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_jobs_gemini_interaction_unique` ON `ai_jobs` (`gemini_interaction_id`);--> statement-breakpoint
CREATE INDEX `ai_jobs_user_created_at_idx` ON `ai_jobs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_jobs_status_updated_at_idx` ON `ai_jobs` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_provider` text NOT NULL,
	`auth_subject` text NOT NULL,
	`email` text,
	`display_name` text,
	`avatar_url` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_auth_identity_unique` ON `users` (`auth_provider`,`auth_subject`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`event_version` text,
	`gemini_interaction_id` text NOT NULL,
	`ai_job_id` text,
	`payload_json` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer,
	`last_error` text,
	`occurred_at` integer,
	`received_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`processed_at` integer,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`ai_job_id`) REFERENCES `ai_jobs`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "webhook_events_status_check" CHECK("webhook_events"."status" in ('received', 'processing', 'processed', 'failed')),
	CONSTRAINT "webhook_events_event_type_check" CHECK("webhook_events"."event_type" in ('interaction.requires_action', 'interaction.completed', 'interaction.failed', 'interaction.cancelled')),
	CONSTRAINT "webhook_events_attempt_count_check" CHECK("webhook_events"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX `webhook_events_gemini_interaction_idx` ON `webhook_events` (`gemini_interaction_id`);--> statement-breakpoint
CREATE INDEX `webhook_events_ai_job_idx` ON `webhook_events` (`ai_job_id`);--> statement-breakpoint
CREATE INDEX `webhook_events_status_next_attempt_idx` ON `webhook_events` (`status`,`next_attempt_at`);