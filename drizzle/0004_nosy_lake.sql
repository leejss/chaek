DROP TABLE `webhook_events`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ai_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`content_project_id` text,
	`content_build_id` text,
	`target_node_id` text,
	`idempotency_key` text NOT NULL,
	`task_type` text DEFAULT 'content_generation' NOT NULL,
	`payload_version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`model` text DEFAULT 'gemini-3.6-flash' NOT NULL,
	`gemini_interaction_id` text,
	`input_json` text NOT NULL,
	`result_json` text,
	`usage_json` text,
	`base_graph_version` integer,
	`base_revision_id` text,
	`attempt_number` integer DEFAULT 1 NOT NULL,
	`result_disposition` text,
	`applied_at` integer,
	`error_stage` text,
	`error_code` text,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`submitted_at` integer,
	`finished_at` integer,
	`last_reconciled_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_project_id`) REFERENCES `content_projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`content_build_id`) REFERENCES `content_builds`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`target_node_id`) REFERENCES `content_nodes`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "ai_jobs_payload_version_check" CHECK("__new_ai_jobs"."payload_version" >= 1),
	CONSTRAINT "ai_jobs_attempt_number_check" CHECK("__new_ai_jobs"."attempt_number" >= 1),
	CONSTRAINT "ai_jobs_base_graph_version_check" CHECK("__new_ai_jobs"."base_graph_version" is null or "__new_ai_jobs"."base_graph_version" >= 0),
	CONSTRAINT "ai_jobs_status_check" CHECK("__new_ai_jobs"."status" in ('queued', 'processing', 'requires_action', 'completed', 'failed', 'cancelled', 'incomplete')),
	CONSTRAINT "ai_jobs_error_stage_check" CHECK("__new_ai_jobs"."error_stage" is null or "__new_ai_jobs"."error_stage" in ('submission', 'execution', 'result_fetch', 'internal')),
	CONSTRAINT "ai_jobs_result_disposition_check" CHECK("__new_ai_jobs"."result_disposition" is null or "__new_ai_jobs"."result_disposition" in ('pending', 'applied', 'rejected', 'conflicted'))
);
--> statement-breakpoint
INSERT INTO `__new_ai_jobs`("id", "user_id", "content_project_id", "content_build_id", "target_node_id", "idempotency_key", "task_type", "payload_version", "status", "model", "gemini_interaction_id", "input_json", "result_json", "usage_json", "base_graph_version", "base_revision_id", "attempt_number", "result_disposition", "applied_at", "error_stage", "error_code", "error_message", "created_at", "updated_at", "submitted_at", "finished_at", "last_reconciled_at") SELECT "id", "user_id", "content_project_id", "content_build_id", "target_node_id", "idempotency_key", "task_type", "payload_version", "status", "model", "gemini_interaction_id", "input_json", "result_json", "usage_json", "base_graph_version", "base_revision_id", "attempt_number", "result_disposition", "applied_at", "error_stage", "error_code", "error_message", "created_at", "updated_at", "submitted_at", "finished_at", "last_reconciled_at" FROM `ai_jobs`;--> statement-breakpoint
DROP TABLE `ai_jobs`;--> statement-breakpoint
ALTER TABLE `__new_ai_jobs` RENAME TO `ai_jobs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ai_jobs_user_idempotency_unique` ON `ai_jobs` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `ai_jobs_gemini_interaction_unique` ON `ai_jobs` (`gemini_interaction_id`);--> statement-breakpoint
CREATE INDEX `ai_jobs_user_created_at_idx` ON `ai_jobs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_jobs_status_updated_at_idx` ON `ai_jobs` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `ai_jobs_content_project_idx` ON `ai_jobs` (`content_project_id`);--> statement-breakpoint
CREATE INDEX `ai_jobs_content_build_idx` ON `ai_jobs` (`content_build_id`);--> statement-breakpoint
CREATE INDEX `ai_jobs_target_node_idx` ON `ai_jobs` (`target_node_id`);